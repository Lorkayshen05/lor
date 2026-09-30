import type { Source } from "../contracts/common";
import { notFound, ProviderError } from "../lib/errors";
import * as F from "../lib/formulas";
import type { EstimatesDto, ProfileDto, QuoteDto, StatementPeriodDto } from "../providers/types";
import type { Gateway } from "./gateway";

/**
 * Normalized, unit-explicit metrics for one ticker. Single home of the
 * valuation math: everything the API returns about multiples, growth and
 * returns derives from here (or from lib/formulas).
 *
 * Money fields named `*Usd` are USD; `ttm.*` and `bal.*` are in `reportingCurrency`.
 */
export interface Core {
  ticker: string;
  profile: ProfileDto;
  quote: QuoteDto;
  stale: boolean;
  asOf: string;
  reportingCurrency: string;
  fxToUsd: number;
  fundamentalsAsOf: string | null;
  period: string | null; // label of the latest reported quarter
  ttm: {
    revenue: number | null;
    priorRevenue: number | null;
    grossProfit: number | null;
    operatingIncome: number | null;
    ebitda: number | null;
    netIncome: number | null;
    eps: number | null;
    priorEps: number | null;
    operatingCashFlow: number | null;
    capex: number | null;
    freeCashFlow: number | null;
  };
  bal: {
    cash: number | null;
    shortTermInvestments: number | null;
    totalDebt: number | null;
    netDebt: number | null;
    equity: number | null;
    investedCapital: number | null;
    currentAssets: number | null;
    currentLiabilities: number | null;
  };
  price: number;
  previousClose: number | null;
  dailyChange: number | null;
  marketCapUsd: number | null;
  enterpriseValueUsd: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  fcfMargin: number | null;
  roe: number | null;
  roic: number | null;
  pe: number | null;
  forwardPe: number | null;
  forwardEps: number | null;
  forwardPeriod: string | null;
  peg: number | null;
  pb: number | null;
  ps: number | null;
  evToEbitda: number | null;
  pfcf: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  sources: { market: Source; fundamentals: Source | null; estimates: Source | null };
}

export const periodLabel = (p: Pick<StatementPeriodDto, "fiscalYear" | "fiscalQuarter">): string =>
  p.fiscalQuarter ? `FY${p.fiscalYear}-Q${p.fiscalQuarter}` : `FY${p.fiscalYear}`;

const take = (rows: StatementPeriodDto[], from: number, to: number, key: keyof StatementPeriodDto) =>
  rows.length >= to ? F.sum(rows.slice(from, to).map((r) => r[key] as number | null)) : null;

export class CoreService {
  constructor(private readonly gw: Gateway) {}

  async get(ticker: string): Promise<Core> {
    const core = await this.find(ticker);
    if (!core) throw notFound(`Unknown ticker ${ticker}`);
    return core;
  }

  async find(ticker: string): Promise<Core | null> {
    const [profileC, quoteC, stmtC] = await Promise.all([this.gw.profile(ticker), this.gw.quote(ticker), this.gw.statements(ticker, "quarterly", 8)]);
    const profile = profileC.value;
    const quote = quoteC?.value;
    if (!profile || !quote) return null;

    // Estimates are an enrichment: their failure must not take the whole snapshot down.
    let est: EstimatesDto | null = null;
    let estStale = false;
    try {
      const e = await this.gw.estimates(ticker);
      est = e.value;
      estStale = e.stale;
    } catch (err) {
      if (!(err instanceof ProviderError)) throw err;
    }

    const stmts = stmtC.value;
    const fx = stmts?.fxToUsd ?? 1;
    const q = stmts?.periods ?? [];
    const latest = q[0];

    const ttm = {
      revenue: take(q, 0, 4, "revenue"),
      priorRevenue: take(q, 4, 8, "revenue"),
      grossProfit: take(q, 0, 4, "grossProfit"),
      operatingIncome: take(q, 0, 4, "operatingIncome"),
      ebitda: take(q, 0, 4, "ebitda"),
      netIncome: take(q, 0, 4, "netIncome"),
      eps: take(q, 0, 4, "epsDiluted"),
      priorEps: take(q, 4, 8, "epsDiluted"),
      operatingCashFlow: take(q, 0, 4, "operatingCashFlow"),
      capex: take(q, 0, 4, "capex"),
      freeCashFlow: null as number | null,
    };
    ttm.freeCashFlow = F.freeCashFlow(ttm.operatingCashFlow, ttm.capex);

    const bal = {
      cash: latest?.cash ?? null,
      shortTermInvestments: latest?.shortTermInvestments ?? null,
      totalDebt: latest?.totalDebt ?? null,
      netDebt: F.netDebt(latest?.totalDebt, latest?.cash, latest?.shortTermInvestments),
      equity: latest?.totalEquity ?? null,
      investedCapital: latest?.investedCapital ?? null,
      currentAssets: latest?.currentAssets ?? null,
      currentLiabilities: latest?.currentLiabilities ?? null,
    };

    const price = quote.price;
    const marketCapUsd = quote.sharesOutstanding === null ? null : price * quote.sharesOutstanding;
    const usd = (x: number | null) => (x === null ? null : x * fx);
    const evUsd = marketCapUsd === null || bal.netDebt === null ? null : marketCapUsd + bal.netDebt * fx;

    // forward EPS is only comparable when quoted in the reporting currency
    const estFx = est ? (est.currency === (stmts?.reportingCurrency ?? profile.reportingCurrency) ? fx : est.currency === "USD" ? 1 : null) : null;
    const forwardEpsUsd = est && estFx !== null && est.epsEstimate !== null ? est.epsEstimate * estFx : null;
    const epsUsd = usd(ttm.eps);
    const pe = epsUsd !== null && epsUsd > 0 ? price / epsUsd : null;
    const forwardPe = forwardEpsUsd !== null && forwardEpsUsd > 0 ? price / forwardEpsUsd : null;
    const fwdGrowth = forwardEpsUsd !== null && epsUsd !== null && epsUsd > 0 ? forwardEpsUsd / epsUsd - 1 : null;
    const fcfUsd = usd(ttm.freeCashFlow);

    return {
      ticker,
      profile,
      quote,
      stale: quoteC!.stale || profileC.stale || stmtC.stale || estStale,
      asOf: quote.asOf,
      reportingCurrency: stmts?.reportingCurrency ?? profile.reportingCurrency,
      fxToUsd: fx,
      fundamentalsAsOf: stmts?.asOf ?? null,
      period: latest ? periodLabel(latest) : null,
      ttm,
      bal,
      price,
      previousClose: quote.previousClose,
      dailyChange: quote.previousClose ? price / quote.previousClose - 1 : null,
      marketCapUsd,
      enterpriseValueUsd: evUsd,
      revenueGrowth: F.growth(ttm.revenue, ttm.priorRevenue),
      epsGrowth: F.growth(ttm.eps, ttm.priorEps),
      grossMargin: F.ratio(ttm.grossProfit, ttm.revenue),
      operatingMargin: F.ratio(ttm.operatingIncome, ttm.revenue),
      netMargin: F.ratio(ttm.netIncome, ttm.revenue),
      fcfMargin: F.ratio(ttm.freeCashFlow, ttm.revenue),
      roe: F.ratio(ttm.netIncome, bal.equity),
      roic: F.roic(ttm.operatingIncome, latest?.effectiveTaxRate, bal.investedCapital),
      pe,
      forwardPe,
      forwardEps: forwardEpsUsd,
      forwardPeriod: est?.forwardPeriod ?? null,
      peg: F.peg(pe, fwdGrowth),
      pb: F.multiple(marketCapUsd, usd(bal.equity)),
      ps: F.multiple(marketCapUsd, usd(ttm.revenue)),
      evToEbitda: F.multiple(evUsd, usd(ttm.ebitda)),
      pfcf: F.multiple(marketCapUsd, fcfUsd),
      fcfYield: F.yieldOf(fcfUsd, marketCapUsd),
      dividendYield: quote.dividendYield,
      sources: { market: quote.source, fundamentals: stmts?.source ?? null, estimates: est?.source ?? null },
    };
  }
}
