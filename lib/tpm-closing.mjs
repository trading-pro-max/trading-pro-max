import fs from "fs";
import path from "path";
import { getReleaseStatus, runReleaseNow } from "./tpm-release.mjs";
import { getMissionControl, getAutopilotMission, runAutopilotOnce } from "./tpm-mission.mjs";
import { getFinalizerMission, runFinalizerOnce } from "./tpm-finalizer.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CLOSING_FILE = path.join(TPM_DIR, "closing-map.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function n(x) {
  return Number(x || 0);
}

export function getClosingState() {
  return readJson(CLOSING_FILE, {
    enabled: true,
    rounds: 4,
    lastRunAt: null,
    lastRun: null
  });
}

export function setClosingState(payload = {}) {
  const current = getClosingState();
  const next = {
    ...current,
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled,
    rounds: payload.rounds !== undefined ? Math.max(1, Math.min(12, Number(payload.rounds || current.rounds || 4))) : current.rounds,
    lastRunAt: current.lastRunAt || null,
    lastRun: current.lastRun || null
  };

  writeJson(CLOSING_FILE, next);
  return getClosingMap();
}

export function getClosingMap() {
  const closing = getClosingState();
  const mission = getMissionControl();
  const release = getReleaseStatus();
  const autopilot = getAutopilotMission();
  const finalizer = getFinalizerMission();

  const blockers = (mission.blockers || []).slice(0, 12).map((m, i) => ({
    rank: i + 1,
    slug: m.slug,
    title: m.title,
    progress: n(m.progress),
    readiness: n(m.readiness),
    gap: Math.max(0, 100 - n(m.progress)),
    stage: m.stage
  }));

  const closeReady = (mission.closeReady || []).slice(0, 12).map((m, i) => ({
    rank: i + 1,
    slug: m.slug,
    title: m.title,
    progress: n(m.progress),
    readiness: n(m.readiness),
    remaining: Math.max(0, 100 - n(m.progress))
  }));

  const map = [
    { step: 1, title: "Autopilot push", status: autopilot.autopilot?.enabled ? "ACTIVE" : "PAUSED" },
    { step: 2, title: "Finalizer closure", status: finalizer.finalizer?.enabled ? "ACTIVE" : "PAUSED" },
    { step: 3, title: "Release gating", status: release.verdict || "UNKNOWN" },
    { step: 4, title: "Remaining blockers", status: `${mission.summary?.remainingModules || 0} modules` }
  ];

  return {
    ok: true,
    closing,
    release,
    mission,
    autopilot: autopilot.autopilot,
    finalizer: finalizer.finalizer,
    blockers,
    closeReady,
    map,
    updatedAt: new Date().toISOString()
  };
}

export function runCloseAll() {
  const closing = getClosingState();
  if (!closing.enabled) return getClosingMap();

  const rounds = Math.max(1, Number(closing.rounds || 4));
  const actions = [];

  for (let i = 0; i < rounds; i++) {
    const auto = runAutopilotOnce();
    const fin = runFinalizerOnce();
    const rel = runReleaseNow();

    actions.push({
      round: i + 1,
      jumpTouched: auto?.autopilot?.lastAction?.jumpTouched || 0,
      promoteTouched: auto?.autopilot?.lastAction?.promoteTouched || 0,
      closed: fin?.finalizer?.lastAction?.closed || 0,
      releaseScore: rel?.score || 0,
      verdict: rel?.verdict || "UNKNOWN"
    });
  }

  const next = {
    ...closing,
    lastRunAt: new Date().toISOString(),
    lastRun: actions
  };

  writeJson(CLOSING_FILE, next);
  return getClosingMap();
}
