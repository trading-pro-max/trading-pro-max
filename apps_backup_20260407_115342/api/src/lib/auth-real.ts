import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";

export type AuthUser = {
  email: string;
  name: string;
  roles: string[];
};

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  kind: "access" | "refresh";
};

export function getAuthConfig() {
  return {
    accessSecret: process.env.AUTH_TOKEN_SECRET || "dev-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    issuer: process.env.JWT_ISSUER || "trading-pro-max",
    audience: process.env.JWT_AUDIENCE || "trading-pro-max-app",
    accessMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15),
    refreshDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
    cookieName: process.env.SESSION_COOKIE_NAME || "tpm_session",
    cookieSecure: String(process.env.SESSION_COOKIE_SECURE || "false").toLowerCase() === "true",
    cookieSameSite: (process.env.SESSION_COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax",
    adminEmail: process.env.RBAC_ADMIN_EMAIL || process.env.DEMO_USER_EMAIL || "admin@tradingpromax.local",
    demoEmail: process.env.DEMO_USER_EMAIL || "admin@tradingpromax.local",
    demoPassword: process.env.DEMO_USER_PASSWORD || "admin123",
    demoName: process.env.DEMO_USER_NAME || "Trading Pro Max Admin"
  };
}

export function resolveRoles(email: string) {
  const cfg = getAuthConfig();
  if (email.toLowerCase() === cfg.adminEmail.toLowerCase()) {
    return ["admin", "operator", "viewer"];
  }
  return ["viewer"];
}

export function buildDemoUser(email: string) {
  const cfg = getAuthConfig();
  return {
    email,
    name: cfg.demoName,
    roles: resolveRoles(email)
  };
}

export function signAccessToken(user: AuthUser) {
  const cfg = getAuthConfig();
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      roles: user.roles,
      kind: "access"
    },
    cfg.accessSecret,
    {
      subject: user.email,
      issuer: cfg.issuer,
      audience: cfg.audience,
      expiresIn: `${cfg.accessMinutes}m`
    }
  );
}

export function signRefreshToken(user: AuthUser) {
  const cfg = getAuthConfig();
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      roles: user.roles,
      kind: "refresh"
    },
    cfg.refreshSecret,
    {
      subject: user.email,
      issuer: cfg.issuer,
      audience: cfg.audience,
      expiresIn: `${cfg.refreshDays}d`
    }
  );
}

export function verifyAccessToken(token: string) {
  const cfg = getAuthConfig();
  return jwt.verify(token, cfg.accessSecret, {
    issuer: cfg.issuer,
    audience: cfg.audience
  }) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  const cfg = getAuthConfig();
  return jwt.verify(token, cfg.refreshSecret, {
    issuer: cfg.issuer,
    audience: cfg.audience
  }) as TokenPayload;
}

export function getAccessCookieName() {
  const cfg = getAuthConfig();
  return `${cfg.cookieName}_access`;
}

export function getRefreshCookieName() {
  const cfg = getAuthConfig();
  return `${cfg.cookieName}_refresh`;
}

export function getAccessCookieOptions(): CookieOptions {
  const cfg = getAuthConfig();
  return {
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: cfg.cookieSameSite,
    path: "/",
    maxAge: cfg.accessMinutes * 60 * 1000
  };
}

export function getRefreshCookieOptions(): CookieOptions {
  const cfg = getAuthConfig();
  return {
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: cfg.cookieSameSite,
    path: "/",
    maxAge: cfg.refreshDays * 24 * 60 * 60 * 1000
  };
}

export function clearAuthCookies(response: any) {
  response.clearCookie(getAccessCookieName(), { path: "/" });
  response.clearCookie(getRefreshCookieName(), { path: "/" });
}
