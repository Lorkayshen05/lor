import { Cache, MemoryBackend, type CacheBackend } from "../cache/cache";
import { systemClock, type Clock } from "../lib/clock";
import type { Providers } from "../providers/interfaces";
import { MemoryAnalysisRepository, MemoryWatchlistRepository } from "../store/memory";
import type { AnalysisRepository, WatchlistRepository } from "../store/repositories";
import { AnalysisService } from "./analysis";
import { CompanyService } from "./company";
import type { Ctx } from "./context";
import { CoreService } from "./core";
import { EarningsService } from "./earnings";
import { FinancialsService } from "./financials";
import { Gateway } from "./gateway";
import { IndexService } from "./index-sector";
import { MarketService } from "./market";
import { DEFAULT_CREDIBLE_DOMAINS, NewsService } from "./news";
import { PeerService } from "./peers";
import { ScreenerService } from "./screener";
import { UniverseService } from "./universe";
import { ValuationService } from "./valuation";
import { WatchlistService } from "./watchlist";

export interface Deps {
  providers: Providers;
  clock?: Clock;
  cacheBackend?: CacheBackend;
  analysisRepo?: AnalysisRepository;
  watchlistRepo?: WatchlistRepository;
  credibleNewsDomains?: string[];
}

export function createServices(deps: Deps) {
  const clock = deps.clock ?? systemClock;
  const ctx: Ctx = {
    providers: deps.providers,
    clock,
    cache: new Cache(deps.cacheBackend ?? new MemoryBackend(clock), clock),
    config: { credibleNewsDomains: deps.credibleNewsDomains ?? DEFAULT_CREDIBLE_DOMAINS },
    analysisRepo: deps.analysisRepo ?? new MemoryAnalysisRepository(),
    watchlistRepo: deps.watchlistRepo ?? new MemoryWatchlistRepository(),
  };
  const gateway = new Gateway(ctx);
  const core = new CoreService(gateway);
  const universe = new UniverseService(ctx, gateway, core);
  const companies = new CompanyService(gateway, core, clock);
  const valuation = new ValuationService(ctx, core, gateway, universe);
  return {
    ctx,
    gateway,
    companies,
    market: new MarketService(core, gateway),
    financials: new FinancialsService(core, gateway),
    valuation,
    peers: new PeerService(universe, companies),
    screener: new ScreenerService(universe),
    earnings: new EarningsService(gateway),
    news: new NewsService(ctx, gateway),
    index: new IndexService(gateway, universe),
    analysis: new AnalysisService(ctx, core, valuation),
    watchlist: new WatchlistService(ctx.watchlistRepo, gateway, clock),
  };
}
export type Services = ReturnType<typeof createServices>;
