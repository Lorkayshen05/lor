import { z } from "zod";

/** ISO 8601 timestamp, always UTC-offset qualified. */
export const IsoTimestamp = z.iso.datetime({ offset: true });
/** ISO 8601 calendar date (YYYY-MM-DD). */
export const IsoDate = z.iso.date();

export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, "ISO 4217 currency code");

export const SourceType = z.enum(["sec", "company", "market", "news", "analyst", "index"]);

export const SourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.url(),
  publishedAt: IsoTimestamp.optional(),
  accessedAt: IsoTimestamp,
  type: SourceType,
});
export type Source = z.infer<typeof SourceSchema>;

export const MetricType = z.enum(["actual", "estimate", "guidance", "calculated"]);
export type MetricType = z.infer<typeof MetricType>;

/**
 * Units used across the API (documented in README):
 *  - money:      `currency` set (ISO 4217), value in whole currency units
 *  - ratio:      unit "ratio"; 0.10 means 10 % (growth, margins, yields, returns)
 *  - multiple:   unit "x" (P/E, EV/EBITDA, …)
 *  - per share:  unit "per_share" together with `currency`
 *  - counts:     unit "shares" | "count"
 *  - index pts:  unit "points"
 */
export const MetricSchema = z.object({
  value: z.number().finite().nullable(),
  currency: CurrencyCode.optional(),
  unit: z.string().min(1).optional(),
  period: z.string().min(1).optional(),
  asOf: IsoTimestamp,
  type: MetricType,
  source: SourceSchema.optional(),
});
export type Metric = z.infer<typeof MetricSchema>;

export const MetaSchema = z.object({
  asOf: IsoTimestamp.optional(),
  source: z.string().optional(),
  nextCursor: z.string().optional(),
  /** True when the payload was served from cache past its TTL because the provider failed. */
  stale: z.boolean().optional(),
});
export type Meta = z.infer<typeof MetaSchema>;

export const ErrorCode = z.enum([
  "INVALID_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "DATA_PROVIDER_ERROR",
  "SERVICE_UNAVAILABLE",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorBodySchema = z.object({ code: ErrorCode, message: z.string() });

export const ErrorEnvelopeSchema = z.object({
  data: z.null(),
  error: ErrorBodySchema,
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/** Success envelope: `{ data, meta? }`. */
export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ data, meta: MetaSchema.optional() });

export const Ticker = z
  .string()
  .trim()
  .min(1)
  .max(10)
  .regex(/^[A-Za-z][A-Za-z0-9.\-]*$/, "invalid ticker")
  .transform((t) => t.toUpperCase());

export const Limit = (def: number, max: number) =>
  z.coerce.number().int().min(1).max(max).default(def);
