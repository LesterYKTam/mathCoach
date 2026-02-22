/**
 * Singleton Prisma client using PrismaBetterSqlite3 adapter (Prisma 7 "client" engine).
 * Import this module instead of constructing PrismaClient directly.
 *
 * Usage:
 *   import prisma from "@/lib/db";
 *
 * Note: PrismaBetterSqlite3 takes a { url } config object — it opens the
 * better-sqlite3 Database internally. Do NOT pass a Database instance.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import logger from "@/lib/logger";

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  logger.dev(`[db] Opening SQLite database — url=${url}`);
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

// In Next.js dev mode the module hot-reloads, so cache on globalThis to avoid
// "too many connections" problems across HMR cycles.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
