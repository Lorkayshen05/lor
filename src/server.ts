import { buildApp } from "./api/app";
import { loadConfig } from "./config";
import { systemClock } from "./lib/clock";
import { createMockProviders } from "./providers/mock";
import { createServices } from "./services";
import { PgAnalysisRepository, PgWatchlistRepository } from "./store/pg";

async function main() {
  const cfg = loadConfig();
  const providers = createMockProviders(systemClock); // swap here for real adapters

  let repos: Parameters<typeof createServices>[0] = { providers };
  if (cfg.databaseUrl) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: cfg.databaseUrl });
    repos = { providers, watchlistRepo: new PgWatchlistRepository(pool), analysisRepo: new PgAnalysisRepository(pool) };
  }

  const app = buildApp(createServices(repos), {
    logger: { level: cfg.logLevel },
    authTokens: cfg.authTokens,
    corsOrigins: cfg.corsOrigins,
    rateLimitPerMinute: cfg.rateLimitPerMinute,
  });
  await app.listen({ port: cfg.port, host: cfg.host });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
