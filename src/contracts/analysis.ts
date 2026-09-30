import { z } from "zod";
import { MetricSchema, SourceSchema } from "./common";

/**
 * Every analytical claim carries `sourceIds` that resolve against
 * `AnalysisResponse.sources`. An item with no source is rejected by the schema.
 */
const SourceIds = z.array(z.string().min(1)).min(1);

export const RiskSchema = z.object({
  id: z.string(),
  category: z.enum(["competition", "regulatory", "macro", "concentration", "execution", "financial", "technology", "other"]),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  sourceIds: SourceIds,
});

export const CatalystSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  direction: z.enum(["positive", "negative", "uncertain"]),
  expectedWindow: z.string().optional(),
  sourceIds: SourceIds,
});

export const MoatSchema = z.object({
  category: z.string(),
  assessment: z.enum(["strong", "moderate", "limited", "unknown"]),
  explanation: z.string(),
  sourceIds: SourceIds,
});

export const ScenarioSchema = z.object({
  label: z.enum(["bull", "base", "bear"]),
  description: z.string(),
  assumptions: z.object({
    epsVsConsensus: z.number(),
    multipleVsPeers: z.number(),
  }),
  targetEps: MetricSchema,
  targetMultiple: MetricSchema,
  impliedPrice: MetricSchema,
  upside: MetricSchema,
  sourceIds: SourceIds,
});

export const AnalysisSchema = z.object({
  businessModel: z.object({
    summary: z.string(),
    revenueStreams: z.array(z.string()),
    customerSegments: z.array(z.string()),
    sourceIds: SourceIds,
  }),
  moat: z.array(MoatSchema),
  risks: z.array(RiskSchema),
  catalysts: z.array(CatalystSchema),
  scenarios: z.object({ bull: ScenarioSchema, base: ScenarioSchema, bear: ScenarioSchema }),
  sources: z.array(SourceSchema),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/** Curated (stored) part of the analysis, validated on load from the store. */
export const StoredAnalysisSchema = z.object({
  ticker: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
  businessModel: AnalysisSchema.shape.businessModel,
  moat: z.array(MoatSchema),
  risks: z.array(RiskSchema),
  catalysts: z.array(CatalystSchema),
  sources: z.array(SourceSchema),
});
export type StoredAnalysis = z.infer<typeof StoredAnalysisSchema>;
