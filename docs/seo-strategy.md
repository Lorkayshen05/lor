# SEO strategy

## What is implemented
- Per-page `generateMetadata`: unique title/description (≤158 chars, cut at word boundary), canonical, Open Graph, Twitter.
- JSON-LD: `WebSite`+SearchAction (home), `GroceryStore` (store), `BreadcrumbList` (all), `FAQPage` (guides, location pages),
  `Article` (guides), `ItemList` (lists). Structured data contains only facts we hold: no phone/hours/rating/geo unless
  verified (asserted by e2e).
- `sitemap.xml` from the DB (stores, categories, products, guides, gated location pages); `robots.txt` blocks `/admin`,
  `/business/dashboard`, `/api`, `/login`, `/register`.
- Filtered/sorted directory URLs are `noindex,follow`; the clean `/stores` is indexable. Empty shop-type category pages are
  `noindex` and out of the sitemap.
- Public pages are ISR (5–10 min) and invalidated on every admin/owner change. No cookie reads in the layout, so pages stay CDN-cacheable.
- System fonts, no client JS on content pages except small islands → good LCP/CLS/INP baseline.

## Location pages without doorway spam
`/[area]/[topic]` exists **only** when ≥1 real listing of that store type lies within the area's radius. Otherwise 404 and
not in the sitemap. Each page has: computed counts and nearest-shop distance, an honest "none inside X itself" statement, topic
tips, a data-driven FAQ, related guides and nearby areas. Today that yields ~26 pages from 13 areas × 2 topics — deliberately small.
**Expansion rule:** add an area only when it has real listings or you can write ≥300 words of genuinely local, verifiable content.

## Content plan
Five seeded guides (Sri Petaling/Bukit Jalil frozen food, chicken breast in KL, high-protein groceries, hotpot checklist, student
meal-prep). They avoid unverifiable claims: no prices, no "best". Next: one guide per area with ≥3 listings, seasonal hotpot/CNY
guides, halal-vs-non-halal explainers (needs a `halal` field first).

## Setup checklist
1. Set `NEXT_PUBLIC_SITE_URL` to the real domain. 2. Verify in Search Console (`NEXT_PUBLIC_GSC_VERIFICATION`), submit `/sitemap.xml`.
3. Set `NEXT_PUBLIC_GA_ID`. 4. Add a real OG image (`src/app/opengraph-image.tsx`). 5. Watch Coverage for "Crawled – not indexed" on location pages.

## Honest expectations
A Maps-clone directory rarely ranks on its own. Rankings will come from guides and product/category pages that answer questions
Maps can't, plus owner-verified data (hours, deals). Budget months, not weeks.
