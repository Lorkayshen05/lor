import type { PlanTier } from "@/generated/prisma/enums";

/**
 * Feature gating. Application code asks `can(tier, capability)`; it never compares prices or plan names,
 * so pricing can be changed in the database (/admin/plans) without touching code.
 *
 * Deliberate choice: the lead INBOX is free for every claimed listing. Charging to read enquiries
 * that a customer already sent is a churn machine; Premium adds lead *tracking* (status + export) instead.
 */
export type Capability =
  | "featured_badge"
  | "promo_description"
  | "extra_photos"
  | "homepage_slot"
  | "featured_deals"
  | "analytics_basic"
  | "analytics_full"
  | "lead_inbox"
  | "lead_tracking";

const FREE: Capability[] = ["analytics_basic", "lead_inbox"];
const FEATURED: Capability[] = [...FREE, "featured_badge", "promo_description", "extra_photos"];
const PREMIUM: Capability[] = [...FEATURED, "homepage_slot", "featured_deals", "analytics_full", "lead_tracking"];

export const TIER_CAPABILITIES: Record<PlanTier, Capability[]> = { FREE, FEATURED, PREMIUM };

export function can(tier: PlanTier, capability: Capability): boolean {
  return TIER_CAPABILITIES[tier].includes(capability);
}

type SubLike = {
  status: string;
  currentPeriodEnd: Date | null;
  plan: { tier: PlanTier };
} | null | undefined;

/** A subscription only counts while ACTIVE/TRIALING and not past its period end. */
export function effectiveTier(sub: SubLike, now: Date = new Date()): PlanTier {
  if (!sub) return "FREE";
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return "FREE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < now) return "FREE";
  return sub.plan.tier;
}

export function tierLabel(tier: PlanTier): string {
  return tier === "FREE" ? "Free" : tier === "FEATURED" ? "Featured" : "Premium";
}
