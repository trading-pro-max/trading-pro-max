import { Router } from "express";
import { type PresetMode } from "@trading-pro-max/shared";
import { requireAuth } from "../middleware/auth";
import {
  addJournalEntry,
  applyPreset,
  executeSignal,
  generateSignal,
  getCloudLayer,
  getDataLayer,
  getEngineLayer,
  getIntegrationLayer,
  getJournal,
  getLedger,
  getOpsLayer,
  getOverview,
  getPhases,
  getReport,
  getSignals,
  getStudioLayer,
  setEngineStatus
} from "../lib/trading";
import { revokeToken } from "../lib/auth";

export const privateRouter = Router();
privateRouter.use(requireAuth);

privateRouter.get("/auth/me", (request, response) => {
  response.json({ user: request.user });
});

privateRouter.post("/auth/logout", async (request, response) => {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  await revokeToken(token);
  response.json({ ok: true });
});

privateRouter.get("/overview", async (_request, response) => {
  response.json(await getOverview());
});

privateRouter.get("/phases", (_request, response) => {
  response.json(getPhases());
});

privateRouter.get("/signals", async (_request, response) => {
  response.json(await getSignals());
});

privateRouter.post("/signals/generate", async (_request, response) => {
  const signal = await generateSignal();
  response.status(201).json(signal);
});

privateRouter.post("/signals/:signalId/execute", async (request, response) => {
  const entry = await executeSignal(request.params.signalId);
  if (!entry) {
    response.status(404).json({ error: "Signal not found" });
    return;
  }
  response.status(201).json(entry);
});

privateRouter.get("/ledger", async (_request, response) => {
  response.json(await getLedger());
});

privateRouter.get("/journal", async (_request, response) => {
  response.json(await getJournal());
});

privateRouter.post("/journal", async (request, response) => {
  const text = String(request.body?.text ?? "").trim();
  if (!text) {
    response.status(400).json({ error: "text is required" });
    return;
  }
  await addJournalEntry(text);
  response.status(201).json({ ok: true });
});

privateRouter.post("/engine/status", async (request, response) => {
  const nextStatus = request.body?.status;
  if (nextStatus !== "running" && nextStatus !== "paused" && nextStatus !== "stopped") {
    response.status(400).json({ error: "Invalid engine status" });
    return;
  }
  await setEngineStatus(nextStatus);
  response.json({ ok: true, status: nextStatus });
});

privateRouter.post("/presets/apply", async (request, response) => {
  const preset = request.body?.preset as PresetMode;
  if (!["balanced", "aggressive", "safe", "otc"].includes(preset)) {
    response.status(400).json({ error: "Invalid preset" });
    return;
  }
  await applyPreset(preset);
  response.json({ ok: true, preset });
});

privateRouter.get("/report", async (_request, response) => {
  response.type("text/plain").send(await getReport());
});

privateRouter.get("/data/overview", (_request, response) => {
  response.json(getDataLayer());
});

privateRouter.get("/engine/overview", async (_request, response) => {
  response.json(await getEngineLayer());
});

privateRouter.get("/studio/overview", async (_request, response) => {
  response.json(await getStudioLayer());
});

privateRouter.get("/ops/overview", async (_request, response) => {
  response.json(await getOpsLayer());
});

privateRouter.get("/cloud/overview", async (_request, response) => {
  response.json(await getCloudLayer());
});

privateRouter.get("/integrations/overview", (_request, response) => {
  response.json(getIntegrationLayer());
});

