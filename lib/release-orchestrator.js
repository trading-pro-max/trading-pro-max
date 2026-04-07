import fs from "fs";
import path from "path";
import { getState, addLog } from "./state.js";
import { getEngineStatus } from "./engine.js";
import { readDb } from "./core-db.js";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "release-orchestrator.json");
const GROWTH_FILE = path.join(DATA_DIR, "growth-center.json");
const BACKBONE_FILE = path.join(DATA_DIR, "backbone.json");
const BACKUPS_FILE = path.join(DATA_DIR, "ops-backups.json");
const AUDIT_FILE = path.join(DATA_DIR, "ops-audit.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    ensureDir();
    if (!fs.existsSync(file)) {
      if (file === STORE_FILE) fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function n(x) {
  return Number(x || 0);
}

function readStore() {
  return readJson(STORE_FILE, {
    authorized: false,
    target: "GLOBAL_ALPHA",
    lastAuthorizationAt: null,
    notes: [],
    updatedAt: null
  });
}

function writeStore(x) {
  return writeJson(STORE_FILE, x);
}

function growthSnapshot() {
  const x = readJson(GROWTH_FILE, { customers: [], subscriptions: [], onboarding: [] });
  const customers = Array.isArray(x.customers) ? x.customers.length : 0;
  const activeSubscriptions = Array.isArray(x.subscriptions) ? x.subscriptions.filter(s => s.status === "ACTIVE").length : 0;
  const completedOnboarding = Array.isArray(x.onboarding) ? x.onboarding.filter(s => s.status === "COMPLETED").length : 0;
  return { customers, activeSubscriptions, completedOnboarding };
}

function backboneSnapshot() {
  const x = readJson(BACKBONE_FILE, { release: { readiness: 0 }, modules: [] });
  return {
    readiness: n(x.release?.readiness),
    modules: Array.isArray(x.modules) ? x.modules.length : 0
  };
}

function opsSnapshot() {
  const backups = readJson(BACKUPS_FILE, []);
  const audit = readJson(AUDIT_FILE, []);
  return {
    backups: Array.isArray(backups) ? backups.length : 0,
    audit: Array.isArray(audit) ? audit.length : 0
  };
}

export function buildReleaseBoard() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();
  const store = readStore();
  const growth = growthSnapshot();
  const backbone = backboneSnapshot();
  const ops = opsSnapshot();

  const watchlist = Array.isArray(db.watchlist) ? db.watchlist.length : 0;
  const alerts = Array.isArray(db.alerts) ? db.alerts.length : 0;
  const journal = Array.isArray(db.journal) ? db.journal.length : 0;
  const orders = Array.isArray(db.orders) ? db.orders.length : 0;
  const ledger = Array.isArray(db.ledger) ? db.ledger.length : 0;
  const brokers = Array.isArray(db.brokers) ? db.brokers.length : 0;
  const connectedBrokers = Array.isArray(db.brokers) ? db.brokers.filter(x => x.connected).length : 0;
  const users = Array.isArray(db.users) ? db.users.length : 0;

  const checkpoints = [
    {
      key: "core",
      title: "Core stability",
      critical: true,
      ok: state.status === "ONLINE" && (engine.running || n(state.metrics?.engineReadiness) >= 80),
      score: state.status === "ONLINE" ? Math.max(n(state.metrics?.engineReadiness), engine.running ? 88 : 72) : 35,
      detail: state.status + " · engine " + (engine.running ? "RUNNING" : "STOPPED")
    },
    {
      key: "operator",
      title: "Operator session",
      critical: true,
      ok: Boolean(db.session?.active) && Boolean(db.settings?.onboardingComplete),
      score: (db.session?.active ? 52 : 18) + (db.settings?.onboardingComplete ? 36 : 10),
      detail: (db.session?.active ? "active" : "inactive") + " · onboarding " + String(Boolean(db.settings?.onboardingComplete))
    },
    {
      key: "workspace",
      title: "Workspace depth",
      critical: false,
      ok: watchlist >= 5 && alerts >= 1 && journal >= 1,
      score: Math.min(100, 40 + watchlist * 6 + alerts * 8 + journal * 6),
      detail: "watchlist " + watchlist + " · alerts " + alerts + " · journal " + journal
    },
    {
      key: "execution",
      title: "Execution depth",
      critical: true,
      ok: orders >= 1 && ledger >= 1,
      score: Math.min(100, 34 + orders * 8 + ledger * 10),
      detail: "orders " + orders + " · ledger " + ledger
    },
    {
      key: "brokers",
      title: "Broker plane",
      critical: false,
      ok: brokers >= 1,
      score: Math.min(100, 45 + brokers * 8 + connectedBrokers * 10),
      detail: "registry " + brokers + " · connected " + connectedBrokers
    },
    {
      key: "growth",
      title: "Growth readiness",
      critical: false,
      ok: growth.customers >= 1 && growth.activeSubscriptions >= 1,
      score: Math.min(100, 30 + growth.customers * 12 + growth.activeSubscriptions * 18 + growth.completedOnboarding * 8),
      detail: "customers " + growth.customers + " · active subs " + growth.activeSubscriptions
    },
    {
      key: "guardian",
      title: "Guardian release gate",
      critical: true,
      ok: state.protection?.guardianStatus === "ARMED" && !state.protection?.liveTradingEnabled,
      score: (state.protection?.guardianStatus === "ARMED" ? 70 : 28) + (!state.protection?.liveTradingEnabled ? 24 : 0),
      detail: (state.protection?.guardianStatus || "UNKNOWN") + " · live " + String(Boolean(state.protection?.liveTradingEnabled))
    },
    {
      key: "backbone",
      title: "Backbone closure",
      critical: false,
      ok: backbone.readiness >= 70,
      score: Math.max(backbone.readiness, backbone.modules > 0 ? 62 : 20),
      detail: "readiness " + backbone.readiness + "% · modules " + backbone.modules
    },
    {
      key: "ops",
      title: "Recovery posture",
      critical: false,
      ok: ops.backups >= 1,
      score: Math.min(100, 34 + ops.backups * 20 + ops.audit * 2),
      detail: "backups " + ops.backups + " · audit events " + ops.audit
    }
  ].map(x => ({ ...x, score: Math.max(0, Math.min(100, Math.round(x.score))) }));

  const closed = checkpoints.filter(x => x.ok).length;
  const total = checkpoints.length;
  const criticalOpen = checkpoints.filter(x => x.critical && !x.ok).length;

  const readiness = Number((
    (
      checkpoints.reduce((s, x) => s + n(x.score), 0) / total +
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness)
    ) / 3
  ).toFixed(2));

  const eligible = criticalOpen === 0 && readiness >= 78;

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Release Orchestrator",
      progress: 86
    },
    authorization: {
      eligible,
      authorized: Boolean(store.authorized),
      target: store.target || "GLOBAL_ALPHA",
      lastAuthorizationAt: store.lastAuthorizationAt || null
    },
    summary: {
      closed,
      total,
      releaseReadiness: readiness,
      criticalOpen,
      users,
      orders,
      ledger,
      connectedBrokers,
      customers: growth.customers,
      activeSubscriptions: growth.activeSubscriptions
    },
    checkpoints,
    notes: Array.isArray(store.notes) ? store.notes.slice(0, 20) : [],
    updatedAt: new Date().toISOString()
  };
}

export function buildReleaseSteps() {
  const board = buildReleaseBoard();
  const steps = [];

  board.checkpoints
    .filter(x => !x.ok)
    .sort((a, b) => Number(b.critical) - Number(a.critical))
    .forEach((x) => {
      steps.push({
        title: x.title,
        priority: x.critical ? "CRITICAL" : "HIGH",
        detail: x.detail,
        action:
          x.key === "core" ? "KEEP_ENGINE_RUNNING" :
          x.key === "operator" ? "ACTIVATE_OPERATOR_SESSION" :
          x.key === "workspace" ? "EXPAND_WORKSPACE_DEPTH" :
          x.key === "execution" ? "DEEPEN_EXECUTION_HISTORY" :
          x.key === "brokers" ? "EXPAND_BROKER_REGISTRY" :
          x.key === "growth" ? "ACTIVATE_CLIENT_SUBSCRIPTIONS" :
          x.key === "guardian" ? "KEEP_LIVE_GATED_AND_GUARDIAN_ARMED" :
          x.key === "backbone" ? "CLOSE_BACKBONE_GATES" :
          "INCREASE_BACKUPS"
      });
    });

  if (steps.length === 0) {
    steps.push({
      title: "Release lane clear",
      priority: "LOW",
      detail: "all current gates are closed",
      action: "MAINTAIN_RELEASE_DISCIPLINE"
    });
  }

  return steps;
}

export function authorizeRelease(payload = {}) {
  const board = buildReleaseBoard();
  const store = readStore();
  const action = String(payload.action || "AUTHORIZE").trim().toUpperCase();
  const note = String(payload.note || "").trim();

  if (action === "RESET") {
    const next = {
      ...store,
      authorized: false,
      lastAuthorizationAt: null,
      updatedAt: new Date().toISOString()
    };
    if (note) next.notes.unshift({ time: new Date().toISOString(), text: "RESET -> " + note });
    writeStore(next);
    addLog("RELEASE -> AUTHORIZATION RESET");
    return buildReleaseBoard();
  }

  const next = {
    ...store,
    authorized: Boolean(board.authorization.eligible),
    lastAuthorizationAt: board.authorization.eligible ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString()
  };

  if (note) {
    next.notes.unshift({ time: new Date().toISOString(), text: "NOTE -> " + note });
  } else {
    next.notes.unshift({
      time: new Date().toISOString(),
      text: board.authorization.eligible ? "AUTHORIZED -> target " + next.target : "AUTHORIZATION BLOCKED -> open critical gates remain"
    });
  }

  next.notes = next.notes.slice(0, 50);
  writeStore(next);
  addLog(board.authorization.eligible ? "RELEASE -> AUTHORIZED" : "RELEASE -> BLOCKED");
  return buildReleaseBoard();
}
