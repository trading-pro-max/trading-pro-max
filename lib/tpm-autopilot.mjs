import fs from "fs";
import path from "path";
import { getMissionControl, safeHugeJump, promoteCloseReady } from "./tpm-mission.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const AUTO_FILE = path.join(TPM_DIR, "autopilot.json");

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

function nowIso() {
  return new Date().toISOString();
}

export function getAutopilotState() {
  return readJson(AUTO_FILE, {
    enabled: true,
    mode: "MAX_SAFE",
    autoPromote: true,
    lastActionAt: null,
    lastAction: null
  });
}

export function setAutopilotState(payload = {}) {
  const current = getAutopilotState();
  const next = {
    ...current,
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled,
    mode: String(payload.mode || current.mode || "MAX_SAFE").trim().toUpperCase(),
    autoPromote: payload.autoPromote !== undefined ? Boolean(payload.autoPromote) : current.autoPromote,
    lastActionAt: current.lastActionAt || null,
    lastAction: current.lastAction || null
  };

  writeJson(AUTO_FILE, next);
  return getAutopilotMission();
}

export function runAutopilotOnce() {
  const current = getAutopilotState();

  if (!current.enabled) {
    return getAutopilotMission();
  }

  const jump = safeHugeJump({ mode: current.mode || "MAX_SAFE" });
  let promote = null;

  if (current.autoPromote) {
    promote = promoteCloseReady({ threshold: 95 });
  }

  const next = {
    ...current,
    lastActionAt: nowIso(),
    lastAction: {
      jumpTouched: jump?.touched?.length || 0,
      promoteTouched: promote?.touched?.length || 0
    }
  };

  writeJson(AUTO_FILE, next);
  return getAutopilotMission();
}

export function getAutopilotMission() {
  return {
    ok: true,
    autopilot: getAutopilotState(),
    mission: getMissionControl(),
    updatedAt: nowIso()
  };
}
