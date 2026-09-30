import { z } from "zod";
import { IsoTimestamp, MetricSchema } from "./common";

export const WatchlistItemSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  addedAt: IsoTimestamp,
  price: MetricSchema,
  dailyChange: MetricSchema,
});
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

export const WatchlistResponse = z.array(WatchlistItemSchema);
export const WatchlistRemoveResponse = z.object({ ticker: z.string(), removed: z.literal(true) });
