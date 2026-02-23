# Math Coach — Dev Plan

_Last updated: 2026-02-21_
_Read alongside: `claude/context/project_brief.md` for full product context_

---

## Status

**Phase 1 — COMPLETE ✅**
All 10 steps finished. TypeScript clean (`tsc --noEmit` exits 0).
Next: end-to-end manual test, then Phase 2 planning.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite + Prisma ORM |
| Charts | Recharts |
| Runtime | Node.js |

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
questions       Json     // Array of { id, operand1, operand2, answer }
config          Json     // Task-type-specific config (see below)
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
  - Next.js 14, TypeScript, Tailwind, App Router, shadcn/ui, Recharts
  - Prisma 7 with better-sqlite3 adapter (see MEMORY.md for adapter gotcha)
  - `src/lib/logger.ts` — DEV/TEST/PRD logger

- [x] **Step 2 — Database schema** ✅
  - Prisma schema: Profile, Task, Attempt, AttemptAnswer
  - Migration applied; DB at `./dev.db`
  - Seed: `node prisma/seed.mjs` → 1 coach (Coach) + 2 students (Alice, Bob)

- [x] **Step 3 — Profile picker screen (`/`)** ✅
  - Server Component fetches profiles; ProfileCard is a Client Component
  - Cookie-based session (`profileId`, `profileRole`); navigates to /coach or /student/[id]

- [x] **Step 4 — Question engine (`lib/questionEngine.ts`)** ✅
  - `generateMultiplicationQuestions(selectedFacts, count)` — randomly draw from selected [a,b] pairs
  - `shuffleQuestions(questions)` — Fisher-Yates shuffle
  - `gradeAttempt(questions, answers)` — return score + grade tier
  - Unit-testable, pure functions, no DB dependency

- [x] **Step 5 — Task creation UI** ✅
  - `src/components/task/MultiplicationGrid.tsx` — 10×10 grid, row/col quick-select, Select All / Clear All
  - `src/components/task/TaskCreationForm.tsx` — count presets + slider, layout toggle, thresholds, preview, Regenerate, Save
  - `src/app/actions/tasks.ts` — `createTask` / `deactivateTask` server actions

- [x] **Step 6 — Coach dashboard (`/coach`)** ✅
  - `src/app/coach/page.tsx` — student roster, tasks per student, deactivate, new task link
  - `src/app/coach/tasks/new/page.tsx` — task creation page (passes `assignTo` query param)

- [x] **Step 7 — Student dashboard (`/student/[studentId]`)** ✅
  - `src/app/student/[studentId]/page.tsx` — assigned + self-created tasks, Create My Own Task button
  - `src/app/student/[studentId]/tasks/new/page.tsx` — student task creation

- [x] **Step 8 — Task attempt screen** ✅
  - `src/app/student/[studentId]/tasks/[taskId]/page.tsx` — server component loads task + questions
  - `src/app/student/[studentId]/tasks/[taskId]/AttemptClient.tsx` — countdown timer, input grid, auto-submit, Enter-key focus progression

- [x] **Step 9 — Results screen** ✅
  - Embedded in `AttemptClient.tsx` — grade badge, score, time, per-question breakdown, Try Again / Back
  - `src/app/actions/attempts.ts` — `submitAttempt` server action

- [x] **Step 10 — Report module** ✅
  - `src/components/ScoreTrendChart.tsx` — Recharts line chart with Pass/Good/Master reference lines
  - `src/components/ReportView.tsx` — server component: chart + attempt history table per task
  - `src/app/coach/reports/[studentId]/page.tsx` — coach report (verifies cookie)
  - `src/app/student/[studentId]/reports/page.tsx` — student report

---

## Key Conventions (summary — full detail in CLAUDE.md)

- Logger: always use `lib/logger.ts` with `[YYYY-MM-DD HH:mm:ss] [LEVEL]` format
- DEV logs behind env flag; PRD logs always active
- Read files before editing; prefer editing over creating new files
- Comment intent, not mechanics

---

## Completed Work

- All 10 steps complete as of 2026-02-21.
- TypeScript clean: `npx tsc --noEmit` → EXIT:0.
- Dev server: `node ./node_modules/next/dist/bin/next dev --port 3002` (or via `.claude/launch.json`).
- Seed: `node prisma/seed.mjs` → Coach + Alice + Bob.
- **Phase 1 test suite** (2026-02-22): 2 files, **34 tests — all passed** ✅
  - `src/__tests__/lib/questionEngine.test.ts` — 26 tests (shuffleArray, generateMultiplicationQuestions, shuffleQuestions, gradeAttempt)
  - `src/__tests__/lib/logger.test.ts` — 8 tests (format, level filtering, stderr routing)
  - Runner: Vitest (`npm test`)

---

## Blockers / Open Issues

- Prisma 7 adapter: pass `{ url }` config to `PrismaBetterSqlite3`, not a Database instance.
- preview_* tools crash on this machine; use curl + background task logs to verify.
