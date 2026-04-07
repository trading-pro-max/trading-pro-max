import type { NextFunction, Request, Response } from "express";
import { getUserFromToken, type SessionUser } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export async function requireAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const user = await getUserFromToken(token);

  if (!user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  request.user = user;
  next();
}

