/**
 * Singleton Prisma client using PrismaNeon adapter (Prisma 7 + Neon PostgreSQL).
 * Import this module instead of constructing PrismaClient directly.
 *
 * Usage:
 *   import prisma from "@/lib/db";
 *
 * Prisma 7 API: PrismaNeon(config, options) — it creates the Pool internally.
 * Do NOT pass a Pool instance; pass the pool config object directly.
 *
 * WebSocket polyfill: only needed on Node.js < 21 (Vercel uses Node 20).
 * Node.js 21+ and local Node 24 have native WebSocket, no polyfill required.
 */
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import logger from "@/lib/logger";

// Only apply the ws polyfill on runtimes that lack native WebSocket (Node < 21)
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[db] DATABASE_URL is not set — check your .env file");
  logger.dev("[db] Connecting to PostgreSQL via Neon");
  // Pass the pool config directly — PrismaNeon creates the Pool internally (Prisma 7 API)
  const adapter = new PrismaNeon({ connectionString: url });
  return new PrismaClient({ adapter });
}

// In Next.js dev mode the module hot-reloads, so cache on globalThis to avoid
// opening a new pool on every HMR cycle.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
