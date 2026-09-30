import { z } from "zod";
import { Limit, MetricSchema } from "./common";

const n = z.coerce.number().finite();

export const SCREENER_SORTS = ["marketCap", "revenueGrowth", "roic", "pe", "fcfYield", "operatingMargin", "dailyChange", "ticker"] as const;

export const ScreenerQuery = z
  .object({
    sector: z.string().trim().min(1).optional(),
    industry: z.string().trim().min(1).optional(),
    marketCapMin: n.optional(),
    marketCapMax: n.optional(),
    revenueGrowthMin: n.optional(),
    operatingMarginMin: n.optional(),
    roicMin: n.optional(),
    peMin: n.optional(),
    peMax: n.optional(),
    fcfYieldMin: n.optional(),
    dividendYieldMin: n.optional(),
    sort: z.enum(SCREENER_SORTS).default("marketCap"),
    order: z.enum(["asc", "desc"]).default("desc"),
    limit: Limit(50, 200),
    cursor: z.string().max(200).optional(),
  })
  .strict()
  .refine((q) => q.marketCapMin === undefined || q.marketCapMax === undefined || q.marketCapMin <= q.marketCapMax, {
    message: "marketCapMin must be <= marketCapMax",
    path: ["marketCapMin"],
  })
  .refine((q) => q.peMin === undefined || q.peMax === undefined || q.peMin <= q.peMax, {
    message: "peMin must be <= peMax",
    path: ["peMin"],
  });
export type ScreenerQuery = z.infer<typeof ScreenerQuery>;

/** Only what the table renders; per-metric `source` is omitted (see envelope meta.source). */
export const ScreenerRowSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  price: MetricSchema,
  dailyChange: MetricSchema,
  marketCap: MetricSchema,
  revenueGrowth: MetricSchema,
  operatingMargin: MetricSchema,
  roic: MetricSchema,
  pe: MetricSchema,
  fcfYield: MetricSchema,
});
export type ScreenerRow = z.infer<typeof ScreenerRowSchema>;

export const ScreenerResponse = z.object({
  items: z.array(ScreenerRowSchema),
  meta: z.object({
    count: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    nextCursor: z.string().optional(),
  }),
});
