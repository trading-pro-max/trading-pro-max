import { loadPlatformSecrets } from "@trading-pro-max/shared";

export type SecurityConfig = {
  appEnv: string;
  issuer: string;
  audience: string;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
  adminEmail: string;
  lockdown: boolean;
  cookie: {
    name: string;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    httpOnly: boolean;
  };
  rateLimit: {
    apiWindowMs: number;
    apiMax: number;
    authMax: number;
  };
  internalWebhookTokenConfigured: boolean;
};

export function getSecurityConfig(): SecurityConfig {
  const s = loadPlatformSecrets();

  return {
    appEnv: s.APP_ENV || process.env.NODE_ENV || "development",
    issuer: s.JWT_ISSUER || "trading-pro-max",
    audience: s.JWT_AUDIENCE || "trading-pro-max-app",
    accessTokenTtlMinutes: Number(s.ACCESS_TOKEN_TTL_MINUTES || 15),
    refreshTokenTtlDays: Number(s.REFRESH_TOKEN_TTL_DAYS || 7),
    adminEmail: s.SECURITY_ADMIN_EMAIL || "admin@tradingpromax.local",
    lockdown: String(s.SECURITY_LOCKDOWN || "true").toLowerCase() === "true",
    cookie: {
      name: s.SESSION_COOKIE_NAME || "tpm_session",
      secure: String(s.SESSION_COOKIE_SECURE || "false").toLowerCase() === "true",
      sameSite: (s.SESSION_COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax",
      httpOnly: true
    },
    rateLimit: {
      apiWindowMs: Number(s.API_RATE_LIMIT_WINDOW_MS || 60000),
      apiMax: Number(s.API_RATE_LIMIT_MAX || 120),
      authMax: Number(s.AUTH_RATE_LIMIT_MAX || 20)
    },
    internalWebhookTokenConfigured: Boolean(s.INTERNAL_WEBHOOK_TOKEN)
  };
}

export function getSecurityStatus() {
  const cfg = getSecurityConfig();

  return {
    ok: true,
    env: cfg.appEnv,
    lockdown: cfg.lockdown,
    adminEmail: cfg.adminEmail,
    issuer: cfg.issuer,
    audience: cfg.audience,
    accessTokenTtlMinutes: cfg.accessTokenTtlMinutes,
    refreshTokenTtlDays: cfg.refreshTokenTtlDays,
    cookie: cfg.cookie,
    rateLimit: cfg.rateLimit,
    internalWebhookTokenConfigured: cfg.internalWebhookTokenConfigured
  };
}
