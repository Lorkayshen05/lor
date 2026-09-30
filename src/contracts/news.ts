import { z } from "zod";
import { IsoTimestamp, Limit } from "./common";

export const NewsQuery = z
  .object({ limit: Limit(20, 50), cursor: z.string().max(200).optional() })
  .strict();

export const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  publishedAt: IsoTimestamp,
  url: z.url(),
  category: z.string().optional(),
});
export type Article = z.infer<typeof ArticleSchema>;

export const NewsResponse = z.object({ articles: z.array(ArticleSchema) });
