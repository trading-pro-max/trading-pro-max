import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
export { hashPassword, verifyPassword } from "./password";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabaseUrl = process.env.DATABASE_URL ?? `file:${path.resolve(__dirname, "../prisma/dev.db")}`;
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";

