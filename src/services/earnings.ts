import type { Earnings, Estimates, EstimateRevision } from "../contracts/earnings";
import { notFound } from "../lib/errors";
import { metric } from "../lib/metric";
import type { Metric } from "../contracts/common";
import type { Gateway } from "./gateway";
import { result, type Result } from "./result";

const BAND = 0.01; // within ±1 % of the estimate counts as "inline"

export function surprise(actual: number | null, estimate: number | null): number | null {
  if (actual === null || estimate === null || estimate === 0) return null;
  return (actual - estimate) / Math.abs(estimate);
}

/** EPS decides when available, otherwise revenue; both missing → "unknown". */
export function earningsResult(epsA: number | null, epsE: number | null, revA: number | null, revE: number | null): Earnings["result"] {
  const s = surprise(epsA, epsE) ?? surprise(revA, revE);
  if (s === null) return "unknown";
  return s > BAND ? "beat" : s < -BAND ? "miss" : "inline";
}

export class EarningsService {
  constructor(private readonly gw: Gateway) {}

  async earnings(ticker: string, limit: number): Promise<Result<Earnings[]>> {
    const c = await this.gw.earnings(ticker, limit);
    const e = c.value;
    if (!e) throw notFound(`Unknown ticker ${ticker}`);
    const data = e.periods.slice(0, limit).map((p): Earnings => {
      const period = `FY${p.fiscalYear}-Q${p.fiscalQuarter}`;
      const asOf = `${p.reportDate ?? "1970-01-01"}T00:00:00.000Z`;
      const money = { asOf, period, currency: p.currency, source: e.source };
      const guidance: Metric[] = p.guidance.flatMap((g) => {
        const m = { asOf: e.asOf, type: "guidance" as const, source: e.source, ...(g.currency ? { currency: g.currency } : {}), ...(g.unit ? { unit: g.unit } : {}) };
        return [metric(g.low, { ...m, period: `${g.period} ${g.metric} (low)` }), metric(g.high, { ...m, period: `${g.period} ${g.metric} (high)` })];
      });
      return {
        period,
        reportDate: p.reportDate,
        revenueActual: metric(p.revenueActual, { ...money, type: "actual" }),
        revenueEstimate: metric(p.revenueEstimate, { ...money, type: "estimate" }),
        epsActual: metric(p.epsActual, { ...money, type: "actual", unit: "per_share" }),
        epsEstimate: metric(p.epsEstimate, { ...money, type: "estimate", unit: "per_share" }),
        ...(guidance.length ? { guidance } : {}),
        result: earningsResult(p.epsActual, p.epsEstimate, p.revenueActual, p.revenueEstimate),
      };
    });
    return result(data, { asOf: e.asOf, source: e.source.name, stale: c.stale });
  }

  async estimates(ticker: string): Promise<Result<Estimates>> {
    const c = await this.gw.estimates(ticker);
    const e = c.value;
    if (!e) throw notFound(`Unknown ticker ${ticker}`);
    const base = { asOf: e.asOf, type: "estimate" as const, period: e.forwardPeriod, source: e.source };
    const tp = e.targetPrice;
    const revisions: EstimateRevision[] = e.revisions.map((r) => {
      const changePct = r.previousValue !== null && r.newValue !== null && r.previousValue > 0 ? r.newValue / r.previousValue - 1 : null;
      return {
        date: r.date,
        metric: r.metric,
        period: r.period,
        previousValue: r.previousValue,
        newValue: r.newValue,
        changePct: changePct === null ? null : Math.round(changePct * 1e6) / 1e6,
        direction: changePct === null || Math.abs(changePct) < 1e-9 ? "unchanged" : changePct > 0 ? "up" : "down",
        currency: r.metric === "targetPrice" ? "USD" : e.currency,
      };
    });
    const data: Estimates = {
      ...(e.analystCount !== null ? { analystCount: e.analystCount } : {}),
      revenueEstimate: metric(e.revenueEstimate, { ...base, currency: e.currency }),
      epsEstimate: metric(e.epsEstimate, { ...base, currency: e.currency, unit: "per_share" }),
      fcfEstimate: metric(e.fcfEstimate, { ...base, currency: e.currency }),
      ...(tp
        ? {
            targetPrice: {
              ...(tp.low !== null ? { low: tp.low } : {}),
              ...(tp.median !== null ? { median: tp.median } : {}),
              ...(tp.high !== null ? { high: tp.high } : {}),
              currency: "USD",
            },
          }
        : {}),
      revisions,
    };
    return result(data, { asOf: e.asOf, source: e.source.name, stale: c.stale });
  }
}

