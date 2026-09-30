import { z } from "zod";
import type { Meta } from "../contracts/common";
import type { Result } from "../services/result";

export interface RouteSpec<P extends z.ZodType, Q extends z.ZodType, R extends z.ZodType> {
  method: "GET" | "POST" | "DELETE";
  /** Path relative to /api/v1, Fastify syntax (`/stocks/:ticker/market`). */
  path: string;
  summary: string;
  params?: P;
  query?: Q;
  /** The response `data` schema. Every response is validated against it before it is sent. */
  response: R;
  auth?: boolean;
  status?: number;
  /** Browser/CDN max-age in seconds (public routes only). */
  clientMaxAge?: number;
  handler: (i: { params: z.output<P>; query: z.output<Q>; userId: string }) => Promise<Result<z.output<R>>>;
}

export type AnyRoute = RouteSpec<z.ZodType, z.ZodType, z.ZodType>;

export const NoParams = z.object({}).strict();

/** Identity helper that preserves the generics so handlers are fully typed. */
export function route<P extends z.ZodType = typeof NoParams, Q extends z.ZodType = typeof NoParams, R extends z.ZodType = z.ZodType>(
  spec: RouteSpec<P, Q, R>,
): AnyRoute {
  return spec as unknown as AnyRoute;
}

export type { Meta };
