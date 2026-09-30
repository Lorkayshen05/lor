import { z } from "zod";
import { TTL, type Cached } from "../cache/cache";
import type { HistoryInterval, HistoryRange } from "../contracts/market";
import { callProvider } from "./provider-call";
import type { Ctx } from "./context";
import {
  ConstituentsDto,
  EarningsDto,
  EstimatesDto,
  HistoryDto,
  IndexQuoteDto,
  NewsPageDto,
  ProfileDto,
  QuoteDto,
  StatementsDto,
} from "../providers/types";

/**
 * Cached, validated access to every provider. Services never call providers
 * directly, so caching, dedupe, timeouts and validation apply uniformly.
 */
export class Gateway {
  constructor(private readonly ctx: Ctx) {}
  private get p() {
    return this.ctx.providers;
  }
  private get cache() {
    return this.ctx.cache;
  }

  quotes(tickers: string[]): Promise<Map<string, Cached<QuoteDto>>> {
    return this.cache.loadMany(
      tickers,
      (t) => `quote:${t}`,
      TTL.quote,
      async (missing) => {
        const list = await callProvider(this.p.market.name, z.array(QuoteDto), () => this.p.market.getQuotes(missing));
        return new Map(list.map((q) => [q.ticker, q]));
      },
    );
  }

  async quote(ticker: string): Promise<Cached<QuoteDto> | null> {
    return (await this.quotes([ticker])).get(ticker) ?? null;
  }

  history(ticker: string, range: HistoryRange, interval: HistoryInterval): Promise<Cached<HistoryDto | null>> {
    const intraday = ["1m", "5m", "1h"].includes(interval);
    return this.cache.load(`history:${ticker}:${range}:${interval}`, intraday ? TTL.intradayHistory : TTL.dailyHistory, () =>
      callProvider(this.p.market.name, HistoryDto.nullable(), () => this.p.market.getHistory(ticker, range, interval)),
    );
  }

  profiles(): Promise<Cached<ProfileDto[]>> {
    return this.cache.load("profiles", TTL.profile, () =>
      callProvider(this.p.fundamentals.name, z.array(ProfileDto), () => this.p.fundamentals.listProfiles()),
    );
  }

  profile(ticker: string): Promise<Cached<ProfileDto | null>> {
    return this.cache.load(`profile:${ticker}`, TTL.profile, () =>
      callProvider(this.p.fundamentals.name, ProfileDto.nullable(), () => this.p.fundamentals.getProfile(ticker)),
    );
  }

  statements(ticker: string, period: "annual" | "quarterly", count: number): Promise<Cached<StatementsDto | null>> {
    return this.cache.load(`statements:${ticker}:${period}:${count}`, TTL.statements, () =>
      callProvider(this.p.fundamentals.name, StatementsDto.nullable(), () => this.p.fundamentals.getStatements(ticker, { period, count })),
    );
  }

  earnings(ticker: string, count: number): Promise<Cached<EarningsDto | null>> {
    return this.cache.load(`earnings:${ticker}:${count}`, TTL.earnings, () =>
      callProvider(this.p.fundamentals.name, EarningsDto.nullable(), () => this.p.fundamentals.getEarnings(ticker, count)),
    );
  }

  estimates(ticker: string): Promise<Cached<EstimatesDto | null>> {
    return this.cache.load(`estimates:${ticker}`, TTL.estimates, () =>
      callProvider(this.p.estimates.name, EstimatesDto.nullable(), () => this.p.estimates.getEstimates(ticker)),
    );
  }

  news(ticker: string, limit: number, cursor?: string): Promise<Cached<NewsPageDto>> {
    return this.cache.load(`news:${ticker}:${limit}:${cursor ?? ""}`, TTL.news, () =>
      callProvider(this.p.news.name, NewsPageDto, () => this.p.news.getNews(ticker, { limit, ...(cursor ? { cursor } : {}) })),
    );
  }

  constituents(): Promise<Cached<ConstituentsDto>> {
    return this.cache.load("index:sp500:constituents", TTL.constituents, () =>
      callProvider(this.p.index.name, ConstituentsDto, () => this.p.index.getSp500Constituents()),
    );
  }

  indexQuote(): Promise<Cached<IndexQuoteDto>> {
    return this.cache.load("index:sp500:quote", TTL.marketSummary, () =>
      callProvider(this.p.index.name, IndexQuoteDto, () => this.p.index.getSp500Quote()),
    );
  }
}
