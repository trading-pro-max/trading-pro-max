import { Router } from "express";
import {
  buildDemoUser,
  clearAuthCookies,
  getAccessCookieName,
  getAccessCookieOptions,
  getAuthConfig,
  getRefreshCookieName,
  getRefreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../lib/auth-real";
import { optionalAuth, requireAuth } from "../middleware/auth-real";

export const authRealRouter = Router();

authRealRouter.post("/login", (request, response) => {
  const cfg = getAuthConfig();
  const { email, password } = request.body || {};

  if (!email || !password) {
    return response.status(400).json({ ok: false, error: "Missing credentials" });
  }

  if (
    String(email).toLowerCase() !== cfg.demoEmail.toLowerCase() ||
    String(password) !== cfg.demoPassword
  ) {
    return response.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const user = buildDemoUser(String(email).toLowerCase());
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  response.cookie(getAccessCookieName(), accessToken, getAccessCookieOptions());
  response.cookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptions());

  return response.json({
    ok: true,
    user,
    accessToken
  });
});

authRealRouter.post("/refresh", (request, response) => {
  try {
    const cookies = (request as any).cookies || {};
    const refreshToken = cookies[getRefreshCookieName()];

    if (!refreshToken) {
      return response.status(401).json({ ok: false, error: "Missing refresh token" });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = buildDemoUser(payload.email);
    const accessToken = signAccessToken(user);

    response.cookie(getAccessCookieName(), accessToken, getAccessCookieOptions());

    return response.json({
      ok: true,
      user,
      accessToken
    });
  } catch {
    return response.status(401).json({ ok: false, error: "Invalid refresh token" });
  }
});

authRealRouter.post("/logout", (_request, response) => {
  clearAuthCookies(response);
  return response.json({ ok: true, loggedOut: true });
});

authRealRouter.get("/status", optionalAuth, (request, response) => {
  return response.json({
    ok: true,
    authenticated: Boolean((request as any).authUser),
    user: (request as any).authUser || null
  });
});

authRealRouter.get("/me", requireAuth, (request, response) => {
  return response.json({
    ok: true,
    user: (request as any).authUser
  });
});
