import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth-real";

export const rbacRouter = Router();

rbacRouter.get("/roles", requireAuth, (request, response) => {
  return response.json({
    ok: true,
    roles: (request as any).authUser?.roles || []
  });
});

rbacRouter.get("/admin-check", requireAuth, requireRole("admin"), (_request, response) => {
  return response.json({
    ok: true,
    admin: true
  });
});
