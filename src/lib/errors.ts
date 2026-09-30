import type { ErrorCode } from "../contracts/common";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (m: string) => new ApiError(400, "INVALID_REQUEST", m);
export const unauthorized = (m = "Authentication required") => new ApiError(401, "UNAUTHORIZED", m);
export const forbidden = (m = "Forbidden") => new ApiError(403, "FORBIDDEN", m);
export const notFound = (m: string) => new ApiError(404, "NOT_FOUND", m);
export const conflict = (m: string) => new ApiError(409, "CONFLICT", m);
export const rateLimited = () => new ApiError(429, "RATE_LIMITED", "Too many requests");

/** Upstream (or its data) failed. `detail` is logged, never returned. */
export class ProviderError extends Error {
  constructor(
    public readonly kind: "upstream" | "unavailable" | "invalid",
    public readonly provider: string,
    public readonly detail: string,
  ) {
    super(`${provider}: ${detail}`);
    this.name = "ProviderError";
  }
}

export function providerToApiError(e: ProviderError, domain = "Market data"): ApiError {
  if (e.kind === "unavailable") return new ApiError(503, "SERVICE_UNAVAILABLE", `${domain} temporarily unavailable`);
  return new ApiError(502, "DATA_PROVIDER_ERROR", `${domain} temporarily unavailable`);
}
