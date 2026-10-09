import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/* ---------- passwords (scrypt, per-user salt) ---------- */

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Burn comparable CPU when the user doesn't exist, so response time doesn't reveal valid usernames. */
const DUMMY = hashPassword('not-a-real-password');
export const verifyDummy = (password: string) => verifyPassword(password, DUMMY);

/* ---------- opaque tokens ---------- */

export const newToken = (): string => randomBytes(32).toString('base64url');
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
export const hmacHex = (secret: string, value: string): string =>
  createHmac('sha256', secret).update(value).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Per-order status token: recomputable from the order id, so it never needs to be stored. */
export const orderToken = (secret: string, orderId: string): string => hmacHex(secret, `order:${orderId}`).slice(0, 32);

/* ---------- rate limiting (fixed window, in-memory) ---------- */

/**
 * In-memory limiter: correct for a single process. Behind several instances, replace with a shared
 * store (e.g. Redis) or enforce limits at the reverse proxy.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit: number, windowMs: number, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      if (this.hits.size > 10_000) this.prune(now);
      return { allowed: true, retryAfterSec: 0 };
    }
    entry.count += 1;
    return { allowed: entry.count <= limit, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

/* ---------- log hygiene ---------- */

/**
 * Make an error message safe to store/show: strips configured secrets, bearer tokens, long opaque tokens and
 * phone-number-like digit runs, then truncates. Providers sometimes echo credentials or recipients back in errors.
 */
export function sanitizeError(err: unknown, secrets: readonly string[] = [], max = 300): string {
  let text = err instanceof Error ? err.message : String(err);
  for (const s of secrets) if (s) text = text.split(s).join('[redacted]');
  text = text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]');
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export const uid = (prefix: string): string => `${prefix}_${randomBytes(9).toString('base64url')}`;
