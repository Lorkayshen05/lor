import type { Article } from "../contracts/news";
import { notFound } from "../lib/errors";
import type { Ctx } from "./context";
import type { Gateway } from "./gateway";
import { result, type Result } from "./result";

export const isCredible = (url: string, domains: string[]): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

export const DEFAULT_CREDIBLE_DOMAINS = [
  "reuters.com", "bloomberg.com", "wsj.com", "ft.com", "cnbc.com", "apnews.com", "barrons.com",
  "sec.gov", "businesswire.com", "prnewswire.com", "globenewswire.com",
  // synthetic sources used by the mock provider
  "mock-wire.example.com",
];

export class NewsService {
  constructor(
    private readonly ctx: Ctx,
    private readonly gw: Gateway,
  ) {}

  /**
   * Credible sources only: articles from unlisted domains are dropped, so a page
   * may hold fewer than `limit` items; follow `nextCursor` for more.
   */
  async news(ticker: string, limit: number, cursor?: string): Promise<Result<{ articles: Article[] }>> {
    const profile = await this.gw.profile(ticker);
    if (!profile.value) throw notFound(`Unknown ticker ${ticker}`);
    const c = await this.gw.news(ticker, limit, cursor);
    const seen = new Set<string>();
    const articles = c.value.articles
      .filter((a) => isCredible(a.url, this.ctx.config.credibleNewsDomains))
      .filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return result({ articles }, { asOf: c.value.asOf, source: "news", stale: c.stale, ...(c.value.nextCursor ? { nextCursor: c.value.nextCursor } : {}) });
  }
}
