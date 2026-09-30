import type { Analysis, StoredAnalysis } from "../contracts/analysis";
import type { Source } from "../contracts/common";
import { notFound } from "../lib/errors";
import { metric, uniqueSources } from "../lib/metric";
import type { CoreService } from "./core";
import type { Ctx } from "./context";
import { result, type Result } from "./result";
import type { ValuationService } from "./valuation";

type Scenario = Analysis["scenarios"]["base"];

/** Every sourceId used anywhere must resolve; a dangling reference is a data bug, never shipped. */
export function assertTraceable(a: StoredAnalysis): void {
  const known = new Set(a.sources.map((s) => s.id));
  const ids = [
    ...a.businessModel.sourceIds,
    ...a.moat.flatMap((m) => m.sourceIds),
    ...a.risks.flatMap((r) => r.sourceIds),
    ...a.catalysts.flatMap((c) => c.sourceIds),
  ];
  const missing = ids.filter((i) => !known.has(i));
  if (missing.length) throw new Error(`analysis ${a.ticker} references unknown sources: ${[...new Set(missing)].join(", ")}`);
}

const SCENARIOS = {
  bull: { epsVsConsensus: 0.1, multipleVsPeers: 0.15, description: "Earnings beat consensus and the market pays a premium to the peer multiple." },
  base: { epsVsConsensus: 0, multipleVsPeers: 0, description: "Consensus earnings valued at the peer-median forward multiple." },
  bear: { epsVsConsensus: -0.15, multipleVsPeers: -0.2, description: "Earnings miss consensus and the multiple compresses below peers." },
} as const;

export class AnalysisService {
  constructor(
    private readonly ctx: Ctx,
    private readonly core: CoreService,
    private readonly valuation: ValuationService,
  ) {}

  async get(ticker: string): Promise<Result<Analysis>> {
    const c = await this.core.get(ticker);
    const stored = await this.ctx.analysisRepo.get(ticker);
    if (!stored) throw notFound(`No analysis available for ${ticker}`);
    assertTraceable(stored);

    const val = await this.valuation.get(ticker);
    const peerFwd = val.data.peerMedian.forwardPe.value;
    const baseMultiple = peerFwd ?? c.forwardPe;

    const mkt: Source = c.sources.market;
    const est = c.sources.estimates;
    const sourceIds = [mkt.id, ...(est ? [est.id] : [])];
    const asOf = c.asOf;

    const scenario = (label: keyof typeof SCENARIOS): Scenario => {
      const s = SCENARIOS[label];
      const eps = c.forwardEps === null ? null : c.forwardEps * (1 + s.epsVsConsensus);
      const mult = baseMultiple === null ? null : baseMultiple * (1 + s.multipleVsPeers);
      const implied = eps !== null && mult !== null && eps > 0 ? eps * mult : null;
      const calc = { asOf, type: "calculated" as const, ...(est ? { source: est } : { source: mkt }) };
      return {
        label,
        description: s.description,
        assumptions: { epsVsConsensus: s.epsVsConsensus, multipleVsPeers: s.multipleVsPeers },
        targetEps: metric(eps, { ...calc, currency: "USD", unit: "per_share", ...(c.forwardPeriod ? { period: c.forwardPeriod } : {}) }),
        targetMultiple: metric(mult, { ...calc, unit: "x" }),
        impliedPrice: metric(implied, { ...calc, currency: "USD", unit: "per_share" }),
        upside: metric(implied === null ? null : implied / c.price - 1, { ...calc, unit: "ratio" }),
        sourceIds,
      };
    };

    const data: Analysis = {
      businessModel: stored.businessModel,
      moat: stored.moat,
      risks: stored.risks,
      catalysts: stored.catalysts,
      scenarios: { bull: scenario("bull"), base: scenario("base"), bear: scenario("bear") },
      sources: uniqueSources([...stored.sources, mkt, est ?? undefined]),
    };
    return result(data, { asOf, source: "analysis", stale: c.stale || val.meta.stale === true });
  }
}
