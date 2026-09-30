import type { WatchlistItem } from "../contracts/watchlist";
import { conflict, notFound } from "../lib/errors";
import { metric } from "../lib/metric";
import type { Clock } from "../lib/clock";
import { iso } from "../lib/clock";
import type { WatchlistRepository } from "../store/repositories";
import type { Gateway } from "./gateway";
import { result, type Result } from "./result";

const MAX_ITEMS = 100;

export class WatchlistService {
  constructor(
    private readonly repo: WatchlistRepository,
    private readonly gw: Gateway,
    private readonly clock: Clock,
  ) {}

  private async hydrate(entries: Array<{ ticker: string; addedAt: string }>): Promise<{ items: WatchlistItem[]; stale: boolean }> {
    const tickers = entries.map((e) => e.ticker);
    const [quotes, profiles] = await Promise.all([this.gw.quotes(tickers), Promise.all(tickers.map((t) => this.gw.profile(t)))]);
    const now = iso(this.clock.now());
    let stale = false;
    const items = entries.map((e, i): WatchlistItem => {
      const q = quotes.get(e.ticker);
      stale ||= q?.stale ?? false;
      const d = q?.value;
      const change = d?.previousClose ? d.price / d.previousClose - 1 : null;
      const asOf = d?.asOf ?? now;
      return {
        ticker: e.ticker,
        name: profiles[i]?.value?.name ?? e.ticker,
        addedAt: e.addedAt,
        price: metric(d?.price ?? null, { asOf, type: "actual", currency: "USD", unit: "per_share", ...(d ? { source: d.source } : {}) }),
        dailyChange: metric(change, { asOf, type: "calculated", unit: "ratio", period: "1d", ...(d ? { source: d.source } : {}) }),
      };
    });
    return { items, stale };
  }

  async list(userId: string): Promise<Result<WatchlistItem[]>> {
    const { items, stale } = await this.hydrate(await this.repo.list(userId));
    return result(items, { asOf: iso(this.clock.now()), source: "watchlist", stale });
  }

  async add(userId: string, ticker: string): Promise<Result<WatchlistItem>> {
    const p = await this.gw.profile(ticker);
    if (!p.value) throw notFound(`Unknown ticker ${ticker}`);
    if ((await this.repo.list(userId)).length >= MAX_ITEMS) throw conflict(`Watchlist is limited to ${MAX_ITEMS} tickers`);
    const entry = await this.repo.add(userId, ticker, iso(this.clock.now()));
    if (!entry) throw conflict(`${ticker} is already on the watchlist`);
    const { items, stale } = await this.hydrate([entry]);
    return result(items[0]!, { asOf: iso(this.clock.now()), stale });
  }

  async remove(userId: string, ticker: string): Promise<Result<{ ticker: string; removed: true }>> {
    if (!(await this.repo.remove(userId, ticker))) throw notFound(`${ticker} is not on the watchlist`);
    return result({ ticker, removed: true as const }, { asOf: iso(this.clock.now()) });
  }
}
