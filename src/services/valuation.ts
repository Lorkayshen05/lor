import { TTL } from "../cache/cache";
import type { Valuation } from "../contracts/valuation";
import { notFound } from "../lib/errors";
import * as F from "../lib/formulas";
import { metric } from "../lib/metric";
import type { Core, CoreService } from "./core";
import type { Ctx } from "./context";
import type { Gateway } from "./gateway";
import { selectPeers } from "./peers";
import { result, type Result } from "./result";
import type { UniverseRow, UniverseService } from "./universe";

type Group = Valuation["sectorMedian"];

export class ValuationService {
  constructor(
    private readonly ctx: Ctx,
    private readonly core: CoreService,
    private readonly gw: Gateway,
    private readonly universe: UniverseService,
  ) {}

  async get(ticker: string): Promise<Result<Valuation>> {
    const c = await this.ctx.cache.load(`valuation:${ticker}`, TTL.valuation, () => this.compute(ticker));
    return { data: c.value.data, meta: { ...c.value.meta, ...(c.stale || c.value.meta.stale ? { stale: true } : {}) } };
  }

  private async compute(ticker: string): Promise<Result<Valuation>> {
    const c = await this.core.get(ticker);
    const { snap } = await this.universe.find(ticker);
    const subject = snap.rows.find((r) => r.ticker === ticker);
    const asOf = c.asOf;
    const fSource = c.sources.fundamentals ?? c.sources.market;
    const calc = { asOf, type: "calculated" as const, source: fSource };
    const mult = (v: number | null, period = "TTM") => metric(v, { ...calc, unit: "x", period });

    const sectorRows = snap.rows.filter((r) => r.inIndex && r.sector !== null && r.sector === c.profile.sector && r.ticker !== ticker);
    const peerRows = subject ? selectPeers(snap.rows, subject, 5) : [];

    const data: Valuation = {
      pe: mult(c.pe),
      forwardPe: metric(c.forwardPe, { asOf, type: "estimate", unit: "x", ...(c.forwardPeriod ? { period: c.forwardPeriod } : {}), source: c.sources.estimates ?? fSource }),
      peg: metric(c.peg, { asOf, type: "estimate", unit: "x", ...(c.sources.estimates ? { source: c.sources.estimates } : { source: fSource }) }),
      pb: mult(c.pb, "latest"),
      ps: mult(c.ps),
      evToEbitda: mult(c.evToEbitda),
      pfcf: mult(c.pfcf),
      fcfYield: metric(c.fcfYield, { ...calc, unit: "ratio", period: "TTM" }),
      historical: await this.historical(ticker, c),
      sectorMedian: this.group("sector", c.profile.sector ?? "Unknown", sectorRows, snap.asOf),
      peerMedian: this.group("peers", `Top ${peerRows.length} peers by industry and size`, peerRows, snap.asOf),
    };
    return result(data, { asOf, source: [c.sources.market.name, fSource.name], stale: c.stale || snap.stale });
  }

  private group(basis: Group["basis"], name: string, rows: UniverseRow[], asOf: string): Group {
    const m = (pick: (r: UniverseRow) => number | null, unit: "x" | "ratio") =>
      metric(F.median(rows.map(pick)), { asOf, type: "calculated", unit, period: "TTM" });
    return {
      basis,
      group: name,
      sampleSize: rows.length,
      pe: m((r) => r.pe, "x"),
      forwardPe: m((r) => r.forwardPe, "x"),
      pb: m((r) => r.pb, "x"),
      ps: m((r) => r.ps, "x"),
      evToEbitda: m((r) => r.evToEbitda, "x"),
      pfcf: m((r) => r.pfcf, "x"),
      fcfYield: m((r) => r.fcfYield, "ratio"),
    };
  }

  /** Multiples at each of the company's last fiscal year-ends, priced from its own weekly history. */
  private async historical(ticker: string, c: Core): Promise<Valuation["historical"]> {
    const [annualC, histC] = await Promise.all([this.gw.statements(ticker, "annual", 6), this.gw.history(ticker, "5y", "1w")]);
    const annual = annualC.value;
    const bars = histC.value?.points ?? [];
    const fx = annual?.fxToUsd ?? c.fxToUsd;
    const pes: number[] = [];
    const evs: number[] = [];
    const fcfs: number[] = [];
    for (const p of annual?.periods ?? []) {
      const end = Date.parse(`${p.periodEnd}T23:59:59Z`);
      const bar = [...bars].reverse().find((b) => Date.parse(b.timestamp) <= end);
      if (!bar || p.dilutedShares === null) continue;
      const mc = bar.close * p.dilutedShares;
      const epsUsd = p.epsDiluted === null ? null : p.epsDiluted * fx;
      const nd = F.netDebt(p.totalDebt, p.cash, p.shortTermInvestments);
      const pe = epsUsd !== null && epsUsd > 0 ? bar.close / epsUsd : null;
      const ev = nd === null ? null : F.multiple(mc + nd * fx, p.ebitda === null ? null : p.ebitda * fx);
      const fcf = F.freeCashFlow(p.operatingCashFlow, p.capex);
      const fy = F.yieldOf(fcf === null ? null : fcf * fx, mc);
      if (pe !== null) pes.push(pe);
      if (ev !== null) evs.push(ev);
      if (fy !== null) fcfs.push(fy);
    }
    const asOf = annual?.asOf ?? c.asOf;
    const source = annual?.source ?? c.sources.market;
    const dist = (sample: number[], current: number | null, unit: "x" | "ratio") => {
      const meta = { asOf, type: "calculated" as const, unit, period: "5y fiscal year-ends", source };
      return {
        low: metric(sample.length ? Math.min(...sample) : null, meta),
        median: metric(F.median(sample), meta),
        high: metric(sample.length ? Math.max(...sample) : null, meta),
        currentPercentile: sample.length >= 3 ? F.percentileRank(current, sample) : null,
        sampleSize: sample.length,
      };
    };
    return {
      window: "5y",
      pe: dist(pes, c.pe, "x"),
      evToEbitda: dist(evs, c.evToEbitda, "x"),
      fcfYield: dist(fcfs, c.fcfYield, "ratio"),
    };
  }
}
