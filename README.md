# Ruby Dessert House · 芝麻糊大王

Mobile-first ordering app and restaurant automation for **Kan Brothers Ruby Dessert House — since 1927**.
React 19 + TypeScript + Vite (customer app and staff dashboard) · Hono + SQLite on Node 22 (server) · i18next (50 languages, RTL).

> **Read [`docs/AUTOMATION.md`](docs/AUTOMATION.md)** for setup, every environment variable, integration steps, privacy, costs, limitations and the deployment checklist. Its §1 says exactly what is verified and what is not.

## Quick start

```bash
npm install
npm test                          # client + server tests
npm run dev                       # customer app, local prototype mode (no server)

# full stack
cp .env.example .env
STAFF_PASSWORD='a-long-passphrase' npm run staff:create -- --username amy --role manager
npm run server &                  # API on :8787
npm run dev:full                  # app on :5173, /api proxied → staff dashboard at /#/admin

# production
npm run build:all && NODE_ENV=production npm start
```

## What it does

- **Ordering** with server-authoritative prices, duplicate-proof submission (idempotency keys), per-day order numbers and live status.
- **Staff notifications** through an outbox with retry: dashboard alerts (built in), email, WhatsApp Business, signed kitchen webhook — each used only once configured, and shown as *Connected* only after a real test succeeds.
- **Staff dashboard** (`/#/admin`): orders, kitchen board, approvals, automation history with retries, integration status, reports, availability. Roles: `staff`, `manager`.
- **Ruby Dessert Guide**: rule-based answers from the real menu (first visit, second visit, budgets, ingredients, drinks, comparisons, FAQ). Optional AI only for free-text questions, with its output validated against the menu. Allergy/halal questions always go to staff.
- **Reports**: day/week/month from saved orders, with date range, time zone and data source on every report; wording is generated from the numbers and optionally verified AI wording.
- **Approvals**: cancelling an accepted order needs a manager. Refunds, price changes, discounts and policy changes have no code path at all.

## Sample data warning

`src/data/menu.ts` is **placeholder data** (flagged `placeholder: true`); in production the server refuses orders until it is replaced. `src/data/business.ts` (hours, address, contact) is empty, so the guide says it has no verified information. Allergen data is absent, so every dish shows "ask staff".

## Languages

All 50 requested languages are registered. Full UI + dish names + guide: English, 简体中文, 繁體中文, Bahasa Melayu, العربية. Core flows only (rest falls back to English): 43 more. Hokkien shows Traditional Chinese. **None are professionally verified**; Cantonese and Hokkien need native-speaker review. RTL (Arabic, Persian, Hebrew, Urdu) uses logical CSS and mirrored icons.

## Verification commands

```bash
npm test                                   # vitest: client (jsdom) + server (node)
npm run build:all && npm run e2e           # real browser × built server × local webhook receiver
npm run build && npm run check:mobile      # layout audit at 320–1440px, 4 languages, interactive flows
```

`check:mobile` and `e2e` need Chromium; set `CHROMIUM_PATH` if Playwright's isn't installed. They are layout/behaviour checks in headless Chromium — **not a substitute for testing on real phones**, and they never call live email, WhatsApp or Anthropic services.
