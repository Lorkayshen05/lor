import type { z } from "zod";
import type { PeerMetricsRow, PeersResponse, CompareResponse } from "../contracts/peers";
import { notFound } from "../lib/errors";
import type { CompanyService } from "./company";
import type { UniverseRow, UniverseService } from "./universe";
import { result, type Result } from "./result";

type Peers = z.infer<typeof PeersResponse>;
type Compare = z.infer<typeof CompareResponse>;

export const toPeerMetricsRow = (r: UniverseRow): PeerMetricsRow => ({
  ticker: r.ticker,
  revenueGrowth: r.revenueGrowth,
  epsGrowth: r.epsGrowth,
  grossMargin: r.grossMargin,
  operatingMargin: r.operatingMargin,
  roic: r.roic,
  pe: r.pe,
  evToEbitda: r.evToEbitda,
  fcfYield: r.fcfYield,
  dividendYield: r.dividendYield,
});

/**
 * Peer selection: same industry first, then same sector, closest by market
 * cap (log distance). Deterministic; never includes the subject.
 */
export function selectPeers(rows: UniverseRow[], subject: UniverseRow, limit: number): UniverseRow[] {
  const dist = (r: UniverseRow) =>
    subject.marketCap && r.marketCap ? Math.abs(Math.log(r.marketCap / subject.marketCap)) : Number.POSITIVE_INFINITY;
  const rank = (r: UniverseRow) => (subject.industry && r.industry === subject.industry ? 0 : subject.sector && r.sector === subject.sector ? 1 : 2);
  return rows
    .filter((r) => r.ticker !== subject.ticker && rank(r) < 2)
    .sort((a, b) => rank(a) - rank(b) || dist(a) - dist(b) || a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}

export class PeerService {
  constructor(
    private readonly universe: UniverseService,
    private readonly companies: CompanyService,
  ) {}

  private async profileOf(row: UniverseRow, weights: Map<string, number | null>) {
    const profile = await this.companies.company(row.ticker);
    return { ...profile, ...(weights.get(row.ticker) != null ? { indexWeight: weights.get(row.ticker)! } : {}) };
  }

  async peers(ticker: string, limit: number): Promise<Result<Peers>> {
    const { row, snap } = await this.universe.find(ticker);
    if (!row) throw notFound(`Unknown ticker ${ticker}`);
    const peers = selectPeers(snap.rows, row, limit);
    const weights = await this.companies.weights();
    const companies = await Promise.all(peers.map((p) => this.profileOf(p, weights)));
    return result({ peers: companies, metrics: [row, ...peers].map(toPeerMetricsRow) }, { asOf: snap.asOf, source: snap.sources, stale: snap.stale });
  }

  async compare(tickers: string[]): Promise<Result<Compare>> {
    const unique = [...new Set(tickers)];
    const snap = await this.universe.snapshot();
    const byTicker = new Map(snap.rows.map((r) => [r.ticker, r]));
    const missing = unique.filter((t) => !byTicker.has(t));
    if (missing.length) throw notFound(`Unknown ticker${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
    const weights = await this.companies.weights();
    const rows = unique.map((t) => byTicker.get(t)!);
    const companies = await Promise.all(rows.map((r) => this.profileOf(r, weights)));
    return result({ companies, metrics: rows.map(toPeerMetricsRow) }, { asOf: snap.asOf, source: snap.sources, stale: snap.stale });
  }
}
