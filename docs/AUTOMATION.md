# Ruby Dessert House — automation system

What this is, how to run it, what is real, and what is not yet proven. Read **§1 and §12** first.

## 1. What is verified and what is not

| Area | Status |
| --- | --- |
| Order intake, server-side pricing, idempotency, order numbers, status machine, approvals, retention, reports, auth, rate limits | **Built and tested** (unit/integration tests + a real-browser end-to-end run against the built server) |
| Kitchen-display webhook | **Tested for real over HTTP** against a *local* receiver (signature, retry, no duplicates). Not tested against a real kitchen product. |
| Email (SMTP) and WhatsApp Business | **Request shape tested against fakes only.** Never run against a live provider (no credentials were available). They show "Configured — not tested" until you press **Send test** in the dashboard and the provider accepts it. |
| Anthropic AI (guide wording, report wording) | **Logic tested with a fake model** (validation, fallbacks, privacy). **Never called against the live API** (no key). |
| Payments | **Not implemented.** There is no payment, refund or discount code path at all. |
| Customer-facing messages (SMS/WhatsApp to customers) | **Not implemented.** Customers get an on-screen confirmation, an order number and live status. Messaging customers needs their consent and approved templates. |
| The menu | **Still sample data** (`src/data/menu.ts`, every item `placeholder: true`). In production the server refuses orders until the real menu is loaded. |
| Business facts (hours, address, phone) | **Empty** (`src/data/business.ts`). The guide says "I don't have verified information" until you fill them in. |
| Translations | English, 简体中文, 繁體中文, Bahasa Melayu, العربية are full; 43 more cover core flows; **none are professionally verified** and Cantonese/Hokkien need native review. The guide's own text is fully translated only for those five. |

## 2. Architecture

```
Browser (React SPA)  ──/api──▶  Hono server (Node 22)  ──▶  SQLite (node:sqlite)
   │  customer app                │  public routes   /api/menu /api/orders /api/guide …
   │  staff dashboard (lazy)      │  admin routes    /api/admin/*   (cookie session + roles)
                                  └─ worker: notification outbox, retries, retention, scheduled reports
                                         └─▶ SMTP · WhatsApp Cloud API · signed webhook · Anthropic API
```

| Module | Path | Responsibility |
| --- | --- | --- |
| Menu & pricing | `src/data/menu.ts`, `src/services/pricing.ts`, `server/modules/menu.ts` | One menu file. The server prices every order; the DB can only toggle availability. |
| Order processing | `server/modules/orders.ts` | Validation, idempotency, numbering, status machine, approvals, contact retention |
| Recommendations | `src/services/recommendations.ts`, `budgetPlanner.ts`, `guide/` | Pure rules, shared by browser and server |
| AI integration | `server/modules/ai/` | `LlmClient` interface, Anthropic implementation, answer validation |
| Notifications | `server/modules/notifications/` | Outbox, channels, retry/backoff, integration status |
| Translation | `src/i18n/` | Registry of 50 languages, lazy locales, fallback, RTL |
| Reporting | `server/modules/reports.ts` | SQL aggregates, deterministic summary, verified optional AI wording |
| Auth & permissions | `server/modules/auth.ts`, `server/routes/admin.ts` | Staff accounts, sessions, roles, CSRF |
| Automation log & policy | `server/modules/automation.ts` | Levels A/B/C, execution history |

### Why shared code
`src/services/*` (pricing, cart, recommendations, planner, guide rules, checkout validation) is imported by **both** the browser and the server, so the customer's screen and the server's decision can never disagree about a rule — only about data, and the server's data wins.

## 3. Automation levels

| Level | Meaning | Examples here |
| --- | --- | --- |
| **A — safe** | Deterministic, no outside effect | menu search, budget plans, recommendations, cart maths, order numbers, draft reports, order intake, contact purge |
| **B — connected** | Talks to an external system; **runs only if that integration is configured** | staff email / WhatsApp / kitchen webhook, daily report email, status updates by signed-in staff |
| **C — human decision** | The system can queue it; a person decides | cancelling an order after staff accepted it (manager approval) |

**Never automated, no code path exists:** refunds, payment reversals, price changes, discounts, policy changes, complaint compensation. The AI modules cannot import the orders module (enforced by a test), so an AI answer cannot change an order's status.

## 4. Order workflow

1. Customer builds a cart (prices shown from the server menu when connected).
2. Checkout sends **item ids, quantities, order type, table/pickup, contact and the total they saw** — never prices — with an `Idempotency-Key`.
3. Server re-reads the menu, rejects unknown/unavailable items, computes the total. If it differs from what the customer saw → `409 PRICE_CHANGED` with the real total (nothing saved).
4. In **one transaction**: order number `RDH-YYMMDD-NNN` (per business day), the order, its lines (names and prices frozen), contact details (separate table), an audit event, and one outbox row per *configured* notification channel.
5. Response returns the order and a tracking token. The worker is kicked to deliver notifications immediately.
6. Staff move it `new → confirmed → preparing → ready → completed` (no skipping). The customer's confirmation page polls and shows the live status.

**Retries are safe.** Same key + same order → the original order is returned (`200`, `created:false`). Same key + different order → `422`. A lost response, a double tap or a flaky network cannot create a second order (tested, including a real "server saved it, response dropped" browser run).

**Notification failure never loses an order.** The order is committed first; delivery retries with exponential backoff (30 s → 15 min cap, `NOTIFY_MAX_ATTEMPTS`, default 5), then shows as *failed* with a **Retry** button. Retrying reuses the same row — no duplicate order, no duplicate message (leased claim).

## 5. Setup

```bash
npm install
cp .env.example .env            # then edit; never commit .env
# create staff (password via env or stdin, never as an argument):
STAFF_PASSWORD='a-long-passphrase' npm run staff:create -- --username amy --role manager

# development: API on :8787, app on :5173
npm run server &                # tsx server/index.ts
npm run dev:full                # Vite with VITE_ORDER_API=/api and an /api proxy

# production build (front end talks to /api on the same origin)
npm run build:all               # builds dist/ and dist-server/
NODE_ENV=production npm start   # serves dist/ and /api together
```

Staff dashboard: `https://your-host/#/admin`. Create `staff` accounts for the floor and `manager` accounts for owners. There is deliberately no web sign-up.

Without `VITE_ORDER_API` the app runs in **local prototype mode** (no server, prices not authoritative, orders stay on the device). Use `npm run build` for that and `npm run check:mobile`.

## 6. Environment variables

| Variable | Needed | Purpose |
| --- | --- | --- |
| `NODE_ENV` | — | `production` enables secure cookies, HSTS and the sample-menu lock |
| `PORT` | — | default 8787 |
| `DATABASE_PATH` | — | SQLite file (default `./data/ruby.db`). Persistent, backed-up disk. |
| `ORDER_TOKEN_SECRET` | **production** | ≥32 chars; signs order-tracking tokens (`openssl rand -hex 32`) |
| `ALLOW_SAMPLE_MENU` | — | production refuses orders on the sample menu unless `true` |
| `BUSINESS_TZ` | — | default `Asia/Kuala_Lumpur`; drives order numbers and report days |
| `TRUST_PROXY` | — | `true` only behind a proxy you control (client IP for rate limits; forwarded host for CSRF) |
| `CONTACT_RETENTION_DAYS` | — | default 30; then name/phone are erased |
| `SESSION_HOURS` | — | default 12 |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` `STAFF_EMAIL_TO` | for email | needs `SMTP_HOST`, `EMAIL_FROM`, `STAFF_EMAIL_TO` at minimum |
| `WHATSAPP_ACCESS_TOKEN` `WHATSAPP_PHONE_NUMBER_ID` `WHATSAPP_STAFF_TO` `WHATSAPP_TEMPLATE_NAME` `WHATSAPP_TEMPLATE_LANG` `WHATSAPP_API_VERSION` | for WhatsApp | first four are required |
| `KDS_WEBHOOK_URL` `KDS_WEBHOOK_SECRET` | for kitchen display | both required |
| `ANTHROPIC_API_KEY` | for AI | server-side only; never sent to the browser |
| `AI_MODEL` | — | default `claude-opus-5-5`; set a smaller model to cut cost |
| `AI_ENABLED` `AI_TIMEOUT_MS` | — | kill switch / timeout (default 20 s) |
| `REPORT_HOUR` `REPORT_DAILY_EMAIL` | — | scheduled daily report (default 08:00; email only if enabled **and** SMTP configured) |
| `WORKER_INTERVAL_MS` `NOTIFY_MAX_ATTEMPTS` | — | defaults 15000 / 5 |
| `VITE_ORDER_API` | **build time** | `/api` to build the connected front end |

A channel counts as configured **only when all its required values exist**; a half-configured channel is treated as off.

## 7. Integrations

### Email (SMTP)
Any SMTP provider. Set the variables, then **Integrations → Send test** (manager). Shows *Connected* only after the server accepts the test message. Provider pricing and limits vary — not estimated here.

### WhatsApp Business (Meta Cloud API)
Business-initiated messages must use a **pre-approved template**. Create a template in your Meta WhatsApp Business account with **three body parameters**, e.g.

> `New order {{1}} — {{2}}. Total {{3}}.`

then set `WHATSAPP_TEMPLATE_NAME` (and language). The server sends `{{1}}` = order id, `{{2}}` = type/table + items, `{{3}}` = total. Customer name and phone are **not** sent over WhatsApp. One recipient only (the Cloud API cannot message groups) — use a shared staff number. Template approval, the Graph API version (`WHATSAPP_API_VERSION`, pin one you have verified) and conversation fees are controlled by Meta; verify them in Meta's current documentation. **Untested against the live API.**

### Kitchen display (signed webhook)
`POST` JSON `{event:"order.created", id, data:{orderId, orderType, tableNumber, pickupInMinutes, total, items[]}}` — no customer contact. Headers: `X-Ruby-Signature: sha256=<hex HMAC-SHA256 of the raw body, key = KDS_WEBHOOK_SECRET>` and `X-Ruby-Event-Id` (same on every retry — de-duplicate on it). Respond `2xx` to acknowledge; anything else is retried.

```js
// receiver sketch (Node)
const ok = req.headers['x-ruby-signature'] === 'sha256=' + createHmac('sha256', SECRET).update(rawBody).digest('hex');
```

### AI (Anthropic)
Used **only** for (a) free-text guide questions the rules can't classify and (b) optional plain-English wording of a report. Everything else is deterministic. See §9.

## 8. Database

SQLite via `node:sqlite` (built into Node 22; no native build; prints an "experimental" warning). WAL mode. Migrations are embedded in `server/db/migrations.ts`, applied automatically at start, tracked in `schema_migrations`. Current: `1 initial`, `2 notification_lease`. Tables: `orders`, `order_items`, `order_contacts`, `order_events`, `notifications`, `staff_users`, `sessions`, `automation_runs`, `approval_requests`, `reports`, `menu_availability`, `integration_status`.

**Backups:** copy the DB with SQLite's online backup (`sqlite3 ruby.db ".backup backup.db"`) — don't copy a live `-wal` file by hand. Test a restore.
**Scale:** one server process, one SQLite file. That is right for one restaurant. Several instances would need a networked database and a shared rate limiter.

## 9. Privacy & the AI

| Data | Where | Kept |
| --- | --- | --- |
| Items, totals, order type, table | `orders`, `order_items` | indefinitely (business records, reports) |
| Customer name / phone | `order_contacts` only | erased after `CONTACT_RETENTION_DAYS` |
| Anonymous device id | `orders.customer_ref` | with the order; used only for repeat-purchase counts |
| Staff passwords | scrypt hash, per-user salt | until the account is removed |
| Staff sessions | SHA-256 of the token | `SESSION_HOURS`, then purged |
| Execution log | `automation_runs` (sanitised errors, no contact data) | 90 days |

**Sent to the AI provider:** the menu (names, categories, prices, headline ingredients, descriptions), the customer's order type, the question text (first 300 chars) and the language. **Never sent:** names, phone numbers, order ids or history, tracking tokens, staff data. Report wording sends aggregate figures only.

**Guards on AI output** (all tested with a fake model): structured output only; item ids must exist and be available; any `RM` figure must be a real menu price or a sum of the mentioned items; answers claiming popularity, promotions, waiting times, reservations, opening hours, or **allergen / halal / dietary facts** are discarded. Allergy and halal questions never reach the AI at all — they get the staff-referral answer. Report wording must quote only numbers present in the report (money only as ringgit, counts only as counts) and may not forecast.

**Allergens:** menu items carry `ingredients` (headline ingredients only) and an optional `allergenInfo` with a named verifier and date. Until the restaurant fills that in, every item shows "Allergen details not verified — ask staff".

## 10. Security summary

Parameterised SQL only · zod validation on every body (unknown fields rejected) · body-size limits · idempotency keys · per-IP rate limits (orders 10/min, guide 30/min, AI 8/min, status 90/min) · login lockout (5/15 min per account, 20 per IP) · generic login errors · scrypt passwords (≥12 chars) · HttpOnly + SameSite=Strict + Secure(prod) cookie · CSRF (custom header + same-origin check) · role checks server-side on every admin route · tracking tokens (HMAC) for customer status · secrets scrubbed from stored errors · CSP, `X-Frame-Options`, `nosniff`, HSTS (prod). CSP keeps `style-src 'unsafe-inline'` because React sets inline styles.
**Same-origin only:** the API sets no CORS headers. Serve the app and `/api` from one origin (the production server does this).
**Rate limiting is in-memory** (single process).

## 11. Tests

```bash
npm test                 # all vitest suites (client + server)
npm run test:server      # server only
npm run build:all && npm run e2e            # real browser × real server × local webhook receiver
npm run build && npm run check:mobile       # layout audit at 320–1440px (local-mode build)
```
See the final report for the exact counts from the last run. Not covered by any test: live SMTP / WhatsApp / Anthropic calls, a real kitchen product, real phones/browsers other than headless Chromium, load/concurrency beyond single-process.

## 12. Cost (only what can be supported)

**Anthropic** — prices from the API reference used to build this (per million tokens): `claude-opus-5-5` $4 in / $20 out; `claude-haiku-5-5` $0.10 in / $0.50 out. Measured from this code: the guide's system prompt is ≈5.9k characters (**≈1.7k tokens, an estimate**). Assuming ≈1.8k input and **≈800 output tokens including thinking (an assumption — real usage will differ)** per AI-answered question:

| Model | ≈ per AI question | ≈ per 1,000 AI questions |
| --- | --- | --- |
| `claude-opus-5-5` (default) | ≈ $0.023 | ≈ $23 |
| `claude-haiku-5-5` | ≈ $0.0006 | ≈ $0.6 |

Only free-text questions the rules can't classify reach the AI (the suggested-question buttons and recognised questions don't), capped at 8 per minute per client. Prompt caching is requested but a 1.7k-token prefix is probably under the minimum cacheable size, so assume no cache discount. Haiku was **not** tested with this code; check it supports the structured-output settings before switching. Report wording is one small call per report.

**Not estimated** (no provider pricing was verifiable): SMTP provider, WhatsApp conversation fees, hosting/domain, backups.

## 13. Known limitations

- Menu, business facts and allergen data are placeholders until the restaurant supplies them.
- No payment, no customer messaging, no accounts: "returning customer" features use the history on that device only (a different phone or cleared storage looks like a new customer). Server-side "best sellers" need real order volume (≥50 orders) and are not yet wired to the order database (`SalesDataSource` is the seam).
- Repeat-purchase reports are device-based and undercount.
- Staff dashboard is English only.
- One server process / one SQLite file; in-memory rate limiter.
- The admin tab-navigation regression test fails by hanging (not cleanly) if the bug returns.
- AI wording quality (and Haiku compatibility) is unverified on the live API.

## 14. Deployment checklist

- [ ] Replace the sample menu in `src/data/menu.ts` with the real items, prices and photos; remove `placeholder` flags.
- [ ] Fill `src/data/business.ts` (hours, address, contact) and `OUTLETS`; add verified `allergenInfo` where you can.
- [ ] Set `NODE_ENV=production`, a 32+ char `ORDER_TOKEN_SECRET`, `DATABASE_PATH` on persistent storage, `BUSINESS_TZ`.
- [ ] `npm ci && npm run build:all`; run `npm start` under a process manager (systemd/pm2); put it behind HTTPS (reverse proxy) and set `TRUST_PROXY=true` only if the proxy is yours.
- [ ] Create manager and staff accounts with `npm run staff:create`.
- [ ] Configure at least one staff channel (email/WhatsApp/webhook), then **Integrations → Send test** until it shows *Connected*. Place a test order and confirm staff really receive it.
- [ ] Get the WhatsApp template approved before relying on WhatsApp.
- [ ] Decide `CONTACT_RETENTION_DAYS`; publish a privacy notice that matches §9.
- [ ] Schedule DB backups and test a restore.
- [ ] Add `ANTHROPIC_API_KEY` only if you want AI wording; run **Integrations → Send test** for AI; set `AI_MODEL` to control cost.
- [ ] Walk through every flow on real phones (iOS Safari, Android Chrome) and with a screen reader.
- [ ] Have native speakers review the translations you ship (especially Cantonese and Hokkien).
- [ ] Remove or reset test orders made on the sample menu before reading reports (they are flagged `sample-menu test order`).
