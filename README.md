# Math Coach

An iPad-friendly web app for daily math drill practice, inspired by the Kumon method. Coaches (parents/teachers) create and assign structured drill tasks to students. Every attempt is recorded and visualised in a progress report.

🌐 **Live demo:** [https://math-coach-nu.vercel.app/](https://math-coach-nu.vercel.app/)

---

## About This Project

> **This project is a proof of concept for AI-assisted software development.**
>
> The owner wrote **zero lines of code**. Every line of application code, database schema, tests, configuration, and deployment setup was written entirely by **[Claude Code](https://claude.ai/code)** (Anthropic's AI coding agent) through natural language conversations.
>
> The goal was to explore how far an AI coding agent can take a real-world project — from blank canvas to a fully deployed, production-ready web app — with a non-developer acting purely as the product owner: describing requirements, reviewing decisions, and approving changes.

---

## Features

- **Profile picker** — Netflix-style, no login required
- **Coach dashboard** — create tasks, assign to one or more students, view all progress
- **Student dashboard** — work on assigned tasks or create your own
- **Multiplication drill** — 1–15 × 1–15 grid (225 facts), configurable question count (30 / 60 / 90)
- **Train / Test mode** — Train: timer turns yellow at limit, keep going; Test: auto-submits at limit
- **3-tier grading** — Pass / Good / Master thresholds per task
- **Report module** — score trend chart + full attempt history per task

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Neon (serverless PostgreSQL) + Prisma 7 |
| Charts | Recharts |
| Deploy | Vercel |

---

## Local Development

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) project **or** Docker (for local Postgres)

### Setup

```bash
# 1. Clone
git clone https://github.com/LesterYKTam/mathCoach.git
cd mathCoach

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in DATABASE_URL and DIRECT_URL
```

**.env (Option A — Neon):**
```
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

**.env (Option B — local Docker Postgres):**
```bash
docker compose up -d   # starts Postgres 16 on localhost:5432
```
```
DATABASE_URL="postgresql://mathcoach:mathcoach@localhost:5432/mathcoach"
DIRECT_URL="postgresql://mathcoach:mathcoach@localhost:5432/mathcoach"
```

```bash
# 4. Run migrations and seed
npm run db:migrate     # creates tables
npm run db:seed        # adds 1 coach + 2 students (Ella, Nathan)

# 5. Start the dev server
npm run dev            # http://localhost:3000
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations (uses DIRECT_URL) |
| `npm run db:seed` | Seed database with sample profiles |
| `npm test` | Run unit tests (Vitest) |

---

## Deploy

Push to `main` — Vercel auto-deploys.

```
git push origin main
```

The Vercel build runs:
1. `npm install` → `prisma generate` (via postinstall)
2. `prisma migrate deploy` → applies any pending migrations
3. `next build` → optimised production build

**Required Vercel environment variables:**
- `DATABASE_URL` — pooled Neon connection string
- `DIRECT_URL` — direct Neon connection string (for migrations)

---

## Project Structure

```
src/
├── app/                  Next.js App Router pages + server actions
│   ├── coach/            Coach dashboard, task creation, reports
│   └── student/          Student dashboard, task attempt, reports
├── components/           Shared UI components
├── generated/prisma/     Auto-generated Prisma client (gitignored)
├── lib/
│   ├── db.ts             Prisma singleton (PrismaNeon adapter)
│   ├── logger.ts         DEV / TEST / PRD logger
│   └── questionEngine.ts Question generation + grading logic
└── __tests__/            Vitest unit tests
prisma/
├── schema.prisma         Database schema
├── migrations/           Migration history
└── seed.mjs              Seed script
```
