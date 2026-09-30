import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Cache, MemoryBackend } from "../src/cache/cache";
import { StoredAnalysisSchema } from "../src/contracts/analysis";
import { MetricSchema } from "../src/contracts/common";
import { callProvider } from "../src/services/provider-call";
import { z } from "zod";
import * as F from "../src/lib/formulas";
import { metric } from "../src/lib/metric";
import { assertTraceable } from "../src/services/analysis";
import { earningsResult, surprise } from "../src/services/earnings";
import { isCredible } from "../src/services/news";
import { ANALYSIS_FIXTURES } from "../src/store/analysis-fixtures";
import { FakeClock } from "./helpers";
import { MOCK_COMPANIES } from "../src/providers/mock/data";
import { generateAnnual, generateQuarters } from "../src/providers/mock/generator";
import { StatementPeriodDto } from "../src/providers/types";

describe("formulas", () => {
  it("growth / ratio return null instead of nonsense", () => {
    expect(F.growth(110, 100)).toBeCloseTo(0.1);
    expect(F.growth(110, 0)).toBeNull();
    expect(F.growth(110, -5)).toBeNull();
    expect(F.growth(null, 100)).toBeNull();
    expect(F.ratio(5, 0)).toBeNull();
    expect(F.ratio(undefined, 4)).toBeNull();
  });
  it("multiples are undefined on non-positive denominators; yields may be negative", () => {
    expect(F.multiple(100, -2)).toBeNull();
    expect(F.multiple(100, 4)).toBe(25);
    expect(F.yieldOf(-10, 100)).toBe(-0.1);
    expect(F.yieldOf(10, 0)).toBeNull();
  });
  it("free cash flow treats capex as spend regardless of sign", () => {
    expect(F.freeCashFlow(100, 30)).toBe(70);
    expect(F.freeCashFlow(100, -30)).toBe(70);
    expect(F.freeCashFlow(100, null)).toBeNull();
  });
  it("ROIC needs an explicit tax rate and invested capital", () => {
    expect(F.roic(100, 0.2, 400)).toBeCloseTo(0.2);
    expect(F.roic(100, null, 400)).toBeNull();
    expect(F.roic(100, 0.2, 0)).toBeNull();
  });
  it("net debt: cash is required, short-term investments optional", () => {
    expect(F.netDebt(100, 30, 10)).toBe(60);
    expect(F.netDebt(100, 30, null)).toBe(70);
    expect(F.netDebt(100, null, 10)).toBeNull();
  });
  it("PEG is only defined for positive growth", () => {
    expect(F.peg(30, 0.15)).toBeCloseTo(2);
    expect(F.peg(30, -0.1)).toBeNull();
  });
  it("median / percentile / sum ignore nothing silently", () => {
    expect(F.median([3, 1, 2])).toBe(2);
    expect(F.median([1, 2, 3, 4])).toBe(2.5);
    expect(F.median([null, undefined])).toBeNull();
    expect(F.sum([1, 2, null])).toBeNull(); // partial sums would be a fake number
    expect(F.percentileRank(2, [1, 2, 3, 4])).toBe(0.5);
  });
});

describe("metric()", () => {
  const meta = { asOf: "2026-01-01T00:00:00.000Z", type: "actual" as const };
  it("missing / non-finite become null, never 0", () => {
    for (const v of [null, undefined, NaN, Infinity, -Infinity]) expect(metric(v, meta).value).toBeNull();
    expect(metric(0, meta).value).toBe(0); // a real zero stays zero
  });
  it("always validates against the contract and rounds by unit", () => {
    expect(metric(0.123456789, { ...meta, unit: "ratio" }).value).toBe(0.123457);
    expect(metric(12.3456, { ...meta, unit: "x" }).value).toBe(12.35);
    expect(() => MetricSchema.parse(metric(1, { ...meta, currency: "USD" }))).not.toThrow();
    expect(() => MetricSchema.parse({ value: 1, asOf: "yesterday", type: "actual" })).toThrow();
    expect(() => MetricSchema.parse({ value: 1, asOf: meta.asOf, type: "forecast" })).toThrow();
  });
});

describe("earnings verdict", () => {
  it("beat / inline / miss / unknown with a ±1 % band; EPS first, revenue as fallback", () => {
    expect(earningsResult(1.1, 1.0, null, null)).toBe("beat");
    expect(earningsResult(1.005, 1.0, null, null)).toBe("inline");
    expect(earningsResult(0.9, 1.0, null, null)).toBe("miss");
    expect(earningsResult(null, null, 105, 100)).toBe("beat");
    expect(earningsResult(null, null, null, null)).toBe("unknown");
    expect(earningsResult(1, 0, null, null)).toBe("unknown"); // no base to compare against
    expect(surprise(-0.5, -1)).toBeCloseTo(0.5); // smaller loss than expected is a beat
  });
});

describe("cache", () => {
  const ttl = { ttlMs: 1000, staleMs: 5000 };
  it("dedupes concurrent loads", async () => {
    const clock = new FakeClock();
    const c = new Cache(new MemoryBackend(clock), clock);
    let calls = 0;
    const load = () => c.load("k", ttl, async () => (++calls, await new Promise((r) => setTimeout(r, 10)), "v"));
    await Promise.all([load(), load(), load()]);
    expect(calls).toBe(1);
  });
  it("respects TTL, flags stale-if-error, and expires past the stale window", async () => {
    const clock = new FakeClock();
    const c = new Cache(new MemoryBackend(clock), clock);
    await c.load("k", ttl, async () => "v1");
    clock.advance(500);
    expect((await c.load("k", ttl, async () => "v2")).value).toBe("v1");
    clock.advance(600);
    const stale = await c.load("k", ttl, async () => { throw new Error("boom"); });
    expect(stale).toMatchObject({ value: "v1", stale: true });
    clock.advance(6000);
    await expect(c.load("k", ttl, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });
  it("loadMany fetches only the missing keys in one batch", async () => {
    const clock = new FakeClock();
    const c = new Cache(new MemoryBackend(clock), clock);
    const batches: string[][] = [];
    const loader = async (ids: string[]) => (batches.push(ids), new Map(ids.map((i) => [i, i.toUpperCase()])));
    await c.loadMany(["a", "b"], (i) => `q:${i}`, ttl, loader);
    const r = await c.loadMany(["a", "b", "c"], (i) => `q:${i}`, ttl, loader);
    expect(batches).toEqual([["a", "b"], ["c"]]);
    expect(r.get("c")?.value).toBe("C");
  });
  it("evicts oldest entries beyond capacity", async () => {
    const clock = new FakeClock();
    const b = new MemoryBackend(clock, 2);
    await b.set("a", 1, 0, clock.now() + 1e6);
    await b.set("b", 2, 0, clock.now() + 1e6);
    await b.set("c", 3, 0, clock.now() + 1e6);
    expect(await b.get("a")).toBeUndefined();
    expect((await b.get("c"))?.value).toBe(3);
  });
});

describe("provider guard", () => {
  it("rejects malformed data, retries transient failures, times out", async () => {
    const S = z.object({ n: z.number().positive() });
    await expect(callProvider("p", S, async () => ({ n: -1 }))).rejects.toMatchObject({ kind: "invalid" });
    let tries = 0;
    await expect(callProvider("p", S, async () => { tries++; throw new Error("x"); }, { retries: 2 })).rejects.toMatchObject({ kind: "upstream" });
    expect(tries).toBe(3);
    tries = 0;
    await expect(callProvider("p", S, async () => { tries++; return { n: -1 }; }, { retries: 2 })).rejects.toBeDefined();
    expect(tries).toBe(1); // bad data is not retried
    await expect(callProvider("p", S, () => new Promise(() => {}), { timeoutMs: 20, retries: 0 })).rejects.toMatchObject({ kind: "unavailable" });
  });
});

describe("news credibility", () => {
  it("matches hostnames and subdomains only", () => {
    const d = ["reuters.com"];
    expect(isCredible("https://www.reuters.com/x", d)).toBe(true);
    expect(isCredible("https://reuters.com.evil.example/x", d)).toBe(false);
    expect(isCredible("https://notreuters.com/x", d)).toBe(false);
    expect(isCredible("not a url", d)).toBe(false);
  });
});

describe("stored analysis", () => {
  it("fixtures satisfy the schema and every claim resolves to a source", () => {
    expect(ANALYSIS_FIXTURES.map((a) => a.ticker).sort()).toEqual(["AAPL", "AMZN", "GOOGL", "JPM", "MSFT", "NVDA", "SPOT", "WMT"]);
    for (const a of ANALYSIS_FIXTURES) {
      StoredAnalysisSchema.parse(a);
      expect(() => assertTraceable(a)).not.toThrow();
    }
  });
  it("a claim without a source is rejected by the schema; a dangling reference is caught", () => {
    const a = structuredClone(ANALYSIS_FIXTURES[0]!);
    a.risks[0]!.sourceIds = [];
    expect(StoredAnalysisSchema.safeParse(a).success).toBe(false);
    const b = structuredClone(ANALYSIS_FIXTURES[0]!);
    b.risks[0]!.sourceIds = ["missing"];
    expect(() => assertTraceable(b)).toThrow(/unknown sources/);
  });
});

describe("mock fixtures obey the provider contract", () => {
  it("every generated statement row passes StatementPeriodDto with consistent identities", () => {
    for (const co of MOCK_COMPANIES) {
      const q = generateQuarters(co);
      for (const r of q) {
        const { _fq, ...dto } = r;
        StatementPeriodDto.parse(dto);
        expect(r.revenue).toBeGreaterThan(0);
        if (r.grossProfit !== null) expect(r.grossProfit).toBeLessThanOrEqual(r.revenue!);
      }
      const ttm = q.slice(0, 4).reduce((s, r) => s + r.revenue!, 0);
      expect(Math.abs(ttm / 1e9 / co.rev - 1)).toBeLessThan(0.02); // fixture noise is ±1 %
      for (const a of generateAnnual(q)) StatementPeriodDto.parse(a);
    }
  });
});

describe("architecture: the frontend-facing layers never touch providers or the network", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
    });
  const root = new URL("../src", import.meta.url).pathname;

  it("api/, services/, contracts/ import no concrete provider and make no HTTP calls", () => {
    for (const f of [...walk(join(root, "api")), ...walk(join(root, "services")), ...walk(join(root, "contracts"))]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/providers\/mock/);
      expect(src, f).not.toMatch(/\bfetch\(|from "node:https?"|from "undici"|from "axios"/);
    }
  });
  it("only server.ts wires a concrete provider", () => {
    const users = walk(root).filter((f) => /providers\/mock/.test(readFileSync(f, "utf8")) && !f.includes("/providers/"));
    expect(users.map((f) => f.replace(root, ""))).toEqual(["/server.ts"]);
  });
});
