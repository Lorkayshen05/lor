# Technical architecture

## Stack and why

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | Server Components + ISR give crawlable, fast pages; one deployable. |
| Styling | Tailwind CSS 4, system font stack | No web-font requests → better LCP. CJK falls back to system Noto/PingFang/YaHei. |
| DB | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) | Relational fit; Prisma migrations; parameterised queries by default. |
| Auth | **Custom, minimal**: bcrypt password + signed JWT (`jose`) in an httpOnly cookie, role re-read from DB | See "Auth decision". |
| Validation | zod 4 | Every server action / route handler parses input. |
| Maps | Google Maps *links* for directions (no key), keyless embed fallback, Embed API key optional | No JS map SDK ⇒ no key exposure, no CLS. |
| Payments | Not integrated. `Subscription` has `provider` (MANUAL now) | Stripe/Billplz/Toyyibpay later; see `monetization.md`. |
| Analytics | First-party `AnalyticsEvent` table + optional GA4 | First-party gives per-business dashboards (the thing we sell). |
| Tests | Vitest (unit + DB integration), Playwright (e2e, mobile viewport) | |
| Hosting | See `deployment.md` | |

### Auth decision (deviation from the suggested Auth.js)
Auth.js v5 is still `beta` on npm and its Credentials provider forces JWT sessions without server-side
revocation anyway. We need email+password only for MVP and hard role checks. A ~120-line session module we
fully understand beats a beta dependency for a security-critical path. The module has the same shape
(`getSession`, `requireUser`, `requireRole`) so swapping in Auth.js for Google/OAuth later is contained.
Safeguards: bcrypt cost 12, per-account lockout, IP rate limiting, `sessionVersion` for revocation, role
re-checked against the DB on every request, `Secure`/`HttpOnly`/`SameSite=Lax` cookie, Origin checks on
mutating route handlers (server actions get Next's built-in origin check).

## Layers

```
src/app/**            Routes (server components), thin server actions
src/lib/services/**   Business logic taking an explicit actor; used by actions AND tests
src/lib/queries/**    Read queries (cached / ISR-friendly)
src/lib/auth/**       Session, password, guards
src/lib/admin/**      Config-driven admin resources (one CRUD engine, many entities)
src/components/**     UI
prisma/               schema, migrations, seed + seed-data
```

Authorization is enforced **inside services and actions** (`requireRole`), never only in `proxy.ts`.
`proxy.ts` is a UX redirect for anonymous users hitting `/admin` or `/business/dashboard`.

## Database entities

```
User ─< Review >─ Business ─< Branch >─< (m:n) Category
  │                  │  │        └─ Area
  │                  │  ├─< BusinessProduct >─ Product >─ Category
  │                  │  ├─< Deal (branch optional, product optional)
  │                  │  ├─< Lead
  │                  │  ├─< SponsoredListing
  │                  │  ├─< Photo
  │                  │  ├─< BusinessClaim >─ User
  │                  │  └── Subscription >─ Plan
  ├─ owns Business (ownerId)
Article, Advertisement, AnalyticsEvent (loose FKs), Plan (configurable pricing)
```

Additions beyond the brief's list, each justified: `Area` (SEO pages + area filter), `Plan` (pricing must
not be hard-coded), `BusinessClaim` (claims need an approval trail), `Photo` (upload + moderation).

Key modelling decisions
- **Business → Branch**: a business has many branches; branch holds address/coords/contact/hours.
- **Category has a `kind`**: `STORE_TYPE` (frozen-food, fresh-meat) tags branches; `PRODUCT` categories
  (chicken-breast, hotpot…) group `Product`s and map to store types through an m:n "typically sold at"
  relation. That is how we do category-level discovery **without** claiming a branch stocks something.
- **Status enums** on Deal / Review / Photo / Claim / Article / SponsoredListing power moderation.
- **Effective tier** of a business = its active Subscription's `Plan.tier`, computed in one helper.
- **Money** is stored in sen (`Int`, `priceSen`) to avoid float errors.

## Monetization architecture
`Plan` rows (tier, monthly price in sen, feature flags JSON, active) → `Subscription` (business, plan,
status, period end, provider). `src/lib/plans.ts` maps tier → capabilities (featured badge, homepage slot,
analytics, lead inbox). Feature checks call `can(business, "analytics")`, never compare prices.
`SponsoredListing` sells time-boxed *placements* (homepage / category / area) separate from the tier;
`Advertisement` sells display/affiliate slots. Everything paid renders with a visible label.

## SEO architecture
Server-rendered pages with per-page `generateMetadata` (title, description, canonical, OG), JSON-LD
(`LocalBusiness`, `BreadcrumbList`, `FAQPage`, `Article`), `sitemap.ts` built from the DB, `robots.ts`,
ISR (`revalidate`) for public pages so they are CDN-cacheable. The public layout does not read cookies, so
pages stay static/ISR. Location pages are gated by data (≥1 real store in radius) — see `seo-strategy.md`.

## Analytics
`POST /api/track` (sendBeacon, zod-validated, rate limited, bot-filtered, no IP stored; a per-day salted
hash is kept for approximate unique-visitor counts). Server-side logging for searches. Business dashboard
and admin dashboard aggregate with `groupBy`. Indexed on `(type, createdAt)` and `(businessId, type, createdAt)`.

## Security checklist
Input validation (zod) everywhere · bcrypt + lockout · httpOnly cookies · role checks in services ·
Origin check on mutating routes · in-memory rate limiter behind an interface (swap for Redis/Upstash when
scaled to >1 instance) · Prisma parameterised queries only (no `$queryRawUnsafe`) · react-markdown without
raw HTML for articles · JSON-LD `<` escaping · uploads re-encoded with sharp (strips EXIF/polyglots), size
and type limited · secrets only via env, `.env*` git-ignored · security headers in `next.config.ts`.

## Performance
Static/ISR pages; no client JS on content pages except small islands (search box, Near Me, tracker, map
consent-free iframe with `loading="lazy"`); system fonts; pagination (`take/skip`) on directory and admin
lists; distance sort is done in-process on a slim column set (fine to ~10k branches — beyond that add
PostGIS `ST_DWithin` or a bounding-box prefilter).
