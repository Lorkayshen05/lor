import { afterAll, describe, expect, it } from "vitest";
import { AnalysisSchema } from "../src/contracts/analysis";
import { CompanyDetailSchema, MarketSnapshotSchema } from "../src/contracts/company";
import { EarningsResponse, EstimatesSchema } from "../src/contracts/earnings";
import { BalanceSheetSchema, FinancialsResponse } from "../src/contracts/financials";
import { HistoryResponse } from "../src/contracts/market";
import { NewsResponse } from "../src/contracts/news";
import { PeersResponse } from "../src/contracts/peers";
import { ValuationSchema } from "../src/contracts/valuation";
import { assertMetrics, get, makeApp } from "./helpers";

const TICKERS = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "JPM", "WMT", "SPOT"];
const { app } = makeApp();
afterAll(() => app.close());

const ok = async (url: string) => {
  const r = await get(app, url);
  expect(r.status, `${url} → ${JSON.stringify(r.body).slice(0, 300)}`).toBe(200);
  expect(r.body.error).toBeUndefined();
  return r;
};

describe.each(TICKERS)("%s end to end", (t) => {
  it("company detail", async () => {
    const { body } = await ok(`/companies/${t}`);
    const d = CompanyDetailSchema.parse(body.data);
    expect(d.company.ticker).toBe(t);
    expect(d.sources.length).toBeGreaterThan(0);
    assertMetrics(d);
  });

  it("market + history", async () => {
    const m = MarketSnapshotSchema.parse((await ok(`/stocks/${t}/market`)).body.data);
    expect(m.price.value).toBeGreaterThan(0);
    expect(m.marketCap.value).toBeGreaterThan(0);
    expect(m.fiftyTwoWeekHigh.value!).toBeGreaterThanOrEqual(m.fiftyTwoWeekLow.value!);
    const h = HistoryResponse.parse((await ok(`/stocks/${t}/history?range=3m&interval=1d`)).body.data);
    expect(h.points.length).toBeGreaterThan(50);
    // history ends at the quote price
    expect(h.points.at(-1)!.close).toBeCloseTo(m.price.value!, 1);
    const times = h.points.map((p) => Date.parse(p.timestamp));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("financials (annual and quarterly), balance sheet", async () => {
    const a = FinancialsResponse.parse((await ok(`/stocks/${t}/financials?period=annual&years=5`)).body.data);
    expect(a.periods).toHaveLength(5);
    expect(a.periods[0]!.revenue.currency).toBe(a.reportingCurrency);
    expect(a.periods[0]!.revenueGrowth.value).not.toBeNull();
    assertMetrics(a);
    const q = FinancialsResponse.parse((await ok(`/stocks/${t}/financials?period=quarterly&years=3`)).body.data);
    expect(q.periods).toHaveLength(12);
    const bs = BalanceSheetSchema.parse((await ok(`/stocks/${t}/balance-sheet`)).body.data);
    assertMetrics(bs);
  });

  it("valuation, peers", async () => {
    const v = ValuationSchema.parse((await ok(`/stocks/${t}/valuation`)).body.data);
    expect(v.pe.type).toBe("calculated");
    expect(v.forwardPe.type).toBe("estimate");
    expect(v.historical.pe.sampleSize).toBeGreaterThan(0);
    assertMetrics(v);
    const p = PeersResponse.parse((await ok(`/stocks/${t}/peers?limit=5`)).body.data);
    expect(p.peers.length).toBeGreaterThan(0);
    expect(p.peers.length).toBeLessThanOrEqual(5);
    expect(p.peers.map((c) => c.ticker)).not.toContain(t);
    expect(p.metrics[0]!.ticker).toBe(t);
  });

  it("earnings, estimates", async () => {
    const e = EarningsResponse.parse((await ok(`/stocks/${t}/earnings`)).body.data);
    expect(e).toHaveLength(8);
    expect(e.some((x) => x.result !== "unknown")).toBe(true);
    assertMetrics(e);
    const est = EstimatesSchema.parse((await ok(`/stocks/${t}/estimates`)).body.data);
    for (const m of [est.revenueEstimate, est.epsEstimate, est.fcfEstimate]) expect(m?.type).toBe("estimate");
    expect(est.revisions.length).toBeGreaterThan(0);
  });

  it("news is credible-only; analysis is traceable", async () => {
    const n = await ok(`/stocks/${t}/news?limit=20`);
    const news = NewsResponse.parse(n.body.data);
    expect(news.articles.length).toBeGreaterThan(0);
    expect(news.articles.every((a) => !a.source.includes("unverified"))).toBe(true);
    expect(n.body.meta.nextCursor).toBeTruthy();
    const an = AnalysisSchema.parse((await ok(`/stocks/${t}/analysis`)).body.data);
    const ids = new Set(an.sources.map((s) => s.id));
    const refs = [...an.risks, ...an.catalysts, ...an.moat, ...Object.values(an.scenarios), an.businessModel].flatMap((x) => x.sourceIds);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((r) => ids.has(r))).toBe(true);
    expect(an.scenarios.bull.impliedPrice.value!).toBeGreaterThan(an.scenarios.bear.impliedPrice.value!);
  });
});

describe("company-specific data integrity", () => {
  it("SPOT reports in EUR and P/E is FX-normalized to the USD share price", async () => {
    const d = CompanyDetailSchema.parse((await ok("/companies/SPOT")).body.data);
    expect(d.financials.revenue.currency).toBe("EUR");
    expect(d.market.price.currency).toBe("USD");
    expect(d.company.indexWeight).toBeUndefined(); // not an S&P 500 member
    const epsEur = d.financials.eps.value!;
    expect(d.valuation.pe.value!).toBeCloseTo(d.market.price.value! / (epsEur * 1.08), 1);
  });

  it("banks (JPM) return null, not 0, for concepts that don't apply", async () => {
    const d = CompanyDetailSchema.parse((await ok("/companies/JPM")).body.data);
    expect(d.financials.roic.value).toBeNull();
    expect(d.valuation.evToEbitda.value).toBeNull();
    const bs = BalanceSheetSchema.parse((await ok("/stocks/JPM/balance-sheet")).body.data);
    expect(bs.cash.value).toBeNull();
    expect(bs.netDebt.value).toBeNull();
    const f = FinancialsResponse.parse((await ok("/stocks/JPM/financials")).body.data);
    expect(f.periods[0]!.grossProfit.value).toBeNull();
    expect(f.periods[0]!.grossMargin.value).toBeNull();
    expect(d.valuation.pe.value).not.toBeNull();
  });

  it("market cap is price × shares and EV = cap + net debt", async () => {
    const m = MarketSnapshotSchema.parse((await ok("/stocks/NVDA/market")).body.data);
    expect(m.marketCap.value).toBeCloseTo(180 * 24.4e9, -3);
    const bs = BalanceSheetSchema.parse((await ok("/stocks/NVDA/balance-sheet")).body.data);
    expect(m.enterpriseValue.value!).toBeCloseTo(m.marketCap.value! + bs.netDebt.value!, -6);
  });

  it("FY labels follow each company's fiscal calendar", async () => {
    const nv = FinancialsResponse.parse((await ok("/stocks/NVDA/financials?period=annual&years=3")).body.data);
    expect(nv.periods[0]!.periodEnd).toMatch(/^\d{4}-01-31$/); // January fiscal year-end
    const ms = FinancialsResponse.parse((await ok("/stocks/MSFT/financials?period=annual&years=3")).body.data);
    expect(ms.periods[0]!.periodEnd).toMatch(/^\d{4}-06-30$/);
  });

  it("annual revenue equals the sum of its quarters", async () => {
    const a = FinancialsResponse.parse((await ok("/stocks/AAPL/financials?period=annual&years=3")).body.data);
    const q = FinancialsResponse.parse((await ok("/stocks/AAPL/financials?period=quarterly&years=3")).body.data);
    const fy = a.periods[0]!;
    const qs = q.periods.filter((p) => p.period.startsWith(fy.period + "-"));
    expect(qs).toHaveLength(4);
    expect(qs.reduce((s, p) => s + p.revenue.value!, 0)).toBeCloseTo(fy.revenue.value!, -2);
  });
});

describe("index, sectors, companies", () => {
  it("S&P 500 constituents, overview and sectors", async () => {
    const c = (await ok("/index/sp500/constituents")).body.data;
    expect(c.constituents.map((x: any) => x.ticker)).toContain("NVDA");
    expect(c.constituents.map((x: any) => x.ticker)).not.toContain("SPOT");
    const o = (await ok("/index/sp500/overview")).body.data;
    expect(o.level.value).toBeGreaterThan(0);
    expect(o.advancers + o.decliners).toBeLessThanOrEqual(c.constituents.length);
    const s = (await ok("/sectors")).body.data;
    expect(s.map((x: any) => x.sector)).toContain("Technology");
    expect(s.reduce((n: number, x: any) => n + x.companyCount, 0)).toBe(c.constituents.length);
  });

  it("company search, filters and cursor pagination", async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const r = await ok(`/companies?limit=10${cursor ? `&cursor=${cursor}` : ""}`);
      seen.push(...r.body.data.map((c: any) => c.ticker));
      cursor = r.body.meta.nextCursor;
    } while (cursor);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(expect.arrayContaining(["NVDA", "SPOT", "JPM"]));
    expect((await ok("/companies?search=alpha")).body.data.map((c: any) => c.ticker)).toEqual(["GOOGL"]);
    expect((await ok("/companies?ticker=wmt")).body.data).toHaveLength(1);
    expect((await ok("/companies?sector=Energy")).body.data.map((c: any) => c.ticker).sort()).toEqual(["CVX", "XOM"]);
  });
});

describe("compare and screener", () => {
  it("compare returns one row per ticker in request order", async () => {
    const r = await ok("/compare?tickers=NVDA,MSFT,AAPL");
    expect(r.body.data.metrics.map((m: any) => m.ticker)).toEqual(["NVDA", "MSFT", "AAPL"]);
    expect(r.body.data.companies).toHaveLength(3);
  });

  it("screener filters server-side and never returns rows that fail a filter", async () => {
    const r = await ok("/screener?sector=Technology&marketCapMin=10000000000&revenueGrowthMin=0.10&roicMin=0.15&peMax=100&limit=50");
    const items = r.body.data.items;
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.sector).toBe("Technology");
      expect(i.marketCap.value).toBeGreaterThanOrEqual(1e10);
      expect(i.revenueGrowth.value).toBeGreaterThanOrEqual(0.1);
      expect(i.roic.value).toBeGreaterThanOrEqual(0.15);
      expect(i.pe.value).toBeLessThanOrEqual(100);
      expect(i.pe.source).toBeUndefined(); // rows stay light
    }
    expect(r.body.data.meta.count).toBe(items.length);
  });

  it("screener pagination is complete, stable and sorted", async () => {
    const all: string[] = [];
    let cursor: string | undefined;
    let total = 0;
    do {
      const r = await ok(`/screener?limit=7&sort=marketCap${cursor ? `&cursor=${cursor}` : ""}`);
      all.push(...r.body.data.items.map((i: any) => i.ticker));
      total = r.body.data.meta.total;
      cursor = r.body.data.meta.nextCursor;
    } while (cursor);
    expect(all).toHaveLength(total);
    expect(new Set(all).size).toBe(total);
  });

  it("null metrics are excluded when filtered and sorted last", async () => {
    const r = await ok("/screener?roicMin=0&limit=200");
    expect(r.body.data.items.map((i: any) => i.ticker)).not.toContain("JPM"); // ROIC is null for banks
    const s = await ok("/screener?sort=roic&order=desc&limit=200");
    const vals = s.body.data.items.map((i: any) => i.roic.value);
    const firstNull = vals.indexOf(null);
    expect(firstNull).toBeGreaterThan(0);
    expect(vals.slice(firstNull).every((v: number | null) => v === null)).toBe(true);
    expect(vals.slice(0, firstNull)).toEqual([...vals.slice(0, firstNull)].sort((a, b) => b - a));
  });
});
