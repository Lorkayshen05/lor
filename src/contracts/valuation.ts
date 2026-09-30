import { z } from "zod";
import { MetricSchema } from "./common";

/** Distribution of a multiple over the company's own fiscal-year-end history. */
export const DistributionSchema = z.object({
  low: MetricSchema,
  median: MetricSchema,
  high: MetricSchema,
  /** Where the current value sits in the historical sample, 0–1. Null when not computable. */
  currentPercentile: z.number().min(0).max(1).nullable(),
  sampleSize: z.number().int().nonnegative(),
});

export const HistoricalValuationSchema = z.object({
  window: z.string(),
  pe: DistributionSchema,
  evToEbitda: DistributionSchema,
  fcfYield: DistributionSchema,
});

/** Median multiples of a comparison group (own sector, or the peer set). */
export const PeerMetricSchema = z.object({
  basis: z.enum(["sector", "peers"]),
  group: z.string(),
  sampleSize: z.number().int().nonnegative(),
  pe: MetricSchema,
  forwardPe: MetricSchema,
  pb: MetricSchema,
  ps: MetricSchema,
  evToEbitda: MetricSchema,
  pfcf: MetricSchema,
  fcfYield: MetricSchema,
});

export const ValuationSchema = z.object({
  pe: MetricSchema,
  forwardPe: MetricSchema,
  peg: MetricSchema,
  pb: MetricSchema,
  ps: MetricSchema,
  evToEbitda: MetricSchema,
  pfcf: MetricSchema,
  fcfYield: MetricSchema,
  historical: HistoricalValuationSchema,
  sectorMedian: PeerMetricSchema,
  peerMedian: PeerMetricSchema,
});
export type Valuation = z.infer<typeof ValuationSchema>;
