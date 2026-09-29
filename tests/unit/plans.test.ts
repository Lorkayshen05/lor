import { describe, expect, it } from "vitest";
import { can, effectiveTier } from "@/lib/plans";

const sub = (over: Partial<{ status: string; currentPeriodEnd: Date | null; tier: "FEATURED" | "PREMIUM" }> = {}) => ({
  status: over.status ?? "ACTIVE",
  currentPeriodEnd: over.currentPeriodEnd === undefined ? null : over.currentPeriodEnd,
  plan: { tier: over.tier ?? "PREMIUM" },
});

describe("plans", () => {
  const now = new Date("2026-09-29T00:00:00Z");
  it("no subscription = FREE", () => expect(effectiveTier(null, now)).toBe("FREE"));
  it("active subscription gives its tier", () => expect(effectiveTier(sub(), now)).toBe("PREMIUM"));
  it("non-active or expired subscriptions fall back to FREE", () => {
    expect(effectiveTier(sub({ status: "CANCELED" }), now)).toBe("FREE");
    expect(effectiveTier(sub({ status: "PAST_DUE" }), now)).toBe("FREE");
    expect(effectiveTier(sub({ currentPeriodEnd: new Date("2026-09-01") }), now)).toBe("FREE");
    expect(effectiveTier(sub({ currentPeriodEnd: new Date("2026-10-01") }), now)).toBe("PREMIUM");
  });
  it("capabilities are cumulative and free tier keeps the lead inbox", () => {
    expect(can("FREE", "lead_inbox")).toBe(true);
    expect(can("FREE", "featured_badge")).toBe(false);
    expect(can("FEATURED", "featured_badge")).toBe(true);
    expect(can("FEATURED", "analytics_full")).toBe(false);
    expect(can("PREMIUM", "homepage_slot")).toBe(true);
    expect(can("PREMIUM", "lead_inbox")).toBe(true);
  });
});
