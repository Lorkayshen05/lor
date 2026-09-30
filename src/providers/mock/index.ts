import type { Clock } from "../../lib/clock";
import { iso } from "../../lib/clock";
import type { Source } from "../../contracts/common";
import type { HistoryInterval, HistoryRange } from "../../contracts/market";
import type { EstimatesProvider, FundamentalsProvider, IndexProvider, MarketDataProvider, NewsProvider, Providers } from "../interfaces";
import type {
  ConstituentsDto,
  EarningsDto,
  EstimatesDto,
  HistoryDto,
  IndexQuoteDto,
  NewsPageDto,
  ProfileDto,
  QuoteDto,
  StatementsDto,
} from "../types";
import { hash32 } from "../../lib/hash";
import { MOCK_COMPANIES, MOCK_INDEX_TOTAL_CAP, type MockCompany } from "./data";
import {
  PriceModel,
  generateAnnual,
  generateBars,
  generateQuarters,
  latestSessionDay,
  noise,
  prevSessionDay,
  quarterInfo,
  stripQuarter,
  type QuarterRow,
} from "./generator";

export const MOCK_NEWS_SOURCES = {
  credible: ["Mock Wire", "Mock Business Daily", "Mock Markets Journal"],
  unverified: ["StockTipsNow (unverified)"],
};

const byTicker = new Map(MOCK_COMPANIES.map((c) => [c.t, c]));

const marketSource = (at: string): Source => ({
  id: "mock-market-feed",
  name: "Mock Market Data Feed (synthetic)",
  url: "https://example.com/mock/market-data",
  accessedAt: at,
  type: "market",
});
const secSource = (t: string, at: string, foreign: boolean): Source => ({
  id: `sec-${t.toLowerCase()}-filings`,
  name: `SEC EDGAR ${foreign ? "20-F" : "10-K/10-Q"} filings, ${t} (mock values)`,
  url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(t)}&type=${foreign ? "20-F" : "10-K"}`,
  accessedAt: at,
  type: "sec",
});
const analystSource = (at: string): Source => ({
  id: "mock-analyst-consensus",
  name: "Mock Analyst Consensus (synthetic)",
  url: "https://example.com/mock/consensus",
  accessedAt: at,
  type: "analyst",
});
const indexSource = (at: string): Source => ({
  id: "mock-sp500-index",
  name: "Mock S&P 500 Index Data (synthetic)",
  url: "https://example.com/mock/sp500",
  accessedAt: at,
  type: "index",
});

function models(clock: Clock) {
  const cache = new Map<string, PriceModel>();
  return (co: MockCompany): PriceModel => {
    const d0 = latestSessionDay(clock.now());
    const key = `${co.t}:${d0}`;
    let m = cache.get(key);
    if (!m) {
      m = new PriceModel(co, d0);
      cache.set(key, m);
    }
    return m;
  };
}

export class MockMarketProvider implements MarketDataProvider {
  readonly name = "mock-market";
  private model: (co: MockCompany) => PriceModel;
  constructor(private readonly clock: Clock) {
    this.model = models(clock);
  }

  async getQuotes(tickers: string[]): Promise<QuoteDto[]> {
    const at = iso(this.clock.now());
    const out: QuoteDto[] = [];
    for (const t of new Set(tickers)) {
      const co = byTicker.get(t);
      if (!co) continue;
      const m = this.model(co);
      const yr = m.yearRange();
      out.push({
        ticker: t,
        currency: "USD",
        price: m.close(m.d0),
        previousClose: m.close(prevSessionDay(m.d0)),
        volume: m.volume(m.d0),
        averageVolume: co.vol * 1e6,
        fiftyTwoWeekHigh: Math.max(yr.high, m.close(m.d0)),
        fiftyTwoWeekLow: Math.min(yr.low, m.close(m.d0)),
        sharesOutstanding: co.sh * 1e9,
        dividendYield: co.div,
        asOf: at,
        source: marketSource(at),
      });
    }
    return out;
  }

  async getHistory(ticker: string, range: HistoryRange, interval: HistoryInterval): Promise<HistoryDto | null> {
    const co = byTicker.get(ticker);
    if (!co) return null;
    const at = iso(this.clock.now());
    return {
      ticker,
      currency: "USD",
      points: generateBars(this.model(co), range, interval, this.clock.now()),
      asOf: at,
      source: marketSource(at),
    };
  }
}

const profileOf = (co: MockCompany): ProfileDto => ({
  ticker: co.t,
  name: co.name,
  exchange: co.ex,
  ...(co.o?.sc ? { shareClass: co.o.sc } : {}),
  sector: co.sector,
  industry: co.industry,
  ...(co.o?.sub ? { subIndustry: co.o.sub } : {}),
  ...(co.o?.site ? { website: co.o.site } : {}),
  ...(co.o?.ir ? { investorRelationsUrl: co.o.ir } : {}),
  active: true,
  reportingCurrency: co.o?.cur ?? "USD",
});

export class MockFundamentalsProvider implements FundamentalsProvider {
  readonly name = "mock-fundamentals";
  private quarters = new Map<string, QuarterRow[]>();
  constructor(private readonly clock: Clock) {}

  private q(co: MockCompany): QuarterRow[] {
    let rows = this.quarters.get(co.t);
    if (!rows) {
      rows = generateQuarters(co);
      this.quarters.set(co.t, rows);
    }
    return rows;
  }

  async listProfiles() {
    return MOCK_COMPANIES.map(profileOf);
  }
  async getProfile(ticker: string) {
    const co = byTicker.get(ticker);
    return co ? profileOf(co) : null;
  }

  async getStatements(ticker: string, opts: { period: "annual" | "quarterly"; count: number }): Promise<StatementsDto | null> {
    const co = byTicker.get(ticker);
    if (!co) return null;
    const at = iso(this.clock.now());
    const rows = this.q(co);
    const periods = opts.period === "quarterly" ? rows.map(stripQuarter) : generateAnnual(rows);
    return {
      ticker,
      periodType: opts.period,
      reportingCurrency: co.o?.cur ?? "USD",
      fxToUsd: co.o?.fx ?? 1,
      periods: periods.slice(0, opts.count),
      asOf: at,
      source: secSource(ticker, at, (co.o?.cur ?? "USD") !== "USD"),
    };
  }

  async getEarnings(ticker: string, count: number): Promise<EarningsDto | null> {
    const co = byTicker.get(ticker);
    if (!co) return null;
    const at = iso(this.clock.now());
    const cur = co.o?.cur ?? "USD";
    const fye = co.o?.fye ?? 12;
    const rows = this.q(co);
    const periods = rows.slice(0, count).map((r, k) => {
      const revSurprise = 0.012 + 0.03 * noise(`${ticker}:er:${k}`);
      const epsSurprise = 0.03 + 0.06 * noise(`${ticker}:ee:${k}`);
      const end = new Date(r.periodEnd + "T00:00:00Z");
      end.setUTCDate(end.getUTCDate() + 35);
      const guidance =
        k === 0
          ? (() => {
              const next = quarterInfo(fye, -1);
              const nextRev = (r.revenue ?? 0) * Math.pow(1 + co.g, 0.25);
              return [
                { metric: "revenue", period: `FY${next.fiscalYear}-Q${next.fiscalQuarter}`, low: nextRev * 0.985, high: nextRev * 1.015, currency: cur },
              ];
            })()
          : [];
      return {
        fiscalYear: r.fiscalYear,
        fiscalQuarter: r._fq,
        reportDate: end.toISOString().slice(0, 10),
        currency: cur,
        revenueActual: r.revenue,
        revenueEstimate: r.revenue === null ? null : r.revenue / (1 + revSurprise),
        epsActual: r.epsDiluted,
        epsEstimate: r.epsDiluted === null ? null : r.epsDiluted / (1 + epsSurprise),
        guidance,
      };
    });
    return { ticker, periods, asOf: at, source: secSource(ticker, at, cur !== "USD") };
  }
}

export class MockEstimatesProvider implements EstimatesProvider {
  readonly name = "mock-estimates";
  constructor(private readonly clock: Clock) {}

  async getEstimates(ticker: string): Promise<EstimatesDto | null> {
    const co = byTicker.get(ticker);
    if (!co) return null;
    const at = iso(this.clock.now());
    const rows = generateQuarters(co).slice(0, 4);
    const sum = (f: (r: QuarterRow) => number | null) => rows.reduce((a, r) => a + (f(r) ?? 0), 0);
    const ttmEps = sum((r) => r.epsDiluted);
    const ttmRev = sum((r) => r.revenue);
    const ttmFcf = sum((r) => (r.operatingCashFlow ?? 0) - (r.capex ?? 0));
    const estG = Math.max(-0.3, Math.min(1, co.o?.estG ?? co.g * 0.8));
    const q0 = quarterInfo(co.o?.fye ?? 12, 0);
    const fy = q0.fiscalQuarter === 4 ? q0.fiscalYear + 1 : q0.fiscalYear;
    const forwardEps = ttmEps * (1 + estG);
    const rev = (n: number) => `2026-${String(9 - n).padStart(2, "0")}-15`;
    const revisions = [1, 2, 3, 4].map((n) => {
      const delta = 0.01 * noise(`${co.t}:rev:${n}`) + 0.004;
      return {
        date: rev(n),
        metric: n % 2 ? ("eps" as const) : ("revenue" as const),
        period: `FY${fy}`,
        previousValue: n % 2 ? forwardEps / (1 + delta) : ttmRev * (1 + co.g * 0.9) / (1 + delta),
        newValue: n % 2 ? forwardEps : ttmRev * (1 + co.g * 0.9),
      };
    });
    return {
      ticker,
      currency: co.o?.cur ?? "USD",
      forwardPeriod: `FY${fy}`,
      analystCount: co.o?.analysts ?? 20 + (hash32(co.t) % 25),
      revenueEstimate: ttmRev * (1 + co.g * 0.9),
      epsEstimate: forwardEps,
      fcfEstimate: ttmFcf * (1 + co.g),
      targetPrice: { low: co.price * 0.82, median: co.price * 1.12, high: co.price * 1.38 },
      revisions,
      asOf: at,
      source: analystSource(at),
    };
  }
}

const CATEGORIES = ["earnings", "product", "regulatory", "analyst", "markets"];

export class MockNewsProvider implements NewsProvider {
  readonly name = "mock-news";
  constructor(private readonly clock: Clock) {}

  async getNews(ticker: string, opts: { limit: number; cursor?: string }): Promise<NewsPageDto> {
    const co = byTicker.get(ticker);
    const at = iso(this.clock.now());
    if (!co) return { articles: [], asOf: at };
    const TOTAL = 60;
    const offset = opts.cursor?.startsWith("o:") ? Number(opts.cursor.slice(2)) : 0;
    const names = [...MOCK_NEWS_SOURCES.credible, ...MOCK_NEWS_SOURCES.credible, ...MOCK_NEWS_SOURCES.unverified];
    const articles = [];
    for (let i = offset; i < Math.min(TOTAL, offset + opts.limit); i++) {
      const source = names[i % names.length]!;
      const cred = MOCK_NEWS_SOURCES.credible.includes(source);
      const host = cred ? "news.mock-wire.example.com" : "tips.stocktipsnow.example.net";
      articles.push({
        id: `${co.t}-${i}`,
        title: `[Mock headline] ${co.name}: ${CATEGORIES[i % CATEGORIES.length]} update #${i + 1}`,
        source,
        publishedAt: iso(this.clock.now() - (i * 5 + 1) * 3_600_000),
        url: `https://${host}/mock/${co.t.toLowerCase()}/${i}`,
        category: CATEGORIES[i % CATEGORIES.length]!,
      });
    }
    const next = offset + opts.limit;
    return { articles, ...(next < TOTAL ? { nextCursor: `o:${next}` } : {}), asOf: at };
  }
}

export class MockIndexProvider implements IndexProvider {
  readonly name = "mock-index";
  private model: PriceModel;
  constructor(private readonly clock: Clock) {
    this.model = new PriceModel(
      { t: "SPX", name: "S&P 500", ex: "INDEX", sector: "", industry: "", rev: 1, g: 0.1, gm: 0, om: 0, nm: 0, price: 6850, sh: 1, div: 0, vol: 1000 },
      latestSessionDay(clock.now()),
    );
  }

  async getSp500Constituents(): Promise<ConstituentsDto> {
    const at = iso(this.clock.now());
    return {
      updatedAt: at,
      constituents: MOCK_COMPANIES.filter((c) => c.t !== "SPOT").map((c) => ({
        ticker: c.t,
        weight: (c.price * c.sh * 1e9) / MOCK_INDEX_TOTAL_CAP,
      })),
      source: indexSource(at),
    };
  }

  async getSp500Quote(): Promise<IndexQuoteDto> {
    const at = iso(this.clock.now());
    const m = this.model;
    const now = new Date(this.clock.now());
    const yearEnd = Date.UTC(now.getUTCFullYear() - 1, 11, 31) / 86_400_000;
    let d = Math.floor(yearEnd);
    while ([0, 6].includes(new Date(d * 86_400_000).getUTCDay())) d--;
    const yr = m.yearRange();
    return {
      level: m.close(m.d0),
      previousClose: m.close(prevSessionDay(m.d0)),
      priorYearEndLevel: m.close(d),
      fiftyTwoWeekHigh: Math.max(yr.high, m.close(m.d0)),
      fiftyTwoWeekLow: Math.min(yr.low, m.close(m.d0)),
      asOf: at,
      source: indexSource(at),
    };
  }
}

export function createMockProviders(clock: Clock): Providers {
  return {
    market: new MockMarketProvider(clock),
    fundamentals: new MockFundamentalsProvider(clock),
    estimates: new MockEstimatesProvider(clock),
    news: new MockNewsProvider(clock),
    index: new MockIndexProvider(clock),
  };
}
