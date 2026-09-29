// EXAMPLE pricing only. Prices live in the database (Plan.priceSen) and are editable in /admin/plans.
export const plans = [
  { code: "free", name: "Free listing", tier: "FREE", priceSen: 0, sortOrder: 0, features: ["Basic business profile", "Address and contact information", "Appear in search and category pages"] },
  { code: "featured-monthly", name: "Featured", tier: "FEATURED", priceSen: 4900, sortOrder: 1, features: ["Everything in Free", "\"Featured\" badge and higher visibility", "Promotional description", "More photos"] },
  { code: "premium-monthly", name: "Premium", tier: "PREMIUM", priceSen: 9900, sortOrder: 2, features: ["Everything in Featured", "Homepage placement", "Featured deals", "Analytics dashboard", "Lead tracking and inbox"] },
] as const;
