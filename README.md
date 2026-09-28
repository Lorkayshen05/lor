# 永隆鮮肉凍品鋪

Malaysian fresh/frozen meat ordering website. Next.js + TypeScript + Tailwind
CSS + Supabase, built as a reusable template — see `CLAUDE.md` for the full
architecture and conventions.

All business details (name, address, phone, WhatsApp number, prices, product
photos) in this repo are **placeholders**. Replace them before launch.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth + Storage) · Zod · deployed on Vercel.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com).

3. **Run the schema migration** — open the SQL editor in your Supabase
   project and run `supabase/migrations/0001_init.sql`. Optionally run
   `supabase/seed.sql` for sample catalogue data.

4. **Create an admin user** — in Supabase Dashboard → Authentication →
   Users, add a user with an email/password. This is the login for
   `/admin`.

5. **Configure environment variables** — copy `.env.example` to `.env.local`
   and fill in your Supabase project URL, anon key, and service-role key
   (Project Settings → API).
   ```bash
   cp .env.example .env.local
   ```

6. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` for the storefront and
   `http://localhost:3000/admin/login` for the admin dashboard.

## Rebranding for a new client

Edit these files only — no page/component code should need to change:

- `src/config/site.ts` — business name, contact info, WhatsApp number, currency.
- `src/config/categories.ts` — product categories and labels.
- `src/config/order-status.ts` / `src/config/stock-status.ts` — status labels.
- `supabase/seed.sql` — sample product catalogue.
- `.env.local` — Supabase project + site URL.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # eslint
```

## Deployment

Deploy to [Vercel](https://vercel.com/new), set the environment variables
from `.env.example` in the project settings, and add your production domain
to `NEXT_PUBLIC_SITE_URL`.
