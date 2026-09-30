import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { ErrorCode, MetaSchema, envelope, type ErrorEnvelope } from "../contracts/common";
import { ApiError, ProviderError, badRequest, providerToApiError, rateLimited, unauthorized } from "../lib/errors";
import type { Services } from "../services";
import { NoParams, type AnyRoute } from "./route";
import { buildRoutes } from "./routes";

export interface AppOptions {
  logger?: boolean | { level: string };
  /** token → userId, for /watchlist. Empty = watchlist always 401. */
  authTokens?: Map<string, string>;
  /** Requests per minute per client IP. 0 disables. */
  rateLimitPerMinute?: number;
  /** Allowed browser origins for CORS. */
  corsOrigins?: string[];
}

const PREFIX = "/api/v1";

function errorEnvelope(code: ErrorCode, message: string): ErrorEnvelope {
  return { data: null, error: { code, message } };
}

const parseOr400 = <S extends z.ZodType>(schema: S, value: unknown, what: string): z.output<S> => {
  const r = schema.safeParse(value ?? {});
  if (!r.success) {
    const msg = r.error.issues.slice(0, 5).map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
    throw badRequest(`Invalid ${what}: ${msg}`);
  }
  return r.data;
};

export function buildApp(services: Services, opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });
  const tokens = opts.authTokens ?? new Map<string, string>();
  const routes = buildRoutes(services);

  // ── CORS (allow-list) ──
  const origins = new Set(opts.corsOrigins ?? []);
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && origins.has(origin)) {
      reply.header("access-control-allow-origin", origin).header("vary", "Origin");
      if (req.method === "OPTIONS") {
        reply.header("access-control-allow-methods", "GET,POST,DELETE").header("access-control-allow-headers", "authorization,content-type");
        return reply.code(204).send();
      }
    }
  });

  // ── rate limiting (fixed window, in-memory; put a shared store behind this for multi-instance) ──
  const limit = opts.rateLimitPerMinute ?? 600;
  const windows = new Map<string, { start: number; count: number }>();
  app.addHook("onRequest", async (req, reply) => {
    if (limit <= 0) return;
    const now = services.ctx.clock.now();
    const w = windows.get(req.ip);
    const cur = !w || now - w.start >= 60_000 ? { start: now, count: 0 } : w;
    cur.count++;
    windows.set(req.ip, cur);
    reply.header("x-ratelimit-limit", String(limit)).header("x-ratelimit-remaining", String(Math.max(0, limit - cur.count)));
    if (cur.count > limit) {
      reply.header("retry-after", String(Math.ceil((cur.start + 60_000 - now) / 1000)));
      throw rateLimited();
    }
  });

  app.addHook("onSend", async (_req, reply) => {
    reply.header("x-content-type-options", "nosniff");
  });

  // ── errors: one envelope, never internals ──
  app.setErrorHandler((err: unknown, req: FastifyRequest, reply: FastifyReply) => {
    let api: ApiError;
    if (err instanceof ApiError) api = err;
    else if (err instanceof ProviderError) {
      req.log.error({ provider: err.provider, kind: err.kind, detail: err.detail }, "provider failure");
      api = providerToApiError(err);
    } else if (typeof err === "object" && err !== null && "statusCode" in err && (err as { statusCode: number }).statusCode < 500) {
      // fastify-level client errors (bad JSON body, payload too large, …)
      api = badRequest("Malformed request");
    } else {
      req.log.error({ err }, "unhandled error");
      api = new ApiError(500, "INTERNAL_ERROR", "Internal error");
    }
    reply.code(api.status).type("application/json").send(errorEnvelope(api.code, api.message));
  });
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).type("application/json").send(errorEnvelope("NOT_FOUND", `No route for ${req.method} ${req.url.split("?")[0]}`));
  });

  const Envelope = (schema: z.ZodType) => envelope(schema);

  function authenticate(req: FastifyRequest): string {
    const h = req.headers.authorization;
    const m = h ? /^Bearer\s+(\S+)$/i.exec(h) : null;
    const user = m ? tokens.get(m[1]!) : undefined;
    if (!user) throw unauthorized();
    return user;
  }

  for (const spec of routes) {
    const responseSchema = Envelope(spec.response);
    app.route({
      method: spec.method,
      url: PREFIX + spec.path,
      handler: async (req, reply) => {
        const userId = spec.auth ? authenticate(req) : "";
        const params = parseOr400(spec.params ?? NoParams, req.params, "path parameters");
        const query = parseOr400(spec.query ?? NoParams, req.query, "query parameters");
        const out = await spec.handler({ params, query, userId });
        // Outbound contract check. What is sent is the *parsed* value, so undeclared fields cannot leak.
        const parsed = responseSchema.safeParse({ data: out.data, meta: MetaSchema.parse(out.meta) });
        if (!parsed.success) {
          req.log.error({ path: spec.path, issues: parsed.error.issues.slice(0, 5) }, "response failed contract validation");
          throw new ApiError(500, "INTERNAL_ERROR", "Internal error");
        }
        reply
          .code(spec.status ?? 200)
          .type("application/json")
          .header("cache-control", spec.auth ? "private, no-store" : `public, max-age=${spec.clientMaxAge ?? 0}`)
          .send(parsed.data);
      },
    });
  }

  // Endpoint index: discoverability for the frontend team.
  app.get(PREFIX, async (_req, reply) => {
    reply.type("application/json").send({
      data: routes.map((r) => ({ method: r.method, path: PREFIX + r.path, summary: r.summary, auth: r.auth ?? false })),
    });
  });

  return app;
}
