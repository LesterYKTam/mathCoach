# Math Coach — Lessons Learned

_Last updated: 2026-02-23_
_Scope: Errors and fixes encountered during infra setup (Neon + Vercel deploy)_

---

## 1. Prisma 7: `url` must NOT be in `schema.prisma`

**Error:**
```
Error code: P1012
The datasource property `url` is no longer supported in schema files.
Move connection URLs to `prisma.config.ts`.
```

**Root cause:** Prisma 7 removed `url` and `directUrl` from the schema datasource block.

**Fix:** `schema.prisma` datasource keeps only `provider`:
```prisma
datasource db {
  provider = "postgresql"
  // No url here — Prisma 7 reads it from prisma.config.ts
}
```
Put the URL in `prisma.config.ts` instead:
```typescript
datasource: {
  url: process.env["DIRECT_URL"], // direct connection for migrations
},
```

---

## 2. Neon: use `DIRECT_URL` (not pooled) for migrations

**Error:** Migrations hung or failed with connection errors when using the pooled URL.

**Root cause:** Neon's PgBouncer pooler doesn't support the long-lived transactions Prisma migrations require.

**Fix:** Two separate env vars:
```
DATABASE_URL  = pooled URL   (ep-xxx-pooler.region.aws.neon.tech)  ← runtime queries
DIRECT_URL    = direct URL   (ep-xxx.region.aws.neon.tech)         ← prisma migrate
```
`prisma.config.ts` uses `DIRECT_URL`. The app's `db.ts` uses `DATABASE_URL` via the adapter.

---

## 3. Neon: remove `channel_binding=require` from `DATABASE_URL`

**Error:** `@neondatabase/serverless` Pool silently failed to connect when the URL included `channel_binding=require`.

**Root cause:** Neon's dashboard generates connection strings with `channel_binding=require` for enhanced TLS security, but the neon serverless WebSocket driver doesn't implement this protocol parameter.

**Fix:** Strip `channel_binding=require` from `DATABASE_URL` (the pooled runtime URL):
```
# ✅ Works
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# ❌ Fails with neon serverless driver
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&channel_binding=require"
```
`DIRECT_URL` (used by Prisma migrate via standard pg protocol) can keep it if needed.

---

## 4. Prisma 7: `PrismaNeon` takes a config object, not a `Pool` instance

**Error:**
```
Error: No database host or connection string was set, and key parameters
have default values (host: localhost, user: leste, db: leste, password: null)
```

**Root cause:** In `@prisma/adapter-neon` v7.x the constructor signature changed:
```typescript
// Prisma 7 — PrismaNeon creates the Pool internally
constructor(config: PoolConfig, options?: NeonAdapterOptions)
```
We were passing a pre-created `Pool` instance as `config`, so the adapter did
`new Pool(poolInstance)` — which has no `connectionString` and fell back to localhost defaults.

**Fix:**
```typescript
// ❌ WRONG (old pattern — passes Pool instance)
const pool = new Pool({ connectionString: url });
const adapter = new PrismaNeon(pool);

// ✅ CORRECT (Prisma 7 — pass config, adapter creates Pool internally)
const adapter = new PrismaNeon({ connectionString: url });
```

---

## 5. `ws` WebSocket polyfill: conditionally apply on Node < 21 only

**Error:** Unconditionally importing and setting `neonConfig.webSocketConstructor = ws` caused
subtle connection failures on Node.js 24 (which has native WebSocket built in).

**Root cause:** Node.js 21+ ships with native `WebSocket`. Forcing the `ws` polyfill on top
of native WebSocket creates a conflict in the neon serverless driver's transport layer.

**Fix:** Apply the polyfill only when native WebSocket is absent:
```typescript
// ✅ Correct — conditional polyfill
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = require("ws"); // Node < 21 (e.g. Vercel Node 20)
}
// Node 24 locally and Node 21+ skip this block — native WebSocket used instead
```

---

## 6. Vercel: generated Prisma client is gitignored — must be regenerated at build time

**Error:**
```
Module not found: Can't resolve '@/generated/prisma/client'
```

**Root cause:** `src/generated/prisma/` is in `.gitignore` (correct — it's a build artifact).
On the first (broken) deploy, the old `schema.prisma` had `url = env("DATABASE_URL")` which
is invalid in Prisma 7, so `postinstall: prisma generate` failed silently. Next.js then
built without the generated client.

**Fix (two parts):**
1. Fix `schema.prisma` so `prisma generate` succeeds (see lesson #1 above).
2. Ensure `postinstall` in `package.json` runs `prisma generate`:
```json
"postinstall": "prisma generate"
```
This runs automatically after every `npm install`, including on Vercel, so the client is
always generated before the build.

---

## 7. Vercel: commit `vercel.json` or the wrong build command runs

**Error:** Vercel ran `npm run build` (`next build` only) instead of `npm run vercel-build`
(`prisma migrate deploy && next build`). Migrations were skipped.

**Root cause:** `vercel.json` was created locally but never committed to git. Vercel cloned
the repo without it and fell back to its default Next.js build command.

**Fix:** Commit `vercel.json` with an explicit `buildCommand`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run vercel-build",
  "installCommand": "npm install"
}
```

---

## 8. Vercel: ESLint errors fail the production build

**Errors:**
```
'vi' is defined but never used.  @typescript-eslint/no-unused-vars
'auto' is assigned a value but never used.  @typescript-eslint/no-unused-vars
```

**Root cause:** Next.js runs ESLint as part of `next build`. Warnings locally can become
hard failures in production if the lint config treats `no-unused-vars` as an error.

**Fixes:**
- Remove genuinely unused imports (e.g. `vi` from vitest — was imported but not called).
- For intentionally unused parameters (e.g. `auto` in `handleSubmit` — kept for caller
  semantics but not yet read in the body), use an eslint-disable comment:
```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleSubmit = useCallback(async (_auto = false) => {
```
Note: prefixing with `_` alone is NOT sufficient — the ESLint rule must be configured to
ignore `_`-prefixed names, or a disable comment is needed.

---

## Quick Reference Checklist for Future Deploys

- [ ] `schema.prisma` datasource: `provider` only, no `url`
- [ ] `prisma.config.ts` datasource: `url = DIRECT_URL`
- [ ] `db.ts`: `new PrismaNeon({ connectionString: url })` (config object, not Pool)
- [ ] `db.ts`: ws polyfill behind `typeof WebSocket === "undefined"` guard
- [ ] `DATABASE_URL`: pooled URL, no `channel_binding=require`
- [ ] `DIRECT_URL`: direct URL (no `-pooler`), set in both `.env` and Vercel dashboard
- [ ] `vercel.json` committed with `buildCommand: npm run vercel-build`
- [ ] `postinstall: prisma generate` in `package.json`
- [ ] No ESLint `no-unused-vars` errors in source or test files
