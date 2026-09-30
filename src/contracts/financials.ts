import { z } from "zod";
import { MetricSchema, SourceSchema } from "./common";

export const FinancialsQuery = z
  .object({
    period: z.enum(["annual", "quarterly"]).default("annual"),
    years: z.coerce.number().int().refine((n) => [3, 5, 10].includes(n), "years must be 3, 5 or 10").default(5),
  })
  .strict();

/** `capex` is cash spent, reported as a positive number. */
export const FinancialPeriodSchema = z.object({
  period: z.string(),
  periodEnd: z.iso.date(),
  revenue: MetricSchema,
  revenueGrowth: MetricSchema,
  grossProfit: MetricSchema,
  grossMargin: MetricSchema,
  operatingIncome: MetricSchema,
  operatingMargin: MetricSchema,
  netIncome: MetricSchema,
  eps: MetricSchema,
  operatingCashFlow: MetricSchema,
  capex: MetricSchema,
  freeCashFlow: MetricSchema,
  fcfMargin: MetricSchema,
  roe: MetricSchema,
  roic: MetricSchema,
});
export type FinancialPeriod = z.infer<typeof FinancialPeriodSchema>;

export const FinancialsResponse = z.object({
  ticker: z.string(),
  periodType: z.enum(["annual", "quarterly"]),
  reportingCurrency: z.string(),
  periods: z.array(FinancialPeriodSchema),
  sources: z.array(SourceSchema),
});

export type FinancialsResponse = z.infer<typeof FinancialsResponse>;

export const BalanceSheetSchema = z.object({
  cash: MetricSchema,
  shortTermInvestments: MetricSchema,
  totalDebt: MetricSchema,
  netDebt: MetricSchema,
  netDebtToEbitda: MetricSchema,
  currentRatio: MetricSchema,
});
export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;
