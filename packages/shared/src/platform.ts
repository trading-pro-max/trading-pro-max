import fs from "node:fs";
import path from "node:path";

export type PlatformSecrets = {
  DATABASE_URL?: string;
  AUTH_TOKEN_SECRET?: string;
  DEMO_USER_EMAIL?: string;
  DEMO_USER_PASSWORD?: string;
  DEMO_USER_NAME?: string;
  PORT?: string;
  CORS_ORIGIN?: string;
  PUBLIC_BASE_URL?: string;
  API_BASE_URL?: string;
  WEBHOOK_PUBLIC_URL?: string;
  APP_ENV?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  STRIPE_SUCCESS_URL?: string;
  STRIPE_CANCEL_URL?: string;
  STRIPE_PORTAL_RETURN_URL?: string;
  GITHUB_REPOSITORY_URL?: string;
};

function safeReadJson(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseDotEnv(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const out: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      out[key] = value;
    }

    return out;
  } catch {
    return {};
  }
}

export function resolveRepoRoot() {
  return process.cwd();
}

export function loadPlatformSecrets(): PlatformSecrets {
  const root = resolveRepoRoot();
  const vaultPath = path.resolve(root, "secrets", "vault.local.json");
  const envPath = path.resolve(root, ".env");

  const vault = safeReadJson(vaultPath);
  const envFile = parseDotEnv(envPath);

  return {
    ...vault,
    ...envFile,
    ...process.env
  };
}

export function loadPlatformConfig() {
  const secrets = loadPlatformSecrets();
  const apiPort = Number(secrets.PORT || 8787);
  const publicBaseUrl = secrets.PUBLIC_BASE_URL || "http://localhost:5173";
  const apiBaseUrl = secrets.API_BASE_URL || `http://localhost:${apiPort}`;
  const webhookPublicUrl =
    secrets.WEBHOOK_PUBLIC_URL || `${apiBaseUrl}/api/payments/webhook`;

  return {
    appName: "Trading Pro Max",
    env: secrets.APP_ENV || process.env.NODE_ENV || "development",
    apiPort,
    webUrl: publicBaseUrl,
    apiUrl: apiBaseUrl,
    publicBaseUrl,
    webhookPublicUrl,
    databaseUrl: secrets.DATABASE_URL || "file:./packages/db/prisma/dev.db",
    corsOrigin: secrets.CORS_ORIGIN || "*",
    secrets
  };
}
