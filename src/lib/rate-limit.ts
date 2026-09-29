/**
 * Fixed-interface, in-memory sliding-window rate limiter.
 * LIMITATION: state is per server instance. Fine for one VPS/container; on serverless or multiple
 * instances replace `hit` with Redis/Upstash (same signature). Account lockout for login is stored
 * in the database, so it is NOT affected by this limitation.
 */
type Bucket = number[];
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (now - lastSweep > 60_000) {
    for (const [k, v] of buckets) if (v.length === 0 || v[v.length - 1] < now - 3_600_000) buckets.delete(k);
    lastSweep = now;
  }
  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}

/** First hop of x-forwarded-for (set by the trusted platform proxy) → real client IP. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
