import { StoredAnalysisSchema, type StoredAnalysis } from "../contracts/analysis";
import type { AnalysisRepository, WatchlistEntry, WatchlistRepository } from "./repositories";

/** Minimal surface of `pg.Pool` (or pg-mem's adapter) that we use. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

export class PgWatchlistRepository implements WatchlistRepository {
  constructor(private readonly db: Queryable) {}

  async list(userId: string): Promise<WatchlistEntry[]> {
    const r = await this.db.query("select ticker, added_at from watchlist_items where user_id = $1 order by added_at, ticker", [userId]);
    return r.rows.map((x) => ({ ticker: String(x.ticker), addedAt: new Date(x.added_at).toISOString() }));
  }

  async add(userId: string, ticker: string, addedAt: string): Promise<WatchlistEntry | null> {
    try {
      await this.db.query("insert into watchlist_items (user_id, ticker, added_at) values ($1, $2, $3)", [userId, ticker, addedAt]);
      return { ticker, addedAt };
    } catch (e) {
      // unique_violation: the (user_id, ticker) primary key is the source of truth, so this is race-safe
      if (typeof e === "object" && e !== null && (e as { code?: string }).code === "23505") return null;
      throw e;
    }
  }

  async remove(userId: string, ticker: string): Promise<boolean> {
    const r = await this.db.query("delete from watchlist_items where user_id = $1 and ticker = $2", [userId, ticker]);
    return (r.rowCount ?? 0) > 0;
  }
}

export class PgAnalysisRepository implements AnalysisRepository {
  constructor(private readonly db: Queryable) {}

  async get(ticker: string): Promise<StoredAnalysis | null> {
    const r = await this.db.query("select body from analyses where ticker = $1", [ticker]);
    const row = r.rows[0];
    if (!row) return null;
    return StoredAnalysisSchema.parse(typeof row.body === "string" ? JSON.parse(row.body) : row.body);
  }
}
