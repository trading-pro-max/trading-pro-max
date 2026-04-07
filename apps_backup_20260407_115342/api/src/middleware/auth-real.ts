import type { NextFunction, Request, Response } from "express";
import {
  getAccessCookieName,
  verifyAccessToken
} from "../lib/auth-real";

function readBearerToken(request: Request) {
  const header = request.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function readCookieToken(request: Request) {
  const cookies = (request as any).cookies || {};
  return cookies[getAccessCookieName()] || null;
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = readBearerToken(request) || readCookieToken(request);
    if (!token) {
      return response.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const payload = verifyAccessToken(token);
    (request as any).authUser = {
      email: payload.email,
      name: payload.name,
      roles: payload.roles
    };

    return next();
  } catch {
    return response.status(401).json({ ok: false, error: "Invalid session" });
  }
}

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = readBearerToken(request) || readCookieToken(request);
    if (!token) return next();

    const payload = verifyAccessToken(token);
    (request as any).authUser = {
      email: payload.email,
      name: payload.name,
      roles: payload.roles
    };
  } catch {}

  next();
}

export function requireRole(role: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const user = (request as any).authUser;
    if (!user) {
      return response.status(401).json({ ok: false, error: "Unauthorized" });
    }

    if (!Array.isArray(user.roles) || !user.roles.includes(role)) {
      return response.status(403).json({ ok: false, error: "Forbidden" });
    }

    return next();
  };
}
