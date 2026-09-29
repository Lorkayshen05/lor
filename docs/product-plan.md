# Product plan

Working name: **BekuSegar** ("beku" = frozen, "segar" = fresh). The name is a placeholder and lives in one
place (`src/config/site.ts`).

## 1. What we are (and are not) building

A discovery layer for Malaysian frozen food, fresh meat and grocery shopping. The store record is only the
entry point — Google Maps already does "store + address + hours" better than we ever will. The value we add:

| Google Maps gives you | We add |
| --- | --- |
| A pin and a phone number | *What to buy where*: category and product-level discovery ("chicken breast", "hotpot ingredients") |
| Generic reviews | Buying guides written for local shoppers (meal prep, protein, hotpot) |
| Nothing on promotions | Owner-submitted, admin-approved deals with start/end dates |
| No way for a shop to talk to shoppers | Claimed profiles, quotation requests, bulk-order leads |

**Honest caveat:** until we have owner-supplied data (hours, phone, deals, product lists), a store page is
close to a Maps clone. The product only becomes differentiated when data quality and content exceed Maps.
That is why the roadmap front-loads owner claims and deals over more features.

## 2. Personas

1. **Meal-prep student / young professional (primary demand).** Wants cheap protein (chicken breast, eggs,
   tofu), shops weekly, sensitive to price, searches "chicken breast murah near me". Mobile only.
2. **Hotpot / steamboat host.** Planning a gathering, needs one shop for meat slices, fish balls,
   mushrooms, dumplings. Wants a checklist and to know which shops to call.
3. **Family grocery shopper.** Compares wet market vs. frozen wholesale shops for bulk buys.
4. **Small F&B operator / caterer (highest willingness to pay).** Wants bulk quotes. Lead-gen persona.
5. **Shop owner / branch manager (customer).** Wants footfall, enquiries, and to control what the internet
   says about their shop. Not technical; will use WhatsApp before a dashboard.
6. **Platform admin (us).** Verifies claims, approves deals/reviews/photos, sells sponsorships.

## 3. Main user journeys

- **J1 Find a shop near me:** Home → *Near Me* → `/stores?lat&lng` sorted by distance → store card → Directions.
- **J2 Find a product:** Home search "chicken breast" → `/products/chicken-breast` → shop types that normally
  stock it + nearby shops (clearly marked "availability not verified — call ahead").
- **J3 Plan a hotpot:** Guide → checklist → category pages → stores.
- **J4 Ask for a bulk quote:** Store page (claimed listing) → Request quotation → Lead stored → owner sees it.
- **J5 Owner claims listing:** `/business` → sign up → `/business/claim` → admin verifies → dashboard.
- **J6 Owner posts a deal:** Dashboard → submit deal → admin approves → visible on `/deals`, store page.
- **J7 Organic search landing:** Google → `/sri-petaling/frozen-food` or guide → store page.

## 4. Information architecture / route structure

```
/                          Home
/stores                    Directory (search, filters, sort by distance)
/stores/[slug]             Branch profile
/categories/[slug]         Store-type and product-group category pages
/products/[slug]           Product discovery page (category-level availability)
/deals                     Approved, in-date deals
/guides, /guides/[slug]    Articles
/[area]/[topic]            Location SEO pages, e.g. /sri-petaling/frozen-food (gated, see SEO doc)
/business                  Owner landing (pricing, how it works)
/business/claim            Claim a listing
/business/dashboard/*      Owner area: overview, profile, products, deals, leads, analytics, plan
/admin/*                   Admin: every entity + moderation queues
/login /register /about /privacy
/sitemap.xml /robots.txt
```

## 5. Data integrity rules (product-level, enforced in the schema and UI)

- Seed data = **name + address + branch label only**, sourced from the brief. Nothing else is asserted.
- No invented prices, stock, promotions, ratings, reviews, hours, phone numbers, or partnerships.
- Every optional fact has a nullable field and a `verified` flag; the UI renders *nothing* rather than a
  guess (e.g. no phone → no Call button; unverified hours → "Hours not verified — call ahead").
- Rating shown **only** from approved reviews on our platform. Google ratings are never copied.
- Coordinates are **approximate area-level** points used for distance sorting only and are labelled
  "approx."; directions use the written address.
- Product availability is category-level. A `BusinessProduct` row (with `verifiedAt`) is the only thing that
  lets us say a branch stocks a specific product; there are none at launch.
- Site copy states clearly that this is an independent directory and **not** the official website of any
  listed business. Unclaimed listings show "Unclaimed listing — details from public information".
- Leads/quotation forms are only offered on claimed listings, so we never collect enquiries for a
  business that has not agreed to receive them.

## 6. Monetization (summary — detail in `monetization.md`)

Order of attack, cheapest to validate first:
1. **Verified/claimed free listing** (no revenue; the data-acquisition engine).
2. **Featured listing** RM49/mo (example, configurable) — badge, promo description, more media.
3. **Premium** RM99/mo (example) — homepage slot, deals boost, analytics, lead tracking.
4. **Sponsored deals / sponsored articles** — one-off, sold manually by WhatsApp.
5. Display ads / affiliate — placeholders only; not worth pursuing before ~10k monthly sessions.

Paid placements are always labelled "Featured" or "Sponsored" and are shown in separate, labelled slots;
they never change organic ordering.

## 7. MVP scope vs. later

In MVP: everything in the route list, manual subscription activation, admin-moderated content.
Deliberately **not** in MVP: online payments (activate plans manually / invoice), PostGIS, native app,
user-generated photo galleries at scale, multi-user business teams, price comparison, real-time stock.

## 8. Risks

- **Thin content** on location pages → gated pages, only where real stores exist (see `seo-strategy.md`).
- **Data staleness** → every claimed listing has `updatedAt`; owners are nudged; unverified data is labelled.
- **Chicken-and-egg** with owners → free claims first, WhatsApp-led onboarding; charge only after proof.
- **Brand/legal**: directory data used without authorization → disclaimer, takedown/claim path, no logos or
  copied imagery/reviews.
