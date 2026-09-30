import type { StoredAnalysis } from "../contracts/analysis";

export interface AnalysisRepository {
  /** Returns Zod-validated stored analysis, or null when none exists. */
  get(ticker: string): Promise<StoredAnalysis | null>;
}

export interface WatchlistEntry {
  ticker: string;
  addedAt: string;
}

export interface WatchlistRepository {
  list(userId: string): Promise<WatchlistEntry[]>;
  /** Returns the created entry, or null if the ticker was already present. */
  add(userId: string, ticker: string, addedAt: string): Promise<WatchlistEntry | null>;
  /** True if something was removed. */
  remove(userId: string, ticker: string): Promise<boolean>;
}
