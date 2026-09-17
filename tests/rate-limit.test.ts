import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit then blocks", () => {
    const now = 1_000;
    expect(rateLimit("user", 2, 1000, now).ok).toBe(true);
    expect(rateLimit("user", 2, 1000, now).ok).toBe(true);
    const blocked = rateLimit("user", 2, 1000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("opens a new window after it expires", () => {
    rateLimit("user", 1, 1000, 0);
    expect(rateLimit("user", 1, 1000, 500).ok).toBe(false);
    expect(rateLimit("user", 1, 1000, 1500).ok).toBe(true);
  });

  it("keys are independent", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
  });
});
