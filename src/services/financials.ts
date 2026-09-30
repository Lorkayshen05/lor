import type { BalanceSheet, FinancialPeriod, FinancialsResponse } from "../contracts/financials";
import type { FinancialSnapshot } from "../contracts/company";
import { notFound } from "../lib/errors";
import * as F from "../lib/formulas";
import { metric, uniqueSources } from "../lib/metric";
import type { StatementPeriodDto, StatementsDto } from "../providers/types";
import { periodLabel, type Core, type CoreService } from "./core";
import type { Gateway } from "./gateway";
import { result, type Result } from "./result";

export function financialSnapshot(c: Core): FinancialSnapshot {
  const asOf = c.fundamentalsAsOf ?? c.asOf;
  const source = c.sources.fundamentals ?? undefined;
  const cur = c.reportingCurrency;
  const base = { asOf, type: "calculated" as const, period: "TTM", ...(source ? { source } : {}) };
  const money = { ...base, currency: cur };
  return {
    revenue: metric(c.ttm.revenue, money),
    revenueGrowth: metric(c.revenueGrowth, { ...base, unit: "ratio" }),
    grossMargin: metric(c.grossMargin, { ...base, unit: "ratio" }),
    operatingMargin: metric(c.operatingMargin, { ...base, unit: "ratio" }),
    netIncome: metric(c.ttm.netIncome, money),
    eps: metric(c.ttm.eps, { ...money, unit: "per_share" }),
    freeCashFlow: metric(c.ttm.freeCashFlow, money),
    fcfMargin: metric(c.fcfMargin, { ...base, unit: "ratio" }),
    roe: metric(c.roe, { ...base, unit: "ratio" }),
    roic: metric(c.roic, { ...base, unit: "ratio" }),
  };
}

function buildPeriod(rows: StatementPeriodDto[], i: number, kind: "annual" | "quarterly", s: StatementsDto): FinancialPeriod {
  const cur = rows[i]!;
  const prior = rows[i + (kind === "annual" ? 1 : 4)];
  const label = periodLabel(cur);
  const asOf = `${cur.periodEnd}T00:00:00.000Z`;
  const cc = s.reportingCurrency;
  const actual = { asOf, type: "actual" as const, period: label, source: s.source };
  const calc = { asOf, type: "calculated" as const, period: label, source: s.source };

  const fcf = F.freeCashFlow(cur.operatingCashFlow, cur.capex);
  let roeNi: number | null;
  let roicOp: number | null;
  let retLabel = label;
  if (kind === "annual") {
    roeNi = cur.netIncome;
    roicOp = cur.operatingIncome;
  } else {
    const w = rows.slice(i, i + 4);
    roeNi = w.length === 4 ? F.sum(w.map((r) => r.netIncome)) : null;
    roicOp = w.length === 4 ? F.sum(w.map((r) => r.operatingIncome)) : null;
    retLabel = `${label} TTM`;
  }

  return {
    period: label,
    periodEnd: cur.periodEnd,
    revenue: metric(cur.revenue, { ...actual, currency: cc }),
    revenueGrowth: metric(F.growth(cur.revenue, prior?.revenue), { ...calc, unit: "ratio" }),
    grossProfit: metric(cur.grossProfit, { ...actual, currency: cc }),
    grossMargin: metric(F.ratio(cur.grossProfit, cur.revenue), { ...calc, unit: "ratio" }),
    operatingIncome: metric(cur.operatingIncome, { ...actual, currency: cc }),
    operatingMargin: metric(F.ratio(cur.operatingIncome, cur.revenue), { ...calc, unit: "ratio" }),
    netIncome: metric(cur.netIncome, { ...actual, currency: cc }),
    eps: metric(cur.epsDiluted, { ...actual, currency: cc, unit: "per_share" }),
    operatingCashFlow: metric(cur.operatingCashFlow, { ...actual, currency: cc }),
    capex: metric(cur.capex, { ...actual, currency: cc }),
    freeCashFlow: metric(fcf, { ...calc, currency: cc }),
    fcfMargin: metric(F.ratio(fcf, cur.revenue), { ...calc, unit: "ratio" }),
    roe: metric(F.ratio(roeNi, cur.totalEquity), { ...calc, period: retLabel, unit: "ratio" }),
    roic: metric(F.roic(roicOp, cur.effectiveTaxRate, cur.investedCapital), { ...calc, period: retLabel, unit: "ratio" }),
  };
}

export class FinancialsService {
  constructor(
    private readonly core: CoreService,
    private readonly gw: Gateway,
  ) {}

  async periods(ticker: string, kind: "annual" | "quarterly", years: number): Promise<Result<FinancialsResponse>> {
    const want = kind === "annual" ? years : years * 4;
    // one extra year of history so the oldest returned period still has a growth base
    const fetchCount = want + (kind === "annual" ? 1 : 4);
    const c = await this.gw.statements(ticker, kind, fetchCount);
    const s = c.value;
    if (!s) throw notFound(`Unknown ticker ${ticker}`);
    const rows = s.periods;
    const periods = rows.slice(0, want).map((_, i) => buildPeriod(rows, i, kind, s));
    return result(
      { ticker, periodType: kind, reportingCurrency: s.reportingCurrency, periods, sources: uniqueSources([s.source]) },
      { asOf: s.asOf, source: s.source.name, stale: c.stale },
    );
  }

  async balanceSheet(ticker: string): Promise<Result<BalanceSheet>> {
    const c = await this.core.get(ticker);
    const asOf = c.fundamentalsAsOf ?? c.asOf;
    const source = c.sources.fundamentals ?? undefined;
    const cc = c.reportingCurrency;
    const period = c.period ?? undefined;
    const base = { asOf, ...(period ? { period } : {}), ...(source ? { source } : {}) };
    const actual = { ...base, type: "actual" as const, currency: cc };
    const calc = { ...base, type: "calculated" as const };
    const data: BalanceSheet = {
      cash: metric(c.bal.cash, actual),
      shortTermInvestments: metric(c.bal.shortTermInvestments, actual),
      totalDebt: metric(c.bal.totalDebt, actual),
      netDebt: metric(c.bal.netDebt, { ...calc, currency: cc }),
      netDebtToEbitda: metric(c.bal.netDebt !== null ? F.multiple(c.bal.netDebt, c.ttm.ebitda) : null, { ...calc, unit: "x" }),
      currentRatio: metric(F.multiple(c.bal.currentAssets, c.bal.currentLiabilities), { ...calc, unit: "x" }),
    };
    return result(data, { asOf, ...(source ? { source: source.name } : {}), stale: c.stale });
  }
}
