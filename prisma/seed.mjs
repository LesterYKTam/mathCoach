/**
 * Seed script — runs with: node prisma/seed.mjs
 * Uses better-sqlite3 directly to avoid Prisma 7 ESM/WASM loading issues in Node.
 * Creates: 1 coach + 2 students.
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load DATABASE_URL from .env manually (no dotenv needed)
const envPath = path.resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf8");
const urlMatch = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m);
const rawUrl = urlMatch ? urlMatch[1] : "file:./dev.db";
const dbPath = path.resolve(__dirname, "..", rawUrl.replace(/^file:/, ""));

const Database = require("better-sqlite3");
const db = new Database(dbPath);

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

log("DEV", "Seed starting — wiping existing data");

// Clear in dependency order
db.prepare("DELETE FROM AttemptAnswer").run();
db.prepare("DELETE FROM Attempt").run();
db.prepare("DELETE FROM Task").run();
db.prepare("DELETE FROM Profile WHERE role = 'STUDENT'").run();
db.prepare("DELETE FROM Profile WHERE role = 'COACH'").run();

const now = new Date().toISOString();

const coachId = cuid();
db.prepare("INSERT INTO Profile (id, name, role, coachId, createdAt) VALUES (?, ?, ?, ?, ?)").run(
  coachId, "Coach", "COACH", null, now
);
log("DEV", `Created coach — id=${coachId}`);

const aliceId = cuid();
db.prepare("INSERT INTO Profile (id, name, role, coachId, createdAt) VALUES (?, ?, ?, ?, ?)").run(
  aliceId, "Alice", "STUDENT", coachId, now
);
log("DEV", `Created student — id=${aliceId}, name=Alice`);

const bobId = cuid();
db.prepare("INSERT INTO Profile (id, name, role, coachId, createdAt) VALUES (?, ?, ?, ?, ?)").run(
  bobId, "Bob", "STUDENT", coachId, now
);
log("DEV", `Created student — id=${bobId}, name=Bob`);

db.close();
log("PRD", "Seed complete — 1 coach, 2 students created");
