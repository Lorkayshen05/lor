import type { z } from "zod";
import type { ConstituentsResponse, Sp500OverviewSchema, SectorSchema } from "../contracts/index-sector";
import * as F from "../lib/formulas";
import { metric } from "../lib/metric";
import { companyId } from "./company";
import type { Gateway } from "./gateway";
import { result, type Result } from "./result";
import type { UniverseService } from "./universe";

type Constituents = z.infer<typeof ConstituentsResponse>;
type Overview = z.infer<typeof Sp500OverviewSchema>;
type Sector = z.infer<typeof SectorSchema>;

export class IndexService {
  constructor(
    private readonly gw: Gateway,
    private readonly universe: UniverseService,
  ) {}

  async constituents(): Promise<Result<Constituents>> {
    const [c, profiles] = await Promise.all([this.gw.constituents(), this.gw.profiles()]);
    const byTicker = new Map(profiles.value.map((p) => [p.ticker, p]));
    const constituents = c.value.constituents.flatMap((m) => {
      const p = byTicker.get(m.ticker);
      if (!p) return []; // membership without a profile can't be rendered; skip rather than invent fields
      return [{ ticker: m.ticker, companyId: companyId(m.ticker), name: p.name, sector: p.sector ?? "Unclassified", industry: p.industry ?? "Unclassified", ...(m.weight !== null ? { indexWeight: m.weight } : {}) }];
    });
    constituents.sort((a, b) => (b.indexWeight ?? 0) - (a.indexWeight ?? 0) || a.ticker.localeCompare(b.ticker));
    return result({ updatedAt: c.value.updatedAt, constituents }, { asOf: c.value.updatedAt, source: c.value.source.name, stale: c.stale || profiles.stale });
  }

  async overview(): Promise<Result<Overview>> {
    const [q, snap] = await Promise.all([this.gw.indexQuote(), this.universe.snapshot()]);
    const d = q.value;
    const src = d.source;
    const base = { asOf: d.asOf, source: src, unit: "points" };
    const members = snap.rows.filter((r) => r.inIndex && r.dailyChange !== null);
    const data: Overview = {
      level: metric(d.level, { ...base, type: "actual" }),
      dailyChange: metric(d.level / d.previousClose - 1, { asOf: d.asOf, source: src, type: "calculated", unit: "ratio", period: "1d" }),
      ytdReturn: metric(F.growth(d.level, d.priorYearEndLevel), { asOf: d.asOf, source: src, type: "calculated", unit: "ratio", period: "YTD" }),
      fiftyTwoWeekHigh: metric(d.fiftyTwoWeekHigh, { ...base, type: "actual", period: "52w" }),
      fiftyTwoWeekLow: metric(d.fiftyTwoWeekLow, { ...base, type: "actual", period: "52w" }),
      advancers: members.filter((r) => r.dailyChange! > 0).length,
      decliners: members.filter((r) => r.dailyChange! < 0).length,
    };
    return result(data, { asOf: d.asOf, source: src.name, stale: q.stale || snap.stale });
  }

  async sectors(): Promise<Result<Sector[]>> {
    const snap = await this.universe.snapshot();
    const groups = new Map<string, typeof snap.rows>();
    for (const r of snap.rows) {
      if (!r.inIndex || !r.sector) continue;
      groups.set(r.sector, [...(groups.get(r.sector) ?? []), r]);
    }
    const asOf = snap.asOf;
    const data = [...groups].map(([sector, rows]): Sector => {
      const caps = rows.map((r) => r.marketCap).filter((x): x is number => x !== null);
      const ret = rows.map((r) => r.dailyChange);
      return {
        sector,
        companyCount: rows.length,
        marketCap: metric(caps.length ? caps.reduce((a, b) => a + b, 0) : null, { asOf, type: "calculated", currency: "USD" }),
        averageReturn: metric(F.mean(ret), { asOf, type: "calculated", unit: "ratio", period: "1d" }),
        medianReturn: metric(F.median(ret), { asOf, type: "calculated", unit: "ratio", period: "1d" }),
        revenueGrowth: metric(F.median(rows.map((r) => r.revenueGrowth)), { asOf, type: "calculated", unit: "ratio", period: "TTM" }),
        pe: metric(F.median(rows.map((r) => r.pe)), { asOf, type: "calculated", unit: "x", period: "TTM" }),
      };
    });
    data.sort((a, b) => (b.marketCap.value ?? 0) - (a.marketCap.value ?? 0));
    return result(data, { asOf, source: snap.sources, stale: snap.stale });
  }
}
