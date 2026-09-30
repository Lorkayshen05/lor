import type { HistoryInterval, HistoryRange } from "../contracts/market";
import type {
  ConstituentsDto,
  EarningsDto,
  EstimatesDto,
  HistoryDto,
  IndexQuoteDto,
  NewsPageDto,
  ProfileDto,
  QuoteDto,
  StatementsDto,
} from "./types";

/**
 * Provider contracts. Implementations live in their own adapter folder and are
 * the only code that knows a vendor's URL, auth, wire format or rate limits.
 * Not-found is expressed as `null` / an omitted entry; failures are thrown
 * (the service layer converts them into 502/503).
 */
export interface MarketDataProvider {
  readonly name: string;
  /** Batch quote lookup. Unknown tickers are simply absent from the result. */
  getQuotes(tickers: string[]): Promise<QuoteDto[]>;
  getHistory(ticker: string, range: HistoryRange, interval: HistoryInterval): Promise<HistoryDto | null>;
}

export interface FundamentalsProvider {
  readonly name: string;
  listProfiles(): Promise<ProfileDto[]>;
  getProfile(ticker: string): Promise<ProfileDto | null>;
  /** `count` = number of most recent periods wanted. */
  getStatements(ticker: string, opts: { period: "annual" | "quarterly"; count: number }): Promise<StatementsDto | null>;
  getEarnings(ticker: string, count: number): Promise<EarningsDto | null>;
}

export interface EstimatesProvider {
  readonly name: string;
  getEstimates(ticker: string): Promise<EstimatesDto | null>;
}

export interface NewsProvider {
  readonly name: string;
  getNews(ticker: string, opts: { limit: number; cursor?: string }): Promise<NewsPageDto>;
}

export interface IndexProvider {
  readonly name: string;
  getSp500Constituents(): Promise<ConstituentsDto>;
  getSp500Quote(): Promise<IndexQuoteDto>;
}

export interface Providers {
  market: MarketDataProvider;
  fundamentals: FundamentalsProvider;
  estimates: EstimatesProvider;
  news: NewsProvider;
  index: IndexProvider;
}
