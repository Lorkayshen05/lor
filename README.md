# AI Quest

A gamified learning platform for a Bachelor Year 2 student: Python → AI Agents,
technical English practice, CGPA/study tracking, and real project tracking —
all wrapped in an XP/level/streak/achievement system.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Prisma + SQLite** for the database (swap the `DATABASE_URL` in `.env` for
  Postgres/MySQL in production — the schema is provider-agnostic)
- Sandboxed Python execution (`python3` subprocess, isolated `-I -S` mode,
  5s timeout, throwaway temp dir) for grading coding quests

## Getting Started

```bash
npm install
npx prisma db push   # create the SQLite schema
npm run db:seed      # seed courses, quests, achievements, demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verifying changes

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # next build (also type-checks)
npm test           # node's built-in test runner via tsx, tests/**/*.test.ts
```

The test suite covers sandboxed grading (pass/fail/timeout), XP/level/streak
math, achievement unlocking, English-answer checking, and the CGPA practice-
question extractor — no test framework dependency needed.

## Project Structure

- `prisma/schema.prisma` — data models (User, Course, Module, Lesson, Quest,
  Question, Submission, Progress, Achievement, Mistake, Subject, StudyTask,
  Project, …)
- `prisma/seed.ts` — seeds the 10-step learning path (Python → Projects) with
  real, auto-graded Python quests, plus sample CGPA/project/leaderboard data
- `src/lib/sandbox.ts` — sandboxed code execution + test grading
- `src/lib/tutor.ts` — rule-based AI Tutor logic (Teach/Quiz/Hint/Debug/…)
- `src/app/*` — one route per page (`/dashboard`, `/courses`, `/course/[id]`,
  `/quest/[id]`, `/english`, `/cgpa`, `/projects`, `/profile`, `/leaderboard`)

## Notes on scope (MVP decisions)

- **Single demo user, no login.** The app auto-provisions one learner account
  on first request. Swapping in real auth later just means replacing
  `getOrCreateDemoUser()` in `src/lib/user.ts` with a session lookup.
- **AI Tutor is rule-based**, not LLM-backed, so the MVP runs with zero API
  keys. `/api/tutor` is the single seam where a real model call could replace
  the heuristic reply.
- **Code sandboxing is process-level isolation** (isolated Python subprocess,
  timeout, throwaway dir), not a full VM/container sandbox. Good enough for a
  single-tenant demo container; a multi-tenant production deploy should push
  execution to a dedicated worker (gVisor/Firecracker/Judge0-style service).
