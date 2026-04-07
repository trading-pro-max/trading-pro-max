import "dotenv/config";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? `file:${path.resolve(process.cwd(), "packages/db/prisma/dev.db")}`;
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}
if (!process.env.AUTH_TOKEN_SECRET) {
  process.env.AUTH_TOKEN_SECRET = "trading-pro-max-dev-secret-change-me";
}

export const config = {
  appName: "Trading Pro Max API",
  port: Number(process.env.PORT ?? 8787),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  databaseUrl,
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? "trading-pro-max-dev-secret-change-me",
  authTokenTtlHours: Number(process.env.AUTH_TOKEN_TTL_HOURS ?? 24),
  demoUser: {
    email: process.env.DEMO_USER_EMAIL ?? "admin@tradingpromax.local",
    password: process.env.DEMO_USER_PASSWORD ?? "admin123",
    name: process.env.DEMO_USER_NAME ?? "Trading Pro Max Admin"
  }
} as const;

