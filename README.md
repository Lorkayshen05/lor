# Market API (`/api/v1`)

Provider-agnostic backend. The frontend only knows the internal `/api/v1` contracts; no external market, SEC, company or news API is ever called from the browser.

```
Frontend → API layer → Service layer → Provider adapters → Market / SEC / Company / News APIs
           (Fastify+Zod) (formulas, cache)  (5 interfaces)
```

```bash
npm install
npm run dev            # http://localhost:3000/api/v1  (lists every endpoint)
npm test               # 119 tests, incl. end-to-end for NVDA AAPL MSFT AMZN GOOGL JPM WMT SPOT
npm run typecheck
npm run build
```

Config is environment-only (see `.env.example`). Without `DATABASE_URL` the watchlist and curated analysis are in-memory; with it, run `db/schema.sql` first (Postgres or Supabase).

> **Data is synthetic.** The only shipped provider is `src/providers/mock/`: a deterministic fixture universe of 29 companies with illustrative numbers. It exists to exercise the contracts and formulas. It is not market data, and its sources are labelled `(mock)` / `(synthetic)`. Real vendors are added as adapters (below); nothing else changes.

## Conventions

| Rule | Detail |
|---|---|
| Envelope | `{ data, meta?: { asOf, source, nextCursor, stale }, error?: { code, message } }` |
| Timestamps | ISO 8601 with offset |
| `Metric` | `{ value: number \| null, currency?, unit?, period?, asOf, type, source? }`, `type` ∈ `actual \| estimate \| guidance \| calculated` |
| Missing data | `null`, never `0`. Non-finite numbers become `null`. Multiples on non-positive denominators are `null` |
| Money | `currency` set, whole units. Statements are in the **reporting** currency (SPOT = `EUR`); market values are USD; every ratio is FX-normalized by the backend |
| Ratios | `unit: "ratio"`, a fraction (`0.10` = 10 %). Multiples `unit: "x"`. Per-share `unit: "per_share"` |
| `capex` | Cash spent, as a positive number |
| Cursors | Opaque, bound to the filter set that produced them (replaying one against different filters → 400) |
| Guidance | Emitted as two metrics per item, period suffixed `(low)` / `(high)` |

## Endpoints

| Endpoint | Cache TTL (stale-if-error ceiling) |
|---|---|
| `GET /companies` · `/companies/:ticker` | 24 h profile · 30 s quote |
| `GET /stocks/:t/market` | 30 s (5 min) |
| `GET /stocks/:t/history?range&interval` | 1 min intraday / 5 min daily |
| `GET /stocks/:t/financials?period&years` · `/balance-sheet` | 12 h (72 h) |
| `GET /stocks/:t/valuation` | 15 min (6 h) |
| `GET /stocks/:t/peers` · `GET /compare?tickers=` (≤ 5) | universe 30 s |
| `GET /stocks/:t/earnings` · `/estimates` | 6 h · 3 h |
| `GET /stocks/:t/news` | 10 min |
| `GET /stocks/:t/analysis` | stored analysis + computed scenarios |
| `GET /screener` | server-side filter, sort, cursor |
| `GET /index/sp500/constituents` · `/overview` · `GET /sectors` | 24 h · 3 min · 30 s |
| `GET·POST·DELETE /watchlist[/:ticker]` | bearer auth, per user |

History accepts only sensible combinations (e.g. `5y` allows `1d`/`1w`, never `1m`). Errors use `400 401 403 404 409 429 500 502 503` with `{ data: null, error: { code, message } }`; provider details and stack traces are logged, never returned.

Page budgets: homepage = `overview` + `sectors` + `screener?limit=10` (+ `news`); stock page = `companies/:t` + `history` + `financials` + `valuation` + `earnings`/`estimates` + `news`/`analysis`/`peers`; screener = 1 request; compare = 1 request. Nothing returns full statements for a list of companies.

## How the guarantees are enforced

- **Contracts first**: `src/contracts/*` hold every Zod schema and inferred TS type.
- **Requests**: params and query are parsed with `.strict()` schemas (unknown params → 400).
- **Provider data**: every adapter result passes through `callProvider` (timeout, one retry, Zod validation). Malformed data → 502 and never reaches a service.
- **Responses**: every response is validated against its schema, and the *parsed* value is what is sent, so undeclared fields can't leak. A violation is a generic 500.
- **Stored data**: curated analysis and Postgres rows are Zod-validated on read. Every risk, catalyst, moat and scenario carries `sourceIds` that must resolve in the response's `sources`.
- **Formulas live in one place** (`lib/formulas.ts`, `services/core.ts`); the frontend never computes valuation.
- **Stale is labelled**: a provider failure serves cached data only within a bounded window and sets `meta.stale: true`; beyond it, 502/503.
- **Layering is tested**: `api/`, `services/`, `contracts/` may not import a concrete provider or make HTTP calls; only `server.ts` wires one.

## Adding a real provider

1. Implement the relevant interface(s) in `src/providers/interfaces.ts` under `src/providers/<vendor>/`, mapping the vendor's wire format to the DTOs in `providers/types.ts` (money in whole units, `null` for missing, statements newest-first).
2. Select it in `server.ts` (or extend `PROVIDERS` in `config.ts`). No service, route or contract changes.

## Known limits (honest list)

- Only the mock provider exists; no real vendor is integrated or tested.
- Postgres repositories (`src/store/pg.ts`) are tested against `pg-mem`, not a live Postgres/Supabase. Only the watchlist and curated analysis use the DB; `provider_snapshots` is in the schema but unused.
- Cache is in-memory. `CacheBackend` is the seam for Redis (JSON values); no Redis implementation is included. Rate limiting is per-process.
- Screener, sectors and peers run over the *covered* universe (29 companies here). At real S&P 500 scale, back the universe with a bulk provider endpoint or a precomputed table; the `UniverseService` seam is where that goes. Sector medians use S&P 500 members in the same sector.
- Auth is static bearer tokens from `AUTH_TOKENS` (placeholder for a real identity provider).
- Analysis text is draft copy for the eight launch tickers; other tickers return 404 rather than invented content.
- `/sectors` `averageReturn` and `medianReturn` are 1-day returns.
