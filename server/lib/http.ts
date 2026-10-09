import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import { OrderError } from '../modules/orders';
import { AuthError } from '../modules/auth';

export const clientIp = (c: Context, trustProxy: boolean): string => {
  if (trustProxy) {
    const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (fwd) return fwd;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown'; // e.g. in-process tests without a socket
  }
};

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function errorResponse(c: Context, err: unknown) {
  if (err instanceof OrderError) {
    return c.json<ApiErrorBody>({ error: { code: err.code, message: err.message, details: err.details } }, err.httpStatus as 400);
  }
  if (err instanceof AuthError) {
    if (err.retryAfterSec) c.header('Retry-After', String(err.retryAfterSec));
    return c.json<ApiErrorBody>({ error: { code: err.code, message: err.message } }, err.httpStatus as 400);
  }
  // Unknown failure: never leak internals to the client.
  console.error('[api] unhandled error:', err instanceof Error ? err.message : err);
  return c.json<ApiErrorBody>({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } }, 500);
}

export const tooMany = (c: Context, retryAfterSec: number) => {
  c.header('Retry-After', String(retryAfterSec));
  return c.json<ApiErrorBody>({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' } }, 429);
};
