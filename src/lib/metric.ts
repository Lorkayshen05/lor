import type { Metric, MetricType, Source } from "../contracts/common";

export interface MetricMeta {
  asOf: string;
  type: MetricType;
  currency?: string;
  unit?: string;
  period?: string;
  source?: Source;
}

const DIGITS: Record<string, number> = { ratio: 6, x: 2, points: 2 };

/** Build a Metric. Non-finite or missing values become `null` — never 0. */
export function metric(value: number | null | undefined, meta: MetricMeta): Metric {
  let v: number | null = typeof value === "number" && Number.isFinite(value) ? value : null;
  if (v !== null) {
    const digits = DIGITS[meta.unit ?? ""] ?? (meta.currency ? 4 : 0);
    const f = 10 ** digits;
    v = Math.round(v * f) / f;
    if (Object.is(v, -0)) v = 0;
  }
  const out: Metric = { value: v, asOf: meta.asOf, type: meta.type };
  if (meta.currency) out.currency = meta.currency;
  if (meta.unit) out.unit = meta.unit;
  if (meta.period) out.period = meta.period;
  if (meta.source) out.source = meta.source;
  return out;
}

export const uniqueSources = (sources: Array<Source | undefined>): Source[] => {
  const seen = new Map<string, Source>();
  for (const s of sources) if (s && !seen.has(s.id)) seen.set(s.id, s);
  return [...seen.values()];
};
