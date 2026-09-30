/**
 * Provider-facing DTOs. These are the *normalized* shapes every adapter must
 * produce, whatever the vendor's wire format. Services only ever see these,
 * and every adapter result is Zod-checked (see services/provider-call.ts)
 * before it is used.
 *
 * Money is in whole currency units. Missing data is `null`, never 0.
 */
import { z } from "zod";
import { IsoDate, IsoTimestamp, SourceSchema } from "../contracts/common";
import { PricePointSchema } from "../contracts/market";

const money = z.number().finite().nullable();

export const ProfileDto = z.object({
  ticker: z.string(),
  name: z.string(),
  exchange: z.string(),
  shareClass: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  subIndustry: z.string().optional(),
  website: z.url().optional(),
  investorRelationsUrl: z.url().optional(),
  active: z.boolean(),
  reportingCurrency: z.string().regex(/^[A-Z]{3}$/),
  description: z.string().optional(),
});
export type ProfileDto = z.infer<typeof ProfileDto>;

export const QuoteDto = z.object({
  ticker: z.string(),
  /** Trading currency. The API currently normalizes on USD listings. */
  currency: z.literal("USD"),
  price: z.number().positive(),
  previousClose: z.number().positive().nullable(),
  volume: z.number().nonnegative().nullable(),
  averageVolume: z.number().nonnegative().nullable(),
  fiftyTwoWeekHigh: z.number().positive().nullable(),
  fiftyTwoWeekLow: z.number().positive().nullable(),
  sharesOutstanding: z.number().positive().nullable(),
  dividendYield: z.number().min(0).max(1).nullable(),
  asOf: IsoTimestamp,
  source: SourceSchema,
});
export type QuoteDto = z.infer<typeof QuoteDto>;

export const HistoryDto = z.object({
  ticker: z.string(),
  currency: z.string(),
  points: z.array(PricePointSchema),
  asOf: IsoTimestamp,
  source: SourceSchema,
});
export type HistoryDto = z.infer<typeof HistoryDto>;

export const StatementPeriodDto = z.object({
  fiscalYear: z.number().int(),
  /** null for annual periods */
  fiscalQuarter: z.number().int().min(1).max(4).nullable(),
  periodEnd: IsoDate,
  revenue: money,
  grossProfit: money,
  operatingIncome: money,
  ebitda: money,
  netIncome: money,
  epsDiluted: money,
  dilutedShares: money,
  effectiveTaxRate: z.number().min(0).max(1).nullable(),
  operatingCashFlow: money,
  /** cash spent, positive */
  capex: money,
  cash: money,
  shortTermInvestments: money,
  totalDebt: money,
  currentAssets: money,
  currentLiabilities: money,
  totalEquity: money,
  investedCapital: money,
});
export type StatementPeriodDto = z.infer<typeof StatementPeriodDto>;

export const StatementsDto = z.object({
  ticker: z.string(),
  periodType: z.enum(["annual", "quarterly"]),
  reportingCurrency: z.string().regex(/^[A-Z]{3}$/),
  /** Multiply reporting-currency amounts by this to get USD (1 for USD reporters). */
  fxToUsd: z.number().positive(),
  /** Newest first. */
  periods: z.array(StatementPeriodDto),
  asOf: IsoTimestamp,
  source: SourceSchema,
});
export type StatementsDto = z.infer<typeof StatementsDto>;

export const GuidanceDto = z.object({
  metric: z.string(),
  period: z.string(),
  low: z.number().nullable(),
  high: z.number().nullable(),
  currency: z.string().optional(),
  unit: z.string().optional(),
});

export const EarningsPeriodDto = z.object({
  fiscalYear: z.number().int(),
  fiscalQuarter: z.number().int().min(1).max(4),
  reportDate: IsoDate.nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  revenueActual: money,
  revenueEstimate: money,
  epsActual: money,
  epsEstimate: money,
  guidance: z.array(GuidanceDto),
});
export const EarningsDto = z.object({
  ticker: z.string(),
  /** Newest first. */
  periods: z.array(EarningsPeriodDto),
  asOf: IsoTimestamp,
  source: SourceSchema,
});
export type EarningsDto = z.infer<typeof EarningsDto>;

export const EstimatesDto = z.object({
  ticker: z.string(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  /** Fiscal year the forward figures refer to, e.g. "FY2027". */
  forwardPeriod: z.string(),
  analystCount: z.number().int().nonnegative().nullable(),
  revenueEstimate: money,
  epsEstimate: money,
  fcfEstimate: money,
  targetPrice: z.object({ low: money, median: money, high: money }).nullable(),
  revisions: z.array(
    z.object({
      date: IsoDate,
      metric: z.enum(["eps", "revenue", "fcf", "targetPrice"]),
      period: z.string(),
      previousValue: money,
      newValue: money,
    }),
  ),
  asOf: IsoTimestamp,
  source: SourceSchema,
});
export type EstimatesDto = z.infer<typeof EstimatesDto>;

export const NewsPageDto = z.object({
  articles: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1),
      source: z.string(),
      publishedAt: IsoTimestamp,
      url: z.url(),
      category: z.string().optional(),
    }),
  ),
  nextCursor: z.string().optional(),
  asOf: IsoTimestamp,
});
export type NewsPageDto = z.infer<typeof NewsPageDto>;

export const ConstituentsDto = z.object({
  updatedAt: IsoTimestamp,
  constituents: z.array(z.object({ ticker: z.string(), weight: z.number().min(0).max(1).nullable() })),
  source: SourceSchema,
});
export type ConstituentsDto = z.infer<typeof ConstituentsDto>;

export const IndexQuoteDto = z.object({
  level: z.number().positive(),
  previousClose: z.number().positive(),
  /** Level at the last close of the prior calendar year. */
  priorYearEndLevel: z.number().positive().nullable(),
  fiftyTwoWeekHigh: z.number().positive().nullable(),
  fiftyTwoWeekLow: z.number().positive().nullable(),
  asOf: IsoTimestamp,
  source: SourceSchema,
});
export type IndexQuoteDto = z.infer<typeof IndexQuoteDto>;
