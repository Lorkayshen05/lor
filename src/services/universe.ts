import { TTL } from "../cache/cache";
import { ProviderError } from "../lib/errors";
import type { Ctx } from "./context";
import type { CoreService } from "./core";
import type { Gateway } from "./gateway";

/** Lightweight per-company summary used by screener, peers, compare, sectors. Plain numbers; null = unavailable. */
export interface UniverseRow {
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  inIndex: boolean;
  indexWeight: number | null;
  asOf: string;
  fundamentalsAsOf: string | null;
  reportingCurrency: string;
  price: number;
  dailyChange: number | null;
  marketCap: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  roic: number | null;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  ps: number | null;
  evToEbitda: number | null;
  pfcf: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
}

export interface UniverseSnapshot {
  rows: UniverseRow[];
  asOf: string;
  stale: boolean;
  sources: string[];
}

export class UniverseService {
  constructor(
    private readonly ctx: Ctx,
    private readonly gw: Gateway,
    private readonly core: CoreService,
  ) {}

  async snapshot(): Promise<UniverseSnapshot> {
    const c = await this.ctx.cache.load("universe", TTL.universe, () => this.build());
    return { ...c.value, stale: c.value.stale || c.stale };
  }

  async find(ticker: string): Promise<{ row: UniverseRow | null; snap: UniverseSnapshot }> {
    const snap = await this.snapshot();
    return { row: snap.rows.find((r) => r.ticker === ticker) ?? null, snap };
  }

  private async build(): Promise<UniverseSnapshot> {
    const [profilesC, constC] = await Promise.all([this.gw.profiles(), this.gw.constituents()]);
    const profiles = profilesC.value.filter((p) => p.active);
    const weights = new Map(constC.value.constituents.map((x) => [x.ticker, x.weight]));
    await this.gw.quotes(profiles.map((p) => p.ticker)); // one batched call warms the quote cache

    const settled = await Promise.allSettled(profiles.map((p) => this.core.find(p.ticker)));
    const rows: UniverseRow[] = [];
    let stale = profilesC.stale || constC.stale;
    let firstError: unknown;
    const sources = new Set<string>();
    settled.forEach((s, i) => {
      if (s.status === "rejected") {
        firstError ??= s.reason;
        return;
      }
      const c = s.value;
      const p = profiles[i]!;
      if (!c) return;
      stale ||= c.stale;
      sources.add(c.sources.market.name);
      if (c.sources.fundamentals) sources.add(c.sources.fundamentals.name);
      rows.push({
        ticker: p.ticker,
        name: p.name,
        exchange: p.exchange,
        sector: p.sector ?? null,
        industry: p.industry ?? null,
        inIndex: weights.has(p.ticker),
        indexWeight: weights.get(p.ticker) ?? null,
        asOf: c.asOf,
        fundamentalsAsOf: c.fundamentalsAsOf,
        reportingCurrency: c.reportingCurrency,
        price: c.price,
        dailyChange: c.dailyChange,
        marketCap: c.marketCapUsd,
        revenueGrowth: c.revenueGrowth,
        epsGrowth: c.epsGrowth,
        grossMargin: c.grossMargin,
        operatingMargin: c.operatingMargin,
        roic: c.roic,
        pe: c.pe,
        forwardPe: c.forwardPe,
        pb: c.pb,
        ps: c.ps,
        evToEbitda: c.evToEbitda,
        pfcf: c.pfcf,
        fcfYield: c.fcfYield,
        dividendYield: c.dividendYield,
      });
    });
    if (rows.length === 0 && firstError) throw firstError instanceof ProviderError ? firstError : new ProviderError("upstream", "universe", "no rows could be built");
    // partial failures: serve what we have, flag as stale so consumers know the set is incomplete
    if (firstError) stale = true;
    const asOf = rows.map((r) => r.asOf).sort().at(-1) ?? new Date(this.ctx.clock.now()).toISOString();
    return { rows: rows.sort((a, b) => a.ticker.localeCompare(b.ticker)), asOf, stale, sources: [...sources] };
  }
}
