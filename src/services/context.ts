import type { Cache } from "../cache/cache";
import type { Clock } from "../lib/clock";
import type { Providers } from "../providers/interfaces";
import type { AnalysisRepository } from "../store/repositories";
import type { WatchlistRepository } from "../store/repositories";

export interface ServiceConfig {
  /** Hostnames whose articles are considered credible enough to show. */
  credibleNewsDomains: string[];
}

export interface Ctx {
  providers: Providers;
  cache: Cache;
  clock: Clock;
  config: ServiceConfig;
  analysisRepo: AnalysisRepository;
  watchlistRepo: WatchlistRepository;
}
