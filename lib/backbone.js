import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readDb, writeDb } from "./core-db.js";
import { getState, addLog } from "./state.js";
import { getEngineStatus } from "./engine.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "backbone.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function makeId(prefix = "BB") {
  return prefix + "-" + randomUUID().slice(0, 8).toUpperCase();
}

function readJson(file, fallback) {
  try {
    ensureDir();
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
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

const DEFAULT_BACKBONE = {
  product: {
    name: "Trading Pro Max",
    version: "0.56.0-alpha",
    stage: "Production Backbone",
    targetProgress: 56
  },
  tenant: {
    name: "Trading Pro Max Global",
    region: "global",
    mode: "private-operator"
  },
  session: {
    active: false,
    userId: null,
    role: null,
    token: null,
    lastSeenAt: null
  },
  roles: ["OWNER", "ADMIN", "TRADER", "ANALYST", "RISK", "OPS"],
  users: [],
  flags: {
    auth: true,
    roles: true,
    workspace: true,
    execution: true,
    brokers: true,
    research: true,
    risk: true,
    analytics: true,
    autonomy: true,
    ops: true,
    releaseControl: true
  },
  modules: [],
  release: {
    closed: 0,
    total: 7,
    readiness: 0,
    updatedAt: null
  }
};

function normUser(x) {
  return {
    id: x?.id || makeId("USR"),
    name: x?.name || "Operator",
    email: x?.email || "",
    role: x?.role || "TRADER",
    status: x?.status || "ACTIVE",
    createdAt: x?.createdAt || new Date().toISOString()
  };
}

function normalize(x) {
  return {
    product: {
      ...DEFAULT_BACKBONE.product,
      ...(x?.product || {})
    },
    tenant: {
      ...DEFAULT_BACKBONE.tenant,
      ...(x?.tenant || {})
    },
    session: {
      ...DEFAULT_BACKBONE.session,
      ...(x?.session || {})
    },
    roles: Array.isArray(x?.roles) ? x.roles : DEFAULT_BACKBONE.roles,
    users: Array.isArray(x?.users) ? x.users.map(normUser) : [],
    flags: {
      ...DEFAULT_BACKBONE.flags,
      ...(x?.flags || {})
    },
    modules: Array.isArray(x?.modules) ? x.modules : [],
    release: {
      ...DEFAULT_BACKBONE.release,
      ...(x?.release || {})
    }
  };
}

export function readBackbone() {
  return normalize(readJson(FILE, DEFAULT_BACKBONE));
}

export function writeBackbone(x) {
  return writeJson(FILE, normalize(x));
}

export function mutateBackbone(mutator) {
  const current = readBackbone();
  const next = mutator(structuredClone(current)) || current;
  return writeBackbone(next);
}

function metricScore() {
  const s = getState();
  const values = [
    Number(s.metrics?.engineReadiness || 0),
    Number(s.metrics?.platformReadiness || 0),
    Number(s.metrics?.launchReadiness || 0),
    Number(s.metrics?.privateOperatorStack || 0)
  ];
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

export function buildModules() {
  const db = readDb();
  const s = getState();
  const e = getEngineStatus();

  const watchlist = Array.isArray(db.watchlist) ? db.watchlist.length : 0;
  const alerts = Array.isArray(db.alerts) ? db.alerts.length : 0;
  const journal = Array.isArray(db.journal) ? db.journal.length : 0;
  const orders = Array.isArray(db.orders) ? db.orders.length : 0;
  const ledger = Array.isArray(db.ledger) ? db.ledger.length : 0;
  const users = Array.isArray(db.users) ? db.users.length : 0;
  const brokers = Array.isArray(db.brokers) ? db.brokers.length : 0;
  const connectedBrokers = Array.isArray(db.brokers) ? db.brokers.filter(x => x.connected).length : 0;
  const paperTrades = Array.isArray(s.paperTrades) ? s.paperTrades.length : 0;

  return [
    { key: "war-room", title: "War Room", url: "/war-room", status: "ONLINE", score: Number(((metricScore() + 8) > 100 ? 100 : (metricScore() + 8)).toFixed(2)) },
    { key: "control", title: "Mission Control", url: "/control", status: s.status, score: Number(s.metrics?.platformReadiness || 0) },
    { key: "workspace", title: "Workspace", url: "/workspace", status: "ONLINE", score: Math.min(100, 62 + watchlist * 3 + alerts * 2 + journal * 2) },
    { key: "strategy-lab", title: "Strategy Lab", url: "/strategy-lab", status: "ONLINE", score: 74 },
    { key: "execution", title: "Execution", url: "/execution", status: "ONLINE", score: Math.min(100, 60 + orders * 3 + ledger * 4) },
    { key: "brokers", title: "Broker Hub", url: "/brokers", status: brokers > 0 ? "READY" : "BUILDING", score: Math.min(100, 58 + brokers * 4 + connectedBrokers * 8) },
    { key: "research", title: "Research", url: "/research", status: "ONLINE", score: Math.min(100, 60 + watchlist * 3 + alerts * 3) },
    { key: "risk", title: "Risk Center", url: "/risk", status: s.protection?.guardianStatus || "ARMED", score: s.protection?.guardianStatus === "ARMED" ? 88 : 62 },
    { key: "analytics", title: "Analytics", url: "/analytics", status: "ONLINE", score: Math.min(100, 60 + paperTrades * 2 + ledger * 3) },
    { key: "identity", title: "Identity", url: "/identity", status: db.session?.active ? "ACTIVE" : "READY", score: Math.min(100, 54 + users * 6 + (db.session?.active ? 18 : 0)) },
    { key: "ops", title: "Ops", url: "/ops", status: "ONLINE", score: 78 },
    { key: "autonomy", title: "Autonomy", url: "/autonomy", status: "ONLINE", score: 73 },
    { key: "backbone", title: "Production Backbone", url: "/backbone", status: "ACTIVE", score: 86 }
  ];
}

export function buildRelease() {
  const db = readDb();
  const s = getState();
  const e = getEngineStatus();

  const gates = [
    { name: "identity-session", ok: Boolean(db.session?.active), detail: db.session?.active ? "active" : "inactive" },
    { name: "onboarding", ok: Boolean(db.settings?.onboardingComplete), detail: String(Boolean(db.settings?.onboardingComplete)) },
    { name: "guardian-armed", ok: s.protection?.guardianStatus === "ARMED", detail: s.protection?.guardianStatus || "UNKNOWN" },
    { name: "engine-ready", ok: Boolean(e.running) || Number(s.metrics?.engineReadiness || 0) >= 80, detail: e.running ? "running" : "standby" },
    { name: "workspace-depth", ok: (db.watchlist || []).length >= 5 && (db.alerts || []).length >= 1, detail: "watchlist " + (db.watchlist || []).length + " / alerts " + (db.alerts || []).length },
    { name: "execution-depth", ok: (db.ledger || []).length >= 1, detail: "ledger " + (db.ledger || []).length },
    { name: "broker-registry", ok: Array.isArray(db.brokers) && db.brokers.length >= 1, detail: "brokers " + ((db.brokers || []).length) }
  ];

  const closed = gates.filter(x => x.ok).length;
  const total = gates.length;
  const readiness = Number(((closed / total) * 100).toFixed(2));

  return {
    closed,
    total,
    readiness,
    gates,
    updatedAt: new Date().toISOString()
  };
}

export function getBackboneStatus() {
  const bb = readBackbone();
  const modules = buildModules();
  const release = buildRelease();
  const db = readDb();

  return {
    ...bb,
    users: db.users || bb.users,
    session: db.session || bb.session,
    modules,
    release,
    progress: {
      current: 56,
      jumpClosed: true,
      label: "Production Backbone Mega Jump"
    },
    updatedAt: new Date().toISOString()
  };
}

export function bootstrapBackbone() {
  const db = readDb();

  let nextDb = db;

  if (!Array.isArray(db.users) || db.users.length === 0) {
    nextDb.users = [
      {
        id: makeId("USR"),
        name: "Global Operator",
        email: "owner@tradingpromax.ai",
        role: "OWNER",
        tier: "FOUNDING",
        status: "ACTIVE",
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  if (!nextDb.session?.active) {
    nextDb.session = {
      active: true,
      userId: nextDb.users[0].id,
      token: makeId("SESS"),
      lastLoginAt: new Date().toISOString()
    };
  }

  nextDb.settings = {
    ...(nextDb.settings || {}),
    theme: nextDb.settings?.theme || "dark",
    timezone: nextDb.settings?.timezone || "UTC",
    defaultRisk: nextDb.settings?.defaultRisk || "BALANCED",
    liveTrading: Boolean(nextDb.settings?.liveTrading),
    onboardingComplete: true
  };

  writeDb(nextDb);

  const modules = buildModules();
  const release = buildRelease();

  const bb = mutateBackbone((draft) => {
    draft.users = nextDb.users.map(normUser);
    draft.session = {
      active: true,
      userId: nextDb.session.userId,
      role: nextDb.users[0]?.role || "OWNER",
      token: nextDb.session.token,
      lastSeenAt: new Date().toISOString()
    };
    draft.modules = modules;
    draft.release = {
      closed: release.closed,
      total: release.total,
      readiness: release.readiness,
      updatedAt: release.updatedAt
    };
    return draft;
  });

  addLog("BACKBONE -> BOOTSTRAP COMPLETE");
  return {
    ...bb,
    modules,
    release,
    progress: {
      current: 56,
      jumpClosed: true,
      label: "Production Backbone Mega Jump"
    }
  };
}

export function activateBackboneSession(payload = {}) {
  const db = readDb();
  const email = String(payload.email || "owner@tradingpromax.ai").trim().toLowerCase();
  const name = String(payload.name || "Global Operator").trim();
  const role = String(payload.role || "OWNER").trim().toUpperCase();

  let nextDb = structuredClone(db);
  let user = (nextDb.users || []).find(x => String(x.email || "").toLowerCase() === email);

  if (!user) {
    user = {
      id: makeId("USR"),
      name,
      email,
      role,
      tier: "FOUNDING",
      status: "ACTIVE",
      onboardingComplete: true,
      createdAt: new Date().toISOString()
    };
    nextDb.users.unshift(user);
  }

  nextDb.session = {
    active: true,
    userId: user.id,
    token: makeId("SESS"),
    lastLoginAt: new Date().toISOString()
  };

  nextDb.settings = {
    ...(nextDb.settings || {}),
    onboardingComplete: true
  };

  writeDb(nextDb);

  const bb = mutateBackbone((draft) => {
    draft.users = nextDb.users.map(normUser);
    draft.session = {
      active: true,
      userId: user.id,
      role: user.role,
      token: nextDb.session.token,
      lastSeenAt: new Date().toISOString()
    };
    draft.modules = buildModules();
    draft.release = buildRelease();
    return draft;
  });

  addLog("BACKBONE -> SESSION ACTIVE");
  return bb;
}

export function endBackboneSession() {
  const db = readDb();
  db.session = {
    active: false,
    userId: null,
    token: null,
    lastLoginAt: null
  };
  writeDb(db);

  const bb = mutateBackbone((draft) => {
    draft.session = {
      active: false,
      userId: null,
      role: null,
      token: null,
      lastSeenAt: new Date().toISOString()
    };
    draft.modules = buildModules();
    draft.release = buildRelease();
    return draft;
  });

  addLog("BACKBONE -> SESSION ENDED");
  return bb;
}

export function addBackboneUser(payload = {}) {
  const db = readDb();
  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || "Operator").trim();
  const role = String(payload.role || "TRADER").trim().toUpperCase();

  if (!email) return getBackboneStatus();

  const exists = (db.users || []).find(x => String(x.email || "").toLowerCase() === email);
  if (!exists) {
    db.users.unshift({
      id: makeId("USR"),
      name,
      email,
      role,
      tier: "FOUNDING",
      status: "ACTIVE",
      onboardingComplete: false,
      createdAt: new Date().toISOString()
    });
    writeDb(db);
  }

  const bb = mutateBackbone((draft) => {
    draft.users = readDb().users.map(normUser);
    draft.modules = buildModules();
    draft.release = buildRelease();
    return draft;
  });

  addLog("BACKBONE -> USER ADDED " + email);
  return bb;
}
