// Single place for brand + site-wide constants. Rename the product here.
export const SITE = {
  name: "BekuSegar",
  tagline: "Find frozen food, fresh meat & groceries near you",
  description:
    "Discover frozen food shops, fresh meat, seafood and hotpot ingredients around Kuala Lumpur and Selangor — with buying guides, local deals and store profiles.",
  locale: "en_MY",
  country: "MY",
  timezone: "Asia/Kuala_Lumpur",
  // Where owners/advertisers reach us. Set real values before launch.
  contactEmail: "hello@bekusegar.example",
  contactWhatsapp: "", // digits with country code, e.g. 60123456789; hidden when empty
  // Default map centre (Kuala Lumpur) used before the visitor shares a location.
  defaultCenter: { lat: 3.139, lng: 101.6869, label: "Kuala Lumpur" },
} as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const NOT_OFFICIAL_NOTICE =
  "BekuSegar is an independent directory. Listings are compiled from public information and are not official pages of the businesses listed unless marked as claimed.";
