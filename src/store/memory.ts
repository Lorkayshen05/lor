import { StoredAnalysisSchema, type StoredAnalysis } from "../contracts/analysis";
import { ANALYSIS_FIXTURES } from "./analysis-fixtures";
import type { AnalysisRepository, WatchlistEntry, WatchlistRepository } from "./repositories";

export class MemoryAnalysisRepository implements AnalysisRepository {
  private readonly byTicker: Map<string, StoredAnalysis>;
  /** Stored data is validated on load, like provider data. */
  constructor(rows: unknown[] = ANALYSIS_FIXTURES) {
    this.byTicker = new Map(rows.map((r) => StoredAnalysisSchema.parse(r)).map((r) => [r.ticker, r]));
  }
  async get(ticker: string) {
    return this.byTicker.get(ticker) ?? null;
  }
}

export class MemoryWatchlistRepository implements WatchlistRepository {
  private readonly data = new Map<string, WatchlistEntry[]>();
  async list(userId: string) {
    return [...(this.data.get(userId) ?? [])];
  }
  async add(userId: string, ticker: string, addedAt: string) {
    const list = this.data.get(userId) ?? [];
    if (list.some((e) => e.ticker === ticker)) return null;
    const entry = { ticker, addedAt };
    this.data.set(userId, [...list, entry]);
    return entry;
  }
  async remove(userId: string, ticker: string) {
    const list = this.data.get(userId) ?? [];
    const next = list.filter((e) => e.ticker !== ticker);
    this.data.set(userId, next);
    return next.length !== list.length;
  }
}
