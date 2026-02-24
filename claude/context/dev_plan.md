# Math Coach — Dev Plan

_Last updated: 2026-02-23_
_Read alongside: `claude/context/project_brief.md` for full product context_

---

## Status

**Phase 1 — COMPLETE ✅**
All 10 steps finished. TypeScript clean. Tests passing (34/34).

**Infrastructure — COMPLETE ✅** (2026-02-23)
Neon PostgreSQL, Vercel deploy, GitHub → Vercel auto-deploy pipeline all live.

Next: Phase 2 planning (additional task types).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Neon (serverless PostgreSQL) + Prisma 7 ORM |
| Charts | Recharts |
| Runtime | Node.js |

---

## Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| App | Vercel | Next.js standalone; `vercel.json` sets `buildCommand: npm run vercel-build` |
| Database | Neon (serverless Postgres) | `DATABASE_URL` (pooled) + `DIRECT_URL` (direct, for migrations) |
| Deploy | git push origin main | Vercel auto-deploys; runs `prisma migrate deploy && next build` |
| Local dev | `npm run dev` + Neon or Docker | `docker-compose.yml` provides Postgres 16 at localhost:5432 |

**Key config files:** `vercel.json`, `docker-compose.yml`, `Dockerfile`, `prisma.config.ts`, `.env`

---

## Data Model

### Profile
```
id          String   @id @default(cuid())
name        String
role        Role     // COACH | STUDENT
coachId     String?  // null if coach; points to coach Profile if student
createdAt   DateTime
```

### Task
```
id              String   @id @default(cuid())
title           String
creatorId       String   // Profile.id
assignedToId    String?  // Profile.id of student; null = self-created by student
isActive        Boolean  @default(true)
taskType        String   // 'multiplication' (Phase 1 only)
timeLimit       Int      // seconds
passScore       Int      // minimum correct answers for Pass
goodScore       Int      // minimum correct answers for Good
masterScore     Int      // minimum correct answers for Master
questions       String   // JSON stored as TEXT: Array of { id, operand1, operand2, answer }
config          String   // JSON stored as TEXT: task-type-specific config (see below)
createdAt       DateTime
```

#### Task.config shape (Phase 1 — multiplication)
```json
{
  "selectedFacts": [[1,1],[1,2],...],  // selected [a,b] pairs from grid
  "questionCount": 60,
  "layout": "vertical" | "horizontal"
}
```

### Attempt
```
id          String   @id @default(cuid())
taskId      String
studentId   String   // Profile.id
startedAt   DateTime
completedAt DateTime?
timeTaken   Int?     // seconds; null if abandoned
score       Int?     // number correct; null if abandoned
grade       String?  // 'fail' | 'pass' | 'good' | 'master'; null if abandoned
```

### AttemptAnswer
```
id            String  @id @default(cuid())
attemptId     String
questionIndex Int     // index into Task.questions array
userAnswer    Int?    // null if skipped
isCorrect     Boolean
```

---

## Routes & Pages

```
/                              Profile picker (coach + all students)
/coach                         Coach dashboard — student roster + task list
/coach/tasks/new               Create task (multiplication grid UI)
/coach/students/[studentId]    Student detail — view tasks, assign new
/coach/reports/[studentId]     Report for a specific student
/student/[studentId]           Student dashboard — assigned + own tasks
/student/[studentId]/tasks/new Student creates own task (same UI as coach)
/student/[studentId]/tasks/[taskId]   Attempt a task
/student/[studentId]/reports   Student's own report
```

---

## Build Order (Phase 1)

- [x] **Step 1 — Project setup** ✅
- [x] **Step 2 — Database schema** ✅
- [x] **Step 3 — Profile picker screen (`/`)** ✅
- [x] **Step 4 — Question engine (`lib/questionEngine.ts`)** ✅
- [x] **Step 5 — Task creation UI** ✅
- [x] **Step 6 — Coach dashboard (`/coach`)** ✅
- [x] **Step 7 — Student dashboard (`/student/[studentId]`)** ✅
- [x] **Step 8 — Task attempt screen** ✅
- [x] **Step 9 — Results screen** ✅
- [x] **Step 10 — Report module** ✅

---

## Key Conventions (summary — full detail in CLAUDE.md)

- Logger: always use `lib/logger.ts` with `[YYYY-MM-DD HH:mm:ss] [LEVEL]` format
- DEV logs behind env flag; PRD logs always active
- Read files before editing; prefer editing over creating new files
- Comment intent, not mechanics

---

## Completed Work

### Phase 1 (2026-02-21 – 2026-02-22)
- All 10 steps complete.
- TypeScript clean: `npx tsc --noEmit` → EXIT:0.
- **Phase 1 test suite**: 2 files, **34 tests — all passed** ✅
  - `src/__tests__/lib/questionEngine.test.ts` — 26 tests
  - `src/__tests__/lib/logger.test.ts` — 8 tests
- Post-Phase 1 enhancements:
  - Multi-student task assignment
  - Multiplication grid expanded 1–9 → **1–15** (225 facts)
  - Question count presets: **30 / 60 / 90**
  - Train/Test mode with count-up timer

### Infrastructure (2026-02-23)
- **Migrated database:** SQLite → Neon serverless PostgreSQL
- **Prisma 7 lessons learned:**
  - `schema.prisma` datasource: `provider` only — NO `url`/`directUrl`
  - `prisma.config.ts`: `url = DIRECT_URL` (direct connection for migrations)
  - `PrismaNeon` v7 API: pass `{ connectionString }` config object — NOT a `Pool` instance
  - `ws` polyfill: conditional on `typeof WebSocket === "undefined"` (skip on Node 24+)
- **Vercel deploy pipeline:** `git push origin main` → auto-deploy
  - `postinstall: prisma generate` (generates `src/generated/prisma/`, gitignored)
  - `vercel-build: prisma migrate deploy && next build`
- **Seed data in Neon:** 1 coach + 2 students (Ella, Nathan)
- **GitHub:** https://github.com/LesterYKTam/mathCoach (commit: ae1be70)

---

## Blockers / Open Issues

- `preview_*` tools crash on this machine; use `curl` + background task logs to verify.
- 27 npm audit vulnerabilities (8 moderate, 19 high) — from dev deps (eslint, etc.). Not urgent.
