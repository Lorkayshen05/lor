import type { z } from "zod";
import type { ScreenerQuery, ScreenerRow, ScreenerResponse } from "../contracts/screener";
import { decodeCursor, encodeCursor, fingerprint } from "../lib/cursor";
import { metric } from "../lib/metric";
import { result, type Result } from "./result";
import type { UniverseRow, UniverseService } from "./universe";

type Resp = z.infer<typeof ScreenerResponse>;

const toRow = (r: UniverseRow): ScreenerRow => {
  const m = r.asOf;
  const f = r.fundamentalsAsOf ?? r.asOf;
  return {
    ticker: r.ticker,
    name: r.name,
    sector: r.sector,
    industry: r.industry,
    price: metric(r.price, { asOf: m, type: "actual", currency: "USD", unit: "per_share" }),
    dailyChange: metric(r.dailyChange, { asOf: m, type: "calculated", unit: "ratio", period: "1d" }),
    marketCap: metric(r.marketCap, { asOf: m, type: "calculated", currency: "USD" }),
    revenueGrowth: metric(r.revenueGrowth, { asOf: f, type: "calculated", unit: "ratio", period: "TTM" }),
    operatingMargin: metric(r.operatingMargin, { asOf: f, type: "calculated", unit: "ratio", period: "TTM" }),
    roic: metric(r.roic, { asOf: f, type: "calculated", unit: "ratio", period: "TTM" }),
    pe: metric(r.pe, { asOf: m, type: "calculated", unit: "x", period: "TTM" }),
    fcfYield: metric(r.fcfYield, { asOf: m, type: "calculated", unit: "ratio", period: "TTM" }),
  };
};

const ci = (a: string | null, b: string) => a !== null && a.toLowerCase() === b.toLowerCase();

/** Filters use `null` = unknown → row excluded whenever a filter on that field is present. */
export function applyFilters(rows: UniverseRow[], q: ScreenerQuery): UniverseRow[] {
  const min = (v: number | null, lo: number | undefined) => lo === undefined || (v !== null && v >= lo);
  const max = (v: number | null, hi: number | undefined) => hi === undefined || (v !== null && v <= hi);
  return rows.filter(
    (r) =>
      (q.sector === undefined || ci(r.sector, q.sector)) &&
      (q.industry === undefined || ci(r.industry, q.industry)) &&
      min(r.marketCap, q.marketCapMin) && max(r.marketCap, q.marketCapMax) &&
      min(r.revenueGrowth, q.revenueGrowthMin) &&
      min(r.operatingMargin, q.operatingMarginMin) &&
      min(r.roic, q.roicMin) &&
      min(r.pe, q.peMin) && max(r.pe, q.peMax) &&
      min(r.fcfYield, q.fcfYieldMin) &&
      min(r.dividendYield, q.dividendYieldMin),
  );
}

export class ScreenerService {
  constructor(private readonly universe: UniverseService) {}

  async run(q: ScreenerQuery): Promise<Result<Resp>> {
    const snap = await this.universe.snapshot();
    const filtered = applyFilters(snap.rows, q);
    const dir = q.order === "asc" ? 1 : -1;
    const key = q.sort === "ticker" ? null : q.sort;
    filtered.sort((a, b) => {
      if (key === null) return dir * a.ticker.localeCompare(b.ticker);
      const x = a[key];
      const y = b[key];
      if (x === null && y === null) return a.ticker.localeCompare(b.ticker);
      if (x === null) return 1; // nulls always last
      if (y === null) return -1;
      return x === y ? a.ticker.localeCompare(b.ticker) : dir * (x < y ? -1 : 1);
    });
    const { limit, cursor, ...filters } = q;
    const fp = fingerprint(filters);
    const offset = decodeCursor(cursor, fp);
    const page = filtered.slice(offset, offset + limit);
    const next = offset + limit < filtered.length ? encodeCursor(offset + limit, fp) : undefined;
    return result(
      { items: page.map(toRow), meta: { count: page.length, total: filtered.length, ...(next ? { nextCursor: next } : {}) } },
      { asOf: snap.asOf, source: snap.sources, stale: snap.stale, ...(next ? { nextCursor: next } : {}) },
    );
  }
}
