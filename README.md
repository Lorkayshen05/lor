# BekuSegar — Malaysian frozen food, fresh meat & grocery discovery

A local discovery platform (working name; change it in `src/config/site.ts`) for Kuala Lumpur / Selangor. Seeded with 11 Yoon Loong
Frozen & Fresh Meat Wholesale Mart branches. **It is an independent directory, not the official site of any listed business**, and it
never invents prices, stock, hours, ratings, reviews, deals or partnerships — unverified data is simply not shown.

Docs: [product plan](docs/product-plan.md) · [architecture](docs/technical-architecture.md) · [monetization](docs/monetization.md) ·
[SEO](docs/seo-strategy.md) · [deployment](docs/deployment.md)

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · PostgreSQL 16 · Prisma 7 (`@prisma/adapter-pg`) · zod 4 ·
custom signed-cookie auth (`jose` + bcrypt) · Vitest · Playwright.

## Installation
```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then edit
```
### Environment variables
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (required) |
| `AUTH_SECRET` | ≥32 random chars; signs session cookies (required; the `dev-only…` placeholder is rejected in production) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for sitemap/OG/JSON-LD |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin created by the seed (prod requires ≥12 chars) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Optional integrations |
| `STORAGE_DRIVER` | `local` (default) or `none` (disables photo uploads) |

### Database
```bash
createdb bekusegar_dev                     # or any Postgres
npm run db:migrate                         # prisma migrate dev (applies prisma/migrations)
npm run db:seed                            # areas, categories, products, 11 branches, 5 guides, plans, admin user
```
`npm run db:deploy` applies migrations in production. The seed is idempotent (upserts; never overwrites edits).

## Run
```bash
npm run dev                # http://localhost:3000
npm run build && npm start # production
```
Dev admin: `admin@example.com` / value of `ADMIN_PASSWORD` → `/admin`.

## Tests
```bash
npm run check              # typecheck + lint + unit + DB integration (needs a `bekusegar_test` DB; TEST_DATABASE_URL to override)
npm run test:e2e           # Playwright vs a production build on :3100 using a `bekusegar_e2e` DB (resets and seeds it)
```
Test databases are separate from dev because tests truncate all tables. Playwright uses the system Chromium
(`PLAYWRIGHT_CHROMIUM_PATH` to override).

## How to…
**Add a business/branch:** `/admin/businesses/new` then `/admin/branches/new` (pick area and shop types). Leave coordinates blank to use the
area centre (flagged approximate). Only fill phone/WhatsApp/hours when verified. To seed in bulk, add to `prisma/seed-data/`.
**Add deals:** owners submit in `/business/dashboard/deals`; admins approve in `/admin/deals` (status filter `PENDING`). Admins can also create deals directly.
**Claim flow:** owner registers → `/business/claim` → admin approves in `/admin/claims` → dashboard unlocks.
**Change pricing:** `/admin/plans`. **Activate a paid plan:** `/admin/subscriptions` (set status and "paid until").
**Sponsored placement / ads / articles:** `/admin/sponsored`, `/admin/ads`, `/admin/articles`.

## How monetization works
Free listing → Featured/Premium subscriptions (admin-activated, price configurable) → sponsored placements/deals/articles → leads → ads/affiliate.
Everything paid is labelled. See [docs/monetization.md](docs/monetization.md).

## Project layout
`src/app` routes · `src/lib/services` business logic (authorised by explicit actor, tested against a real DB) ·
`src/lib/admin` config-driven admin CRUD · `prisma/` schema, migrations, seed · `tests/` unit+integration · `e2e/` Playwright.

## Known limitations
No online payments, email notifications, S3/R2 upload driver, CSP header, audit log or real geocoding yet — see [deployment.md](docs/deployment.md).
Distances are approximate straight-line figures from area-level coordinates.
