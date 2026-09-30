/**
 * Pure financial formulas. The backend owns these; the frontend never
 * recomputes. All functions return `null` when an input is missing or the
 * result would be meaningless (e.g. P/E on negative earnings).
 */
export type N = number | null | undefined;

const ok = (x: N): x is number => typeof x === "number" && Number.isFinite(x);

export const sum = (xs: N[]): number | null => (xs.length > 0 && xs.every(ok) ? (xs as number[]).reduce((a, b) => a + b, 0) : null);

export const growth = (cur: N, prev: N): number | null => (ok(cur) && ok(prev) && prev > 0 ? cur / prev - 1 : null);

export const ratio = (num: N, den: N): number | null => (ok(num) && ok(den) && den > 0 ? num / den : null);

export const freeCashFlow = (ocf: N, capex: N): number | null => (ok(ocf) && ok(capex) ? ocf - Math.abs(capex) : null);

/** NOPAT / invested capital. Requires an explicit tax rate; no assumed default. */
export const roic = (operatingIncome: N, taxRate: N, investedCapital: N): number | null =>
  ok(operatingIncome) && ok(taxRate) ? ratio(operatingIncome * (1 - taxRate), investedCapital) : null;

export const netDebt = (debt: N, cash: N, sti: N): number | null =>
  ok(debt) && ok(cash) ? debt - cash - (ok(sti) ? sti : 0) : null;

/** Multiples are undefined (null) when the denominator is not positive. */
export const multiple = (num: N, den: N): number | null => ratio(num, den);

export const yieldOf = (flow: N, value: N): number | null => (ok(flow) && ok(value) && value > 0 ? flow / value : null);

export const peg = (pe: N, epsGrowthFraction: N): number | null =>
  ok(pe) && ok(epsGrowthFraction) && epsGrowthFraction > 0 ? pe / (epsGrowthFraction * 100) : null;

export function median(xs: N[]): number | null {
  const v = xs.filter(ok).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

export const mean = (xs: N[]): number | null => {
  const v = xs.filter(ok);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Share of sample values <= x, in [0,1]. */
export const percentileRank = (x: N, sample: N[]): number | null => {
  const v = sample.filter(ok);
  if (!ok(x) || v.length === 0) return null;
  return v.filter((s) => s <= x).length / v.length;
};
