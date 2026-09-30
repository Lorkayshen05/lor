import type { ValuationSnapshot } from "../contracts/company";
import { metric } from "../lib/metric";
import type { Core } from "./core";

export function valuationSnapshot(c: Core): ValuationSnapshot {
  const asOf = c.asOf;
  const source = c.sources.fundamentals ?? c.sources.market;
  const x = { asOf, source, type: "calculated" as const, unit: "x" };
  return {
    pe: metric(c.pe, { ...x, period: "TTM" }),
    forwardPe: metric(c.forwardPe, { ...x, ...(c.forwardPeriod ? { period: c.forwardPeriod } : {}), type: "estimate", ...(c.sources.estimates ? { source: c.sources.estimates } : {}) }),
    ps: metric(c.ps, { ...x, period: "TTM" }),
    evToEbitda: metric(c.evToEbitda, { ...x, period: "TTM" }),
    pfcf: metric(c.pfcf, { ...x, period: "TTM" }),
    fcfYield: metric(c.fcfYield, { asOf, source, type: "calculated", unit: "ratio", period: "TTM" }),
  };
}
