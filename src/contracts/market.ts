import { z } from "zod";
import { IsoTimestamp } from "./common";

export const HistoryRange = z.enum(["1d", "1w", "1m", "3m", "6m", "1y", "5y"]);
export const HistoryInterval = z.enum(["1m", "5m", "1h", "1d", "1w"]);
export type HistoryRange = z.infer<typeof HistoryRange>;
export type HistoryInterval = z.infer<typeof HistoryInterval>;

/** Default bar size per range when `interval` is omitted. */
export const DEFAULT_INTERVAL: Record<HistoryRange, HistoryInterval> = {
  "1d": "5m", "1w": "1h", "1m": "1d", "3m": "1d", "6m": "1d", "1y": "1d", "5y": "1w",
};
/** Valid range/interval combinations. Anything else would be an unbounded or meaningless request. */
export const ALLOWED_INTERVALS: Record<HistoryRange, HistoryInterval[]> = {
  "1d": ["1m", "5m", "1h"],
  "1w": ["5m", "1h", "1d"],
  "1m": ["1h", "1d"],
  "3m": ["1d", "1w"],
  "6m": ["1d", "1w"],
  "1y": ["1d", "1w"],
  "5y": ["1d", "1w"],
};

export const HistoryQuery = z
  .object({ range: HistoryRange.default("1m"), interval: HistoryInterval.optional() })
  .strict()
  .transform((q) => ({ range: q.range, interval: q.interval ?? DEFAULT_INTERVAL[q.range] }))
  .refine((q) => ALLOWED_INTERVALS[q.range].includes(q.interval), {
    message: "interval is not supported for this range",
    path: ["interval"],
  });

export const PricePointSchema = z
  .object({
    timestamp: IsoTimestamp,
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    volume: z.number().int().nonnegative(),
  })
  .refine((p) => p.high >= p.low && p.high >= p.open && p.high >= p.close && p.low <= p.open && p.low <= p.close, {
    message: "inconsistent OHLC",
  });
export type PricePoint = z.infer<typeof PricePointSchema>;

export const HistoryResponse = z.object({
  ticker: z.string(),
  range: HistoryRange,
  interval: HistoryInterval,
  currency: z.string(),
  points: z.array(PricePointSchema),
});
export type HistoryResponse = z.infer<typeof HistoryResponse>;

