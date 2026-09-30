import { z } from "zod";
import { MetricSchema, IsoTimestamp } from "./common";

export const ConstituentSchema = z.object({
  ticker: z.string(),
  companyId: z.string(),
  name: z.string(),
  sector: z.string(),
  industry: z.string(),
  indexWeight: z.number().min(0).max(1).optional(),
});

export const ConstituentsResponse = z.object({
  updatedAt: IsoTimestamp,
  constituents: z.array(ConstituentSchema),
});

export const Sp500OverviewSchema = z.object({
  level: MetricSchema,
  dailyChange: MetricSchema,
  ytdReturn: MetricSchema,
  fiftyTwoWeekHigh: MetricSchema,
  fiftyTwoWeekLow: MetricSchema,
  advancers: z.number().int().nonnegative(),
  decliners: z.number().int().nonnegative(),
});

export const SectorSchema = z.object({
  sector: z.string(),
  companyCount: z.number().int().nonnegative(),
  marketCap: MetricSchema,
  averageReturn: MetricSchema,
  medianReturn: MetricSchema,
  revenueGrowth: MetricSchema,
  pe: MetricSchema,
});
export const SectorsResponse = z.array(SectorSchema);
