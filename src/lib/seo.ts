import type { Metadata } from "next";
import { SITE, SITE_URL, absoluteUrl } from "@/config/site";

type MetaInput = { title: string; description: string; path: string; noindex?: boolean; type?: "website" | "article"; publishedTime?: Date | null; modifiedTime?: Date | null };

/** Cut at a word boundary so search snippets don't end mid-word. */
export function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Every indexable page goes through this: unique title/description, canonical, Open Graph, Twitter. */
export function pageMetadata({ title, description, path, noindex, type = "website", publishedTime, modifiedTime }: MetaInput): Metadata {
  const desc = truncateAtWord(description, 158);
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | ${SITE.name}`,
      description: desc,
      url: absoluteUrl(path),
      siteName: SITE.name,
      locale: SITE.locale,
      type,
      ...(type === "article" ? { publishedTime: publishedTime?.toISOString(), modifiedTime: modifiedTime?.toISOString() } : {}),
    },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE.name}`, description: desc },
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function parseFaq(value: unknown): { q: string; a: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is { q: string; a: string } => !!v && typeof v.q === "string" && typeof v.a === "string");
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE_URL,
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/stores?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function articleJsonLd(a: { title: string; excerpt: string; slug: string; publishedAt: Date | null; updatedAt: Date }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    mainEntityOfPage: absoluteUrl(`/guides/${a.slug}`),
    datePublished: a.publishedAt?.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    publisher: { "@type": "Organization", name: SITE.name, url: SITE_URL },
  };
}

export function itemListJsonLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
  };
}

/**
 * LocalBusiness data is limited to facts we hold. Phone, opening hours, geo and ratings are emitted
 * ONLY when verified/present — structured data that contradicts reality risks a manual action.
 */
export function localBusinessJsonLd(s: {
  name: string; branchName: string; slug: string; description?: string | null;
  addressLine: string; city: string; state: string; postcode: string;
  phone?: string | null; website?: string | null; lat?: number | null; lng?: number | null; coordsApprox: boolean;
  hours?: Record<string, { open: string; close: string }[] | undefined> | null;
  rating?: { avg: number; count: number } | null;
}) {
  const dayNames: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  return {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": `${absoluteUrl(`/stores/${s.slug}`)}#store`,
    name: `${s.name} – ${s.branchName}`,
    url: absoluteUrl(`/stores/${s.slug}`),
    ...(s.description ? { description: s.description } : {}),
    address: { "@type": "PostalAddress", streetAddress: s.addressLine, addressLocality: s.city, addressRegion: s.state, postalCode: s.postcode, addressCountry: "MY" },
    ...(s.phone ? { telephone: `+${s.phone}` } : {}),
    ...(s.website ? { sameAs: [s.website] } : {}),
    ...(!s.coordsApprox && s.lat != null && s.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } } : {}),
    ...(s.hours
      ? {
          openingHoursSpecification: Object.entries(s.hours).flatMap(([d, ranges]) =>
            (ranges ?? []).map((r) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: dayNames[d], opens: r.open, closes: r.close })),
          ),
        }
      : {}),
    ...(s.rating && s.rating.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating.avg.toFixed(1), reviewCount: s.rating.count } } : {}),
  };
}
