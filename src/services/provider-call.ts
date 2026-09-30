import type { z } from "zod";
import { ProviderError } from "../lib/errors";

export interface CallOptions {
  timeoutMs?: number;
  /** Extra attempts after the first for upstream/unavailable failures (never for invalid data). */
  retries?: number;
}

/**
 * Single choke point for provider calls: timeout, bounded retry, and Zod
 * validation of whatever the adapter returned. Malformed data is rejected here
 * and never reaches services or the frontend.
 */
export async function callProvider<S extends z.ZodType>(
  provider: string,
  schema: S,
  fn: () => Promise<unknown>,
  opts: CallOptions = {},
): Promise<z.infer<S>> {
  const { timeoutMs = 8000, retries = 1 } = opts;
  let last: ProviderError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let timer: NodeJS.Timeout | undefined;
    try {
      const raw = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new ProviderError("unavailable", provider, `timeout after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new ProviderError("invalid", provider, `malformed response: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      }
      return parsed.data;
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError("upstream", provider, e instanceof Error ? e.message : String(e));
      if (err.kind === "invalid") throw err;
      last = err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw last!;
}
