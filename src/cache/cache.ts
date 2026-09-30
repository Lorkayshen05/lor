import type { Clock } from "../lib/clock";

/** Storage backend. Memory today; Redis can implement the same 3 methods (JSON values). */
export interface CacheBackend {
  get(key: string): Promise<{ value: unknown; storedAt: number; expiresAt: number } | undefined>;
  set(key: string, value: unknown, storedAt: number, expiresAt: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export class MemoryBackend implements CacheBackend {
  private map = new Map<string, { value: unknown; storedAt: number; expiresAt: number }>();
  constructor(
    private readonly clock: Clock,
    private readonly maxEntries = 5000,
  ) {}
  async get(key: string) {
    const e = this.map.get(key);
    if (e && e.expiresAt <= this.clock.now()) {
      this.map.delete(key);
      return undefined;
    }
    return e;
  }
  async set(key: string, value: unknown, storedAt: number, expiresAt: number) {
    if (this.map.size >= this.maxEntries && !this.map.has(key)) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.delete(key);
    this.map.set(key, { value, storedAt, expiresAt });
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

export interface Ttl {
  /** Fresh for this long. */
  ttlMs: number;
  /** After ttl, still usable (flagged stale) for this much longer *only if the loader fails*. */
  staleMs: number;
}

/** Business-relevance TTLs (see README). */
const s = 1000, m = 60 * s, h = 60 * m;
export const TTL = {
  quote: { ttlMs: 30 * s, staleMs: 5 * m },
  intradayHistory: { ttlMs: 60 * s, staleMs: 10 * m },
  dailyHistory: { ttlMs: 5 * m, staleMs: 1 * h },
  marketSummary: { ttlMs: 3 * m, staleMs: 30 * m },
  statements: { ttlMs: 12 * h, staleMs: 72 * h },
  profile: { ttlMs: 24 * h, staleMs: 72 * h },
  earnings: { ttlMs: 6 * h, staleMs: 48 * h },
  valuation: { ttlMs: 15 * m, staleMs: 6 * h },
  universe: { ttlMs: 30 * s, staleMs: 10 * m },
  estimates: { ttlMs: 3 * h, staleMs: 24 * h },
  news: { ttlMs: 10 * m, staleMs: 2 * h },
  constituents: { ttlMs: 24 * h, staleMs: 72 * h },
  peers: { ttlMs: 30 * m, staleMs: 6 * h },
  analysis: { ttlMs: 1 * h, staleMs: 24 * h },
} as const satisfies Record<string, Ttl>;

export interface Cached<T> {
  value: T;
  /** True when served past TTL because the loader failed. */
  stale: boolean;
  storedAt: number;
}

/**
 * Read-through cache with request de-duplication (concurrent misses share one
 * loader call) and stale-if-error (bounded, always flagged).
 */
export class Cache {
  private inflight = new Map<string, Promise<unknown>>();
  constructor(
    private readonly backend: CacheBackend,
    private readonly clock: Clock,
  ) {}

  async load<T>(key: string, ttl: Ttl, loader: () => Promise<T>): Promise<Cached<T>> {
    const now = this.clock.now();
    const hit = await this.backend.get(key);
    if (hit && now - hit.storedAt < ttl.ttlMs) return { value: hit.value as T, stale: false, storedAt: hit.storedAt };

    let p = this.inflight.get(key) as Promise<T> | undefined;
    if (!p) {
      p = loader().finally(() => this.inflight.delete(key));
      this.inflight.set(key, p);
    }
    try {
      const value = await p;
      const at = this.clock.now();
      await this.backend.set(key, value, at, at + ttl.ttlMs + ttl.staleMs);
      return { value, stale: false, storedAt: at };
    } catch (err) {
      if (hit) return { value: hit.value as T, stale: true, storedAt: hit.storedAt };
      throw err;
    }
  }

  /**
   * Batch variant: keys already fresh are served from cache, the rest are
   * fetched with ONE `batchLoader` call. `keyOf` maps an item to its id.
   */
  async loadMany<T>(
    ids: string[],
    keyFor: (id: string) => string,
    ttl: Ttl,
    batchLoader: (ids: string[]) => Promise<Map<string, T>>,
  ): Promise<Map<string, Cached<T>>> {
    const out = new Map<string, Cached<T>>();
    const now = this.clock.now();
    const stale = new Map<string, { value: unknown; storedAt: number }>();
    const missing: string[] = [];
    for (const id of ids) {
      const hit = await this.backend.get(keyFor(id));
      if (hit && now - hit.storedAt < ttl.ttlMs) out.set(id, { value: hit.value as T, stale: false, storedAt: hit.storedAt });
      else {
        missing.push(id);
        if (hit) stale.set(id, hit);
      }
    }
    if (missing.length === 0) return out;

    // Share one in-flight batch per set of missing ids.
    const batchKey = `batch:${keyFor("")}:${[...missing].sort().join(",")}`;
    let p = this.inflight.get(batchKey) as Promise<Map<string, T>> | undefined;
    if (!p) {
      p = batchLoader(missing).finally(() => this.inflight.delete(batchKey));
      this.inflight.set(batchKey, p);
    }
    try {
      const fetched = await p;
      const at = this.clock.now();
      for (const [id, value] of fetched) {
        await this.backend.set(keyFor(id), value, at, at + ttl.ttlMs + ttl.staleMs);
        out.set(id, { value, stale: false, storedAt: at });
      }
    } catch (err) {
      if (stale.size === 0) throw err;
    }
    for (const [id, hit] of stale) {
      if (!out.has(id)) out.set(id, { value: hit.value as T, stale: true, storedAt: hit.storedAt });
    }
    return out;
  }
}
