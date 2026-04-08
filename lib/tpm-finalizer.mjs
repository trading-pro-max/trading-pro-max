import fs from "fs";
import path from "path";
import { getMissionControl } from "./tpm-mission.mjs";
import { pulseModule } from "./tpm-runtime.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const FINALIZER_FILE = path.join(TPM_DIR, "finalizer.json");

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

export function getFinalizerState() {
  return readJson(FINALIZER_FILE, {
    enabled: true,
    threshold: 97,
    maxClosures: 8,
    closeMinReadiness: 96,
    lastActionAt: null,
    lastAction: null
  });
}

export function setFinalizerState(payload = {}) {
  const current = getFinalizerState();
  const next = {
    ...current,
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled,
    threshold: payload.threshold !== undefined ? Math.max(90, Math.min(100, Number(payload.threshold || current.threshold || 97))) : current.threshold,
    maxClosures: payload.maxClosures !== undefined ? Math.max(1, Number(payload.maxClosures || current.maxClosures || 8)) : current.maxClosures,
    closeMinReadiness: payload.closeMinReadiness !== undefined ? Math.max(85, Math.min(100, Number(payload.closeMinReadiness || current.closeMinReadiness || 96))) : current.closeMinReadiness,
    lastActionAt: current.lastActionAt || null,
    lastAction: current.lastAction || null
  };

  writeJson(FINALIZER_FILE, next);
  return getFinalizerMission();
}

export function runFinalizerOnce() {
  const current = getFinalizerState();

  if (!current.enabled) {
    return getFinalizerMission();
  }

  const mission = getMissionControl();
  const candidates = (mission.closeReady || [])
    .filter((m) => n(m.progress) >= n(current.threshold) && n(m.readiness) >= n(current.closeMinReadiness))
    .slice(0, n(current.maxClosures || 8));

  const touched = [];

  for (const m of candidates) {
    const remaining = Math.max(0, 100 - n(m.progress));
    if (remaining <= 0) continue;
    const result = pulseModule(m.slug, remaining, "finalizer-close");
    if (result) touched.push(result);
  }

  const next = {
    ...current,
    lastActionAt: new Date().toISOString(),
    lastAction: {
      closed: touched.length,
      threshold: current.threshold,
      closeMinReadiness: current.closeMinReadiness
    }
  };

  writeJson(FINALIZER_FILE, next);
  return getFinalizerMission();
}

export function getFinalizerMission() {
  return {
    ok: true,
    finalizer: getFinalizerState(),
    mission: getMissionControl(),
    updatedAt: new Date().toISOString()
  };
}
