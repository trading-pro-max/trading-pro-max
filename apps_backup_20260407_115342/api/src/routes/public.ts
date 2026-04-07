import { Router } from "express";
import { PHASES } from "@trading-pro-max/shared";
import { config } from "../config";
import { login, register } from "../lib/auth";
import { prisma } from "@/lib/db";

export const publicRouter = Router();

publicRouter.get("/health", async (_request, response) => {
  const workspace = await prisma.workspace.findFirst();
  response.json({
    ok: true,
    service: config.appName,
    time: new Date().toISOString(),
    workspace: workspace?.name ?? "Trading Pro Max",
    engineStatus: workspace?.engineStatus ?? "unknown"
  });
});

publicRouter.get("/config", (_request, response) => {
  response.json({
    appName: config.appName,
    port: config.port,
    demoUserEmail: config.demoUser.email,
    phaseCount: PHASES.length,
    databaseUrl: config.databaseUrl
  });
});

publicRouter.post("/auth/login", async (request, response) => {
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const password = String(request.body?.password ?? "").trim();
  const result = await login(email, password);

  if (!result) {
    response.status(401).json({ error: "Invalid credentials" });
    return;
  }

  response.json(result);
});

publicRouter.post("/auth/register", async (request, response) => {
  const name = String(request.body?.name ?? "").trim();
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const password = String(request.body?.password ?? "").trim();

  if (!name || !email || password.length < 6) {
    response.status(400).json({ error: "name, email, and password(>=6) are required" });
    return;
  }

  const result = await register(name, email, password);
  if ("error" in result) {
    response.status(409).json(result);
    return;
  }

  response.status(201).json(result);
});

