import { afterEach, describe, expect, it } from "vitest";
import { ProviderError } from "../src/lib/errors";
import type { Providers } from "../src/providers/interfaces";
import { get, makeApp } from "./helpers";

interface Knobs {
  mode: "ok" | "throw" | "leak" | "malformed" | "unavailable";
  quoteCalls: number;
  quoteBatchSizes: number[];
}

/** Provider decorator to inject failures and count calls. */
function instrument(k: Knobs) {
  return (p: Providers): Providers => ({
    ...p,
    market: {
      name: p.market.name,
      getHistory: (...a) => p.market.getHistory(...a),
      async getQuotes(tickers) {
        k.quoteCalls++;
        k.quoteBatchSizes.push(tickers.length);
        if (k.mode === "throw") throw new Error("connect ECONNREFUSED 10.0.0.1:443");
        if (k.mode === "leak") throw new Error("401 Unauthorized apikey=SECRET123 at Object.fetch (/srv/app/node_modules/x.js:1:1)");
        if (k.mode === "unavailable") throw new ProviderError("unavailable", "mock", "upstream timeout");
        const qs = await p.market.getQuotes(tickers);
        return k.mode === "malformed" ? qs.map((q) => ({ ...q, price: -5 })) : qs;
      },
    },
  });
}
const knobs = (): Knobs => ({ mode: "ok", quoteCalls: 0, quoteBatchSizes: [] });

let toClose: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(toClose.map((a) => a.close()));
  toClose = [];
});
const setup = (k = knobs(), over: Parameters<typeof makeApp>[0] = {}) => {
  const h = makeApp({ providers: instrument(k), ...over });
  toClose.push(h.app);
  return { ...h, k };
};

describe("request validation → 400", () => {
  const cases: Array<[string, string]> = [
    ["bad ticker", "/stocks/NV$DA/market"],
    ["bad range", "/stocks/NVDA/history?range=10y"],
    ["interval not allowed for range", "/stocks/NVDA/history?range=5y&interval=1m"],
    ["years not 3/5/10", "/stocks/NVDA/financials?years=4"],
    ["bad period", "/stocks/NVDA/financials?period=monthly"],
    ["unknown query param", "/companies?foo=1"],
    ["limit too large", "/companies?limit=100000"],
    ["compare > 5 tickers", "/compare?tickers=A,B,C,D,E,F"],
    ["compare missing tickers", "/compare"],
    ["screener min > max", "/screener?marketCapMin=10&marketCapMax=5"],
    ["screener non-numeric", "/screener?peMax=abc"],
    ["garbage cursor", "/companies?cursor=nope"],
  ];
  it.each(cases)("%s", async (_n, url) => {
    const { app } = setup();
    const r = await get(app, url);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ data: null, error: { code: "INVALID_REQUEST" } });
    expect(typeof r.body.error.message).toBe("string");
  });

  it("a cursor cannot be replayed against different filters", async () => {
    const { app } = setup();
    const first = await get(app, "/screener?limit=3");
    const cursor = first.body.data.meta.nextCursor;
    expect((await get(app, `/screener?limit=3&cursor=${cursor}`)).status).toBe(200);
    expect((await get(app, `/screener?limit=3&sector=Technology&cursor=${cursor}`)).status).toBe(400);
  });
});

describe("not found → 404", () => {
  it.each(["/stocks/ZZZZ/market", "/stocks/ZZZZ/financials", "/stocks/ZZZZ/valuation", "/stocks/ZZZZ/news", "/companies/ZZZZ", "/stocks/ZZZZ/peers", "/compare?tickers=NVDA,ZZZZ", "/nope"])("%s", async (url) => {
    const { app } = setup();
    const r = await get(app, url);
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ data: null, error: { code: "NOT_FOUND", message: expect.any(String) } });
  });

  it("known ticker without curated analysis → 404, not fabricated content", async () => {
    const { app } = setup();
    const r = await get(app, "/stocks/KO/analysis");
    expect(r.status).toBe(404);
  });
});

describe("provider failures", () => {
  it("upstream error → 502 DATA_PROVIDER_ERROR, no internals leaked", async () => {
    const k = knobs();
    k.mode = "leak";
    const { app } = setup(k);
    const r = await get(app, "/stocks/NVDA/market");
    expect(r.status).toBe(502);
    expect(r.body).toEqual({ data: null, error: { code: "DATA_PROVIDER_ERROR", message: "Market data temporarily unavailable" } });
    const raw = JSON.stringify(r.body);
    expect(raw).not.toMatch(/SECRET123|apikey|node_modules|ECONNREFUSED| at /);
  });

  it("provider marked unavailable → 503", async () => {
    const k = knobs();
    k.mode = "unavailable";
    const { app } = setup(k);
    const r = await get(app, "/stocks/NVDA/market");
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("malformed provider data is rejected before it reaches the client", async () => {
    const k = knobs();
    k.mode = "malformed";
    const { app } = setup(k);
    const r = await get(app, "/stocks/NVDA/market");
    expect(r.status).toBe(502);
    expect(JSON.stringify(r.body)).not.toContain("-5");
  });

  it("serves stale cache (flagged) when the provider fails, then gives up past the stale window", async () => {
    const k = knobs();
    const { app, clock } = setup(k);
    const fresh = await get(app, "/stocks/NVDA/market");
    expect(fresh.status).toBe(200);
    expect(fresh.body.meta.stale).toBeUndefined();

    k.mode = "throw";
    clock.advance(45_000); // past the 30 s quote TTL
    const stale = await get(app, "/stocks/NVDA/market");
    expect(stale.status).toBe(200);
    expect(stale.body.meta.stale).toBe(true);
    expect(stale.body.data.price.value).toBe(fresh.body.data.price.value);

    clock.advance(6 * 60_000); // past the 5 min stale ceiling
    const gone = await get(app, "/stocks/NVDA/market");
    expect(gone.status).toBe(502);
  });

  it("a failing optional enrichment (estimates) does not break the company snapshot", async () => {
    const { app } = setup(knobs(), {
      providers: (p) => ({ ...p, estimates: { name: "x", getEstimates: async () => { throw new Error("down"); } } }),
    });
    const r = await get(app, "/companies/NVDA");
    expect(r.status).toBe(200);
    expect(r.body.data.valuation.forwardPe.value).toBeNull();
    expect(r.body.data.valuation.pe.value).not.toBeNull();
  });
});

describe("contract enforcement on the way out", () => {
  it("a service returning off-contract data yields a generic 500, never the bad payload", async () => {
    const { app, services } = setup();
    (services.market as any).snapshot = async () => ({ data: { price: "not a metric", secret: "leak" }, meta: {} });
    const r = await get(app, "/stocks/NVDA/market");
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ data: null, error: { code: "INTERNAL_ERROR", message: "Internal error" } });
  });

  it("an unexpected exception → 500 without stack or message", async () => {
    const { app, services } = setup();
    (services.market as any).snapshot = async () => { throw new Error("database password is hunter2"); };
    const r = await get(app, "/stocks/NVDA/market");
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("hunter2");
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the window is exhausted, and resets", async () => {
    const { app, clock } = setup(knobs(), { app: { rateLimitPerMinute: 3 } });
    for (let i = 0; i < 3; i++) expect((await get(app, "/health")).status).toBe(200);
    const r = await get(app, "/health");
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe("RATE_LIMITED");
    expect(Number(r.headers["retry-after"])).toBeGreaterThan(0);
    clock.advance(61_000);
    expect((await get(app, "/health")).status).toBe(200);
  });
});

describe("performance behaviours", () => {
  it("concurrent identical requests share one provider call (dedupe) and later ones hit cache", async () => {
    const k = knobs();
    const { app } = setup(k);
    const rs = await Promise.all(Array.from({ length: 20 }, () => get(app, "/stocks/AAPL/market")));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(k.quoteCalls).toBe(1);
    await get(app, "/stocks/AAPL/market");
    expect(k.quoteCalls).toBe(1);
  });

  it("the screener / sectors / compare fan out with ONE batched quote request for the whole universe", async () => {
    const k = knobs();
    const { app } = setup(k);
    await get(app, "/screener?limit=5");
    await get(app, "/sectors");
    await get(app, "/compare?tickers=NVDA,MSFT");
    await get(app, "/index/sp500/overview");
    expect(k.quoteCalls).toBe(1);
    expect(k.quoteBatchSizes[0]).toBeGreaterThan(25);
  });

  it("cache expires by TTL class: quotes at 30 s, statements much longer", async () => {
    const k = knobs();
    const { app, clock } = setup(k);
    await get(app, "/stocks/NVDA/market");
    clock.advance(31_000);
    await get(app, "/stocks/NVDA/market");
    expect(k.quoteCalls).toBe(2);
  });

  it("sets client cache headers; watchlist is private", async () => {
    const { app } = setup();
    expect((await get(app, "/stocks/NVDA/market")).headers["cache-control"]).toMatch(/public, max-age=\d+/);
    const w = await get(app, "/watchlist", { authorization: "Bearer tok-alice" });
    expect(w.headers["cache-control"]).toMatch(/no-store/);
  });
});

describe("endpoint index", () => {
  it("lists every route", async () => {
    const { app } = setup();
    const res = await app.inject({ url: "/api/v1" });
    const paths = res.json().data.map((r: any) => `${r.method} ${r.path}`);
    expect(paths).toContain("GET /api/v1/stocks/:ticker/valuation");
    expect(paths).toContain("DELETE /api/v1/watchlist/:ticker");
  });
});
