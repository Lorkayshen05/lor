# Deployment

## Recommendation
**Vercel (region `sin1`) + Neon Postgres (`ap-southeast-1`, Singapore) + Cloudflare R2 for images** — lowest ops for a solo founder and
low latency for Malaysia. Alternative: a single VPS/Fly.io/Railway container in Singapore with Docker + managed Postgres; then the
built-in `local` upload driver works if you mount a persistent volume at `./storage`.

## Steps (Vercel + Neon)
1. Create the Neon DB; copy the **pooled** connection string into `DATABASE_URL`.
2. `DATABASE_URL=... npx prisma migrate deploy` then `ADMIN_EMAIL=... ADMIN_PASSWORD=... NODE_ENV=production npx prisma db seed`
   (seed refuses to run in production without a 12+ char admin password; it never overwrites an existing admin).
3. Import the repo in Vercel. Env: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 48`), `NEXT_PUBLIC_SITE_URL`, optional GA/GSC/Maps keys,
   `STORAGE_DRIVER=none`. Build command is the default (`postinstall` runs `prisma generate`).
4. Add the domain, then submit the sitemap in Search Console.

## Known production gaps (be aware)
- **Uploads:** only a local-disk driver exists. On Vercel set `STORAGE_DRIVER=none` (upload UI shows "not enabled"). Implement an S3/R2
  driver in `src/lib/storage.ts` (`put`/`get`) before enabling.
- **Rate limiting** is in-memory per instance. On serverless/multiple instances swap `src/lib/rate-limit.ts` for Upstash Redis.
  Login lockout is DB-backed and unaffected.
- **Client IP** comes from `x-forwarded-for`; only correct behind a proxy that overwrites it (Vercel does).
- **No CSP header** yet (Next inline scripts need a nonce setup). Other security headers are set in `next.config.ts`.
- **No audit log** of admin actions, no email notifications (leads/claims are seen in dashboards only), no automated DB backups (use Neon PITR).
- Approximate coordinates are area-level; add real geocoding (Google Geocoding) when owners confirm addresses.
- Have the privacy page reviewed against Malaysia's PDPA before launch.
