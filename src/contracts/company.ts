import { z } from "zod";
import { MetricSchema, SourceSchema, Ticker, Limit } from "./common";

export const CompanySchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  exchange: z.string(),
  shareClass: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  subIndustry: z.string().optional(),
  /** Fraction of the S&P 500 (0.07 = 7 %). Absent when not an index member. */
  indexWeight: z.number().min(0).max(1).optional(),
  website: z.url().optional(),
  investorRelationsUrl: z.url().optional(),
  active: z.boolean(),
});
export type Company = z.infer<typeof CompanySchema>;

export const MarketSnapshotSchema = z.object({
  price: MetricSchema,
  dailyChange: MetricSchema,
  previousClose: MetricSchema,
  marketCap: MetricSchema,
  enterpriseValue: MetricSchema,
  volume: MetricSchema,
  averageVolume: MetricSchema,
  fiftyTwoWeekHigh: MetricSchema,
  fiftyTwoWeekLow: MetricSchema,
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

/** Latest trailing-twelve-month picture; full history lives on /financials. */
export const FinancialSnapshotSchema = z.object({
  revenue: MetricSchema,
  revenueGrowth: MetricSchema,
  grossMargin: MetricSchema,
  operatingMargin: MetricSchema,
  netIncome: MetricSchema,
  eps: MetricSchema,
  freeCashFlow: MetricSchema,
  fcfMargin: MetricSchema,
  roe: MetricSchema,
  roic: MetricSchema,
});
export type FinancialSnapshot = z.infer<typeof FinancialSnapshotSchema>;

export const ValuationSnapshotSchema = z.object({
  pe: MetricSchema,
  forwardPe: MetricSchema,
  ps: MetricSchema,
  evToEbitda: MetricSchema,
  pfcf: MetricSchema,
  fcfYield: MetricSchema,
});
export type ValuationSnapshot = z.infer<typeof ValuationSnapshotSchema>;

export const CompanyDetailSchema = z.object({
  company: CompanySchema,
  market: MarketSnapshotSchema,
  financials: FinancialSnapshotSchema,
  valuation: ValuationSnapshotSchema,
  sources: z.array(SourceSchema),
});
export type CompanyDetail = z.infer<typeof CompanyDetailSchema>;

export const CompaniesQuery = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    ticker: Ticker.optional(),
    sector: z.string().trim().min(1).max(100).optional(),
    industry: z.string().trim().min(1).max(100).optional(),
    limit: Limit(50, 200),
    cursor: z.string().max(200).optional(),
  })
  .strict();
export type CompaniesQuery = z.infer<typeof CompaniesQuery>;

export const CompaniesResponse = z.array(CompanySchema);
export const TickerParams = z.object({ ticker: Ticker }).strict();
