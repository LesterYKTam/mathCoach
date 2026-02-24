/**
 * Seed script — runs with: node prisma/seed.mjs
 *
 * Uses @neondatabase/serverless neon() HTTP driver directly (no Prisma client)
 * to avoid any ESM/bundler issues when running outside Next.js.
 *
 * Creates: 1 coach (Coach) + 2 students (Ella, Nathan).
 *
 * To seed dev:        node prisma/seed.mjs          (reads .env automatically)
 * To seed production: DATABASE_URL="postgresql://..." node prisma/seed.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env file (or fall back to process.env)
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  try {
    const envPath = path.resolve(__dirname, "../.env");
    const envContent = readFileSync(envPath, "utf8");
    const urlMatch = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m);
    databaseUrl = urlMatch ? urlMatch[1] : undefined;
  } catch {
    // .env not found — must be set via environment variable
  }
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env or pass it as an environment variable.");
}

const sql = neon(databaseUrl);

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
function log(level, msg) {
  console.log(`[${ts()}] [${level}] ${msg}`);
}

// Generate a cuid-like unique id (simplified)
function cuid() {
  return "c" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

async function seed() {
  log("DEV", "Seed starting — wiping existing data");

  // Clear tables in dependency order (foreign key constraints)
  await sql`DELETE FROM "AttemptAnswer"`;
  await sql`DELETE FROM "Attempt"`;
  await sql`DELETE FROM "Task"`;
  await sql`DELETE FROM "Profile" WHERE role = 'STUDENT'`;
  await sql`DELETE FROM "Profile" WHERE role = 'COACH'`;

  const now = new Date().toISOString();

  const coachId = cuid();
  await sql`
    INSERT INTO "Profile" (id, name, role, "coachId", "createdAt")
    VALUES (${coachId}, 'Coach', 'COACH', ${null}, ${now})
  `;
  log("DEV", `Created coach — id=${coachId}`);

  const ellaId = cuid();
  await sql`
    INSERT INTO "Profile" (id, name, role, "coachId", "createdAt")
    VALUES (${ellaId}, 'Ella', 'STUDENT', ${coachId}, ${now})
  `;
  log("DEV", `Created student — id=${ellaId}, name=Ella`);

  const nathanId = cuid();
  await sql`
    INSERT INTO "Profile" (id, name, role, "coachId", "createdAt")
    VALUES (${nathanId}, 'Nathan', 'STUDENT', ${coachId}, ${now})
  `;
  log("DEV", `Created student — id=${nathanId}, name=Nathan`);

  log("PRD", "Seed complete — 1 coach, 2 students created");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
