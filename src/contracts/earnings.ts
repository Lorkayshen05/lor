import { z } from "zod";
import { Limit, MetricSchema } from "./common";

export const EarningsQuery = z.object({ limit: Limit(8, 20) }).strict();

export const EarningsResultSchema = z.enum(["beat", "inline", "miss", "unknown"]);

export const EarningsSchema = z.object({
  period: z.string(),
  reportDate: z.iso.date().nullable(),
  revenueActual: MetricSchema.optional(),
  revenueEstimate: MetricSchema.optional(),
  epsActual: MetricSchema.optional(),
  epsEstimate: MetricSchema.optional(),
  guidance: z.array(MetricSchema).optional(),
  result: EarningsResultSchema,
});
export type Earnings = z.infer<typeof EarningsSchema>;

export const EarningsResponse = z.array(EarningsSchema);

/** Analyst consensus items are always `type: "estimate"`. */
export const EstimateRevisionSchema = z.object({
  date: z.iso.date(),
  metric: z.enum(["eps", "revenue", "fcf", "targetPrice"]),
  period: z.string(),
  previousValue: z.number().nullable(),
  newValue: z.number().nullable(),
  changePct: z.number().nullable(),
  direction: z.enum(["up", "down", "unchanged"]),
  currency: z.string().optional(),
});
export type EstimateRevision = z.infer<typeof EstimateRevisionSchema>;

export const EstimatesSchema = z.object({
  analystCount: z.number().int().nonnegative().optional(),
  revenueEstimate: MetricSchema.optional(),
  epsEstimate: MetricSchema.optional(),
  fcfEstimate: MetricSchema.optional(),
  targetPrice: z
    .object({
      low: z.number().optional(),
      median: z.number().optional(),
      high: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  revisions: z.array(EstimateRevisionSchema),
});
export type Estimates = z.infer<typeof EstimatesSchema>;
