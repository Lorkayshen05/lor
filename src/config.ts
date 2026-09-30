import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** Which provider adapter set to load. Only "mock" ships today; add real adapters in src/providers/. */
  PROVIDERS: z.enum(["mock"]).default("mock"),
  /** postgres:// or Supabase connection string. Unset = in-memory watchlist/analysis. */
  DATABASE_URL: z.string().optional(),
  /** "token:userId,token2:userId2" — static bearer tokens for /watchlist. Never commit real ones. */
  AUTH_TOKENS: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(600),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const e = Env.parse(env);
  const tokens = new Map<string, string>();
  for (const pair of (e.AUTH_TOKENS ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const i = pair.indexOf(":");
    if (i > 0) tokens.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return {
    port: e.PORT,
    host: e.HOST,
    logLevel: e.LOG_LEVEL,
    providers: e.PROVIDERS,
    databaseUrl: e.DATABASE_URL,
    authTokens: tokens,
    corsOrigins: (e.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
  };
}
