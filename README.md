# PlayGame

A gamified learning platform for the year-2 AI track: **Python → NumPy → Pandas → Math/Stats → DSA → Machine Learning → Deep Learning → Generative AI**. Every lesson ends in a graded coding quest with XP, levels, streaks, achievements, a mistake log and an AI tutor.

## Stack

Next.js 16 (App Router, server actions) · TypeScript · Tailwind CSS v4 · PostgreSQL + Prisma 7 · Auth.js v5 (credentials, JWT sessions) · Zod · CodeMirror 6 · Pyodide (sandboxed Python).

## How code execution is sandboxed

Learner code **never runs on the app server**. The server builds a self-contained Python harness (`src/lib/python/harness.ts`) and the browser executes it inside a Web Worker running Pyodide — CPython compiled to WebAssembly, with no filesystem, no network and no access to the server process. The worker is killed when a run exceeds its timeout, which is how infinite loops end.

Two grading modes:

| Mode | When | Behaviour |
| --- | --- | --- |
| Browser sandbox (default) | `SANDBOX_SERVICE_URL` unset | The browser runs every test and reports the outcome. The server validates that reported results map onto real test rows, then records the submission with `verified = false`. |
| Server-verified | `SANDBOX_SERVICE_URL` set | The server re-runs the same harness in an external sandbox service, hidden tests are never sent to the browser, and submissions are recorded with `verified = true`. |

The service contract is a single `POST` accepting `{ language, program, timeoutMs }` and returning `{ stdout, stderr }` — any isolated runner (container, Firecracker, Piston, …) can implement it.

## Setup

```bash
npm install --legacy-peer-deps      # npm 10's peer resolver needs this flag
cp .env.example .env                # then set DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy           # or: npm run db:migrate
npm run db:seed                     # 8 courses, 34 quests, 7 achievements, 2 demo users
npm run dev
```

Seeded logins: `admin@playgame.dev` / `admin1234` (admin) and `player@playgame.dev` / `player1234`.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `AUTH_SECRET` | yes | Auth.js session signing key (`openssl rand -base64 32`). |
| `SANDBOX_SERVICE_URL` | no | Enables authoritative server-side grading. |
| `SANDBOX_SERVICE_TOKEN` | no | Bearer token for that service. |
| `ANTHROPIC_API_KEY` | no | Enables the Claude-backed tutor; without it the built-in rule engine answers. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev, production build (copies the Pyodide runtime first), production server. |
| `npm run typecheck` / `lint` / `test` | TypeScript, ESLint, Vitest unit tests. |
| `npm run verify:quests` | Runs every seeded quest's reference solution against its own tests with local CPython. |
| `npm run smoke` | End-to-end browser run: register → quest → sandbox → submit → XP → admin. |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma workflows. |

## Game rules

- XP per quest: Easy 10 · Medium 20 · Hard 40 · Boss 100 (plus achievement bonuses).
- `level = floor(sqrt(xp / 100)) + 1`.
- Mastery per quest starts at 1.0 for a clean first solve and drops 0.15 per extra attempt and 0.1 per hint, floored at 0.2.
- Streaks are UTC-day based: same day is a no-op, the next day increments, a gap resets to 1.
- Every failed submission is stored as a `Mistake` (error, concept, correction, retry count) and resolved when the quest is cleared.

## Architecture

```
src/
  app/            routes (pages, /api/auth, /api/tutor) and server actions in app/actions
  components/     UI primitives, quest workspace, editor, tutor panel, forms
  lib/            pure domain logic: xp, streaks, achievements, mistakes, validation, rate limiting
  lib/python/     harness builder/parser shared by browser worker and server verification
  server/         data access and orchestration (progression, stats, quests, sandbox, tutor)
prisma/           schema, migrations, seed content (34 verified quests)
public/           sandbox-worker.js + the self-hosted Pyodide runtime (generated)
```

Security: every server action and route handler re-authenticates via `requireUser()` / `requireAdmin()`; `src/proxy.ts` is only an optimistic cookie check so protected shells never flash. All input is validated with Zod, submissions/hints/tutor calls are rate limited per user, and passwords are bcrypt-hashed.
