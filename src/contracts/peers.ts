import { z } from "zod";
import { CompanySchema, } from "./company";
import { Limit, Ticker } from "./common";

const num = z.number().nullable().optional();

/** Plain numbers (ratios as fractions, multiples as x) for dense tables. Null = not available. */
export const PeerMetricsRow = z.object({
  ticker: z.string(),
  revenueGrowth: num,
  epsGrowth: num,
  grossMargin: num,
  operatingMargin: num,
  roic: num,
  pe: num,
  evToEbitda: num,
  fcfYield: num,
  dividendYield: num,
});
export type PeerMetricsRow = z.infer<typeof PeerMetricsRow>;

export const PeersQuery = z.object({ limit: Limit(5, 10) }).strict();

/** `metrics[0]` is always the subject ticker, followed by the peers in order. */
export const PeersResponse = z.object({
  peers: z.array(CompanySchema),
  metrics: z.array(PeerMetricsRow),
});

export const CompareQuery = z
  .object({
    tickers: z
      .string()
      .transform((s) => s.split(",").map((t) => t.trim()).filter(Boolean))
      .pipe(z.array(Ticker).min(1).max(5, "at most 5 tickers")),
  })
  .strict();

export const CompareResponse = z.object({
  companies: z.array(CompanySchema),
  metrics: z.array(PeerMetricsRow),
});
