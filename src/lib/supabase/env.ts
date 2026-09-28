const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

/**
 * Falls back to harmless placeholders so client construction never throws
 * during build or static analysis when env vars aren't configured yet.
 * Any real network call made with placeholder values will fail loudly at
 * request time with a clear error, which is surfaced by each route's error
 * boundary instead of crashing the build.
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * postgrest-js retries idempotent (GET) requests up to 3 times with
 * exponential backoff (1s+2s+4s = 7s) on network failure by default. Good
 * for resilience against a real project's transient blips, but it means
 * every page that reads from an unreachable/misconfigured project (or the
 * placeholder URL above) hangs for ~7s before the route's existing error
 * state can render. A hard timeout on top wouldn't help - each attempt
 * already fails in milliseconds; it's the retry loop itself costing the
 * time. Fail fast instead: every route already has a graceful
 * loading/error/empty state to fall back to.
 */
export const SUPABASE_DB_OPTIONS = { retry: false, timeout: 5000 } as const;
