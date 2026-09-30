import type { FastifyInstance } from "fastify";
import { buildApp, type AppOptions } from "../src/api/app";
import type { Clock } from "../src/lib/clock";
import { createMockProviders } from "../src/providers/mock";
import type { Providers } from "../src/providers/interfaces";
import { createServices, type Deps } from "../src/services";
import { MetricSchema } from "../src/contracts/common";

/** Wed 2026-09-30 21:30Z: after the US close, so the latest session is complete. */
export const T0 = Date.parse("2026-09-30T21:30:00Z");

export class FakeClock implements Clock {
  constructor(public t = T0) {}
  now() {
    return this.t;
  }
  advance(ms: number) {
    this.t += ms;
  }
}

export const TOKENS = new Map([
  ["tok-alice", "alice"],
  ["tok-bob", "bob"],
]);

export function makeApp(over: { clock?: FakeClock; providers?: (p: Providers) => Providers; deps?: Partial<Deps>; app?: AppOptions } = {}) {
  const clock = over.clock ?? new FakeClock();
  const base = createMockProviders(clock);
  const providers = over.providers ? over.providers(base) : base;
  const services = createServices({ providers, clock, ...over.deps });
  const app: FastifyInstance = buildApp(services, { authTokens: TOKENS, rateLimitPerMinute: 0, ...over.app });
  return { app, clock, services, providers };
}

export async function get(app: FastifyInstance, url: string, headers: Record<string, string> = {}) {
  const res = await app.inject({ method: "GET", url: `/api/v1${url}`, headers });
  return { status: res.statusCode, body: res.json() as any, headers: res.headers };
}

/** Walk any payload and collect everything that looks like a Metric. */
export function collectMetrics(x: unknown, out: any[] = []): any[] {
  if (Array.isArray(x)) x.forEach((v) => collectMetrics(v, out));
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if ("value" in o && "asOf" in o && "type" in o) out.push(o);
    else Object.values(o).forEach((v) => collectMetrics(v, out));
  }
  return out;
}

export function assertMetrics(payload: unknown) {
  const ms = collectMetrics(payload);
  for (const m of ms) MetricSchema.parse(m);
  return ms;
}
