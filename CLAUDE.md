@AGENTS.md

# 永隆鮮肉凍品鋪 — Project Instructions

Malaysian fresh/frozen meat e-commerce site. Built as a **reusable template**:
placeholder business details today, meant to be rebranded for future clients
by editing config only — not by touching page/component code.

## Stack

- Next.js 16 (App Router, TypeScript, `src/` dir), React 19
- Tailwind CSS v4 (CSS-first config via `@theme` in `globals.css`, no `tailwind.config.ts`)
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr` and `@supabase/supabase-js`
- Zod for all form/server-action validation
- lucide-react for icons

### Next.js 16 specifics (do not use outdated patterns)

- Middleware is renamed **Proxy**: route protection/session refresh lives in
  `src/proxy.ts` (named or default export `proxy`), not `middleware.ts`.
- `params` and `searchParams` in pages/layouts/route handlers are `Promise`s —
  always `await` them.
- Cache Components (`cacheComponents: true`) is **intentionally left off** in
  `next.config.ts`. We use the standard/previous caching model: a route is
  either fully static or fully dynamic. Any page/layout that reads from
  Supabase must be dynamic — set `export const dynamic = "force-dynamic"`
  rather than relying on implicit fetch-caching behavior.
- Before touching anything Next.js-version-sensitive, check
  `node_modules/next/dist/docs/` — this version can differ from training data.

## Architecture rules

**Business config lives in `src/config/` and nowhere else should hardcode it:**
- `site.ts` — name, contact info, WhatsApp number, currency, min order amount.
- `categories.ts` — canonical category slugs (stored in DB) + Chinese labels.
- `order-status.ts` / `stock-status.ts` — canonical status keys + labels/colors.

Rebranding for a new client = editing these four files (plus env vars and
`supabase/seed.sql`). Do not scatter category lists, status labels, or
contact details elsewhere.

**Route groups:**
- `src/app/(shop)/` — public storefront, wrapped by `Header`/`Footer` in its
  own `layout.tsx`. Home, `/products`, `/products/[id]`, `/cart`, `/checkout`.
- `src/app/admin/login/` — sits **outside** the protected group; never gate
  this route behind the auth check or you create a redirect loop.
- `src/app/admin/(protected)/` — dashboard, product CRUD, order management.
  Its `layout.tsx` re-checks `auth.getUser()` server-side (defense in depth;
  `proxy.ts` also redirects unauthenticated `/admin/*` requests at the edge).

**Supabase client boundaries — this is a security-relevant convention:**
- `lib/supabase/client.ts` — browser client (anon key), Client Components only.
- `lib/supabase/server.ts` — SSR client bound to request cookies (anon key,
  respects RLS as the signed-in user). Use in Server Components/Actions that
  need the admin's session.
- `lib/supabase/admin.ts` — service-role client, **server-only** (`import
  "server-only"` guard already present). Bypasses RLS. Used narrowly for the
  public checkout action (anonymous customers have no session) and reading
  order confirmations by unguessable UUID. Never import it into a Client
  Component; never expose `SUPABASE_SERVICE_ROLE_KEY` via a `NEXT_PUBLIC_`
  var.

**Checkout correctness:** the cart (client-side, `localStorage`, see
`src/context/CartContext.tsx`) only ever sends `{productId, quantity}` pairs
to the server. The `createOrder` server action
(`src/app/(shop)/checkout/actions.ts`) always re-fetches current
price/name/unit/stock from `products` and recomputes the total server-side —
never trust a client-submitted price or total.

**Data tables** (`supabase/migrations/0001_init.sql`): `products`, `orders`,
`order_items`. `order_items` snapshots `product_name`/`unit`/`price` at order
time (beyond the minimal spec) so historical orders stay readable even if a
product is later edited or deleted — keep this when touching that schema.

## Conventions

- Status/category values: canonical English keys in the DB, Chinese labels
  resolved through the config maps — never branch UI logic on a Chinese
  string literal.
- `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.
- Currency: always `formatCurrency()` from `lib/utils.ts` (RM, 2dp).
- Prefer Server Actions over new Route Handlers for mutations unless a
  non-form/non-RSC consumer genuinely needs a plain HTTP endpoint.
- Every route touching Supabase needs a loading/error/empty state — don't let
  a query failure crash the route; catch and render a friendly message.

## Commands

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint`
- No test runner is configured yet.

## Environment

See `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only),
`NEXT_PUBLIC_SITE_URL`. Client construction falls back to harmless
placeholders when unset so `next build` never fails on missing env — real
network calls fail loudly at request time instead, surfaced by each route's
error state.

## Business rules

- Never invent real business info (address/phone/hours/prices) — use obvious
  placeholders (already done in `config/site.ts` and `supabase/seed.sql`).
- No payment gateway for the MVP; ordering ends at WhatsApp handoff.
- Never fake functionality (no mock data pretending to be live/DB-backed).

## Verification checklist (before calling a feature done)

- Walk the real user flow, not just render the page.
- Loading, error, and empty states all render sensibly.
- Mobile viewport check (this is a mobile-first storefront).
- `npm run lint` and `tsc --noEmit` clean.
- `npm run build` succeeds.

## Working style

Work autonomously through the task list; don't stop after each small step.
Keep replies concise — note what changed and what's next, skip narrating
unchanged code or obvious mechanics.
