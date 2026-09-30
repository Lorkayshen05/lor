import type { Company, CompanyDetail, CompaniesQuery } from "../contracts/company";
import type { Source } from "../contracts/common";
import { notFound, ProviderError } from "../lib/errors";
import { uniqueSources } from "../lib/metric";
import { decodeCursor, encodeCursor, fingerprint } from "../lib/cursor";
import type { Clock } from "../lib/clock";
import type { ProfileDto } from "../providers/types";
import type { CoreService } from "./core";
import type { Gateway } from "./gateway";
import { financialSnapshot } from "./financials";
import { marketSnapshot } from "./market";
import { result, type Result } from "./result";
import { valuationSnapshot } from "./valuation-snapshot";

export const companyId = (ticker: string) => `cmp_${ticker.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

export function toCompany(p: ProfileDto, weight?: number | null): Company {
  return {
    id: companyId(p.ticker),
    ticker: p.ticker,
    name: p.name,
    exchange: p.exchange,
    ...(p.shareClass ? { shareClass: p.shareClass } : {}),
    ...(p.sector ? { sector: p.sector } : {}),
    ...(p.industry ? { industry: p.industry } : {}),
    ...(p.subIndustry ? { subIndustry: p.subIndustry } : {}),
    ...(weight != null ? { indexWeight: weight } : {}),
    ...(p.website ? { website: p.website } : {}),
    ...(p.investorRelationsUrl ? { investorRelationsUrl: p.investorRelationsUrl } : {}),
    active: p.active,
  };
}

export class CompanyService {
  constructor(
    private readonly gw: Gateway,
    private readonly core: CoreService,
    private readonly clock: Clock,
  ) {}

  /** Index weights are an enrichment; if the index provider is down, companies still render without them. */
  async weights(): Promise<Map<string, number | null>> {
    try {
      const c = await this.gw.constituents();
      return new Map(c.value.constituents.map((x) => [x.ticker, x.weight]));
    } catch (e) {
      if (e instanceof ProviderError) return new Map();
      throw e;
    }
  }

  async list(q: CompaniesQuery): Promise<Result<Company[]>> {
    const [profiles, weights] = await Promise.all([this.gw.profiles(), this.weights()]);
    const search = q.search?.toLowerCase();
    const eq = (a: string | undefined, b: string | undefined) => b === undefined || a?.toLowerCase() === b.toLowerCase();
    const filtered = profiles.value
      .filter((p) => p.active)
      .filter((p) => (q.ticker ? p.ticker === q.ticker : true))
      .filter((p) => eq(p.sector, q.sector) && eq(p.industry, q.industry))
      .filter((p) => !search || p.ticker.toLowerCase().includes(search) || p.name.toLowerCase().includes(search))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
    const fp = fingerprint({ s: q.search, t: q.ticker, se: q.sector, i: q.industry });
    const offset = decodeCursor(q.cursor, fp);
    const page = filtered.slice(offset, offset + q.limit);
    const next = offset + q.limit < filtered.length ? encodeCursor(offset + q.limit, fp) : undefined;
    return result(
      page.map((p) => toCompany(p, weights.get(p.ticker))),
      { asOf: new Date(this.clock.now()).toISOString(), source: "fundamentals", stale: profiles.stale, ...(next ? { nextCursor: next } : {}) },
    );
  }

  async company(ticker: string): Promise<Company> {
    const [p, weights] = await Promise.all([this.gw.profile(ticker), this.weights()]);
    if (!p.value) throw notFound(`Unknown ticker ${ticker}`);
    return toCompany(p.value, weights.get(ticker));
  }

  async detail(ticker: string): Promise<Result<CompanyDetail>> {
    const [c, weights] = await Promise.all([this.core.get(ticker), this.weights()]);
    const company = toCompany(c.profile, weights.get(ticker));
    const ir: Source | undefined = c.profile.investorRelationsUrl
      ? { id: `company-ir-${ticker.toLowerCase()}`, name: `${c.profile.name} investor relations`, url: c.profile.investorRelationsUrl, accessedAt: c.asOf, type: "company" }
      : undefined;
    return result(
      {
        company,
        market: marketSnapshot(c),
        financials: financialSnapshot(c),
        valuation: valuationSnapshot(c),
        sources: uniqueSources([c.sources.market, c.sources.fundamentals ?? undefined, c.sources.estimates ?? undefined, ir]),
      },
      { asOf: c.asOf, source: [c.sources.market.name, c.sources.fundamentals?.name ?? ""].filter(Boolean), stale: c.stale },
    );
  }
}
