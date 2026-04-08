import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const STATE_FILE = path.join(TPM_DIR, "product-runtime.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function defaultState() {
  return {
    running: true,
    cycle: 0,
    users: 12,
    activeSessions: 4,
    workspaces: 3,
    subscriptions: 3,
    operatorQueue: 5,
    desktopCards: 6,
    mobileCards: 5,
    alerts: 2,
    updatedAt: nowIso()
  };
}

export function getProductRuntimeState() {
  return readJson(STATE_FILE, defaultState());
}

export function runProductRuntimeCycle() {
  const state = getProductRuntimeState();
  state.running = true;
  state.cycle = Number(state.cycle || 0) + 1;
  state.activeSessions = Number(state.activeSessions || 0) + 1;
  state.operatorQueue = Math.max(0, Number(state.operatorQueue || 0) + ((state.cycle % 2 === 0) ? -1 : 1));
  state.alerts = Number(state.alerts || 0) + 1;
  state.updatedAt = nowIso();
  writeJson(STATE_FILE, state);
  return getProductRuntimeStatus();
}

export function resetProductRuntime() {
  writeJson(STATE_FILE, defaultState());
  return getProductRuntimeStatus();
}

export function getProductRuntimeStatus() {
  const state = getProductRuntimeState();

  return {
    ok: true,
    runtime: {
      running: Boolean(state.running),
      cycle: Number(state.cycle || 0),
      updatedAt: state.updatedAt || nowIso()
    },
    metrics: {
      users: Number(state.users || 0),
      activeSessions: Number(state.activeSessions || 0),
      workspaces: Number(state.workspaces || 0),
      subscriptions: Number(state.subscriptions || 0),
      operatorQueue: Number(state.operatorQueue || 0),
      desktopCards: Number(state.desktopCards || 0),
      mobileCards: Number(state.mobileCards || 0),
      alerts: Number(state.alerts || 0)
    }
  };
}
