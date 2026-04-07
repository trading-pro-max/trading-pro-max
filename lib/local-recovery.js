import fs from "fs";
import path from "path";
import { readDb, writeDb } from "./core-db.js";
import { addLog } from "./state.js";

const DATA_DIR = path.join(process.cwd(), "data");
const GROWTH_FILE = path.join(DATA_DIR, "growth-center.json");
const BACKBONE_FILE = path.join(DATA_DIR, "backbone.json");
const BACKUPS_FILE = path.join(DATA_DIR, "ops-backups.json");
const AUDIT_FILE = path.join(DATA_DIR, "ops-audit.json");
const SNAPSHOTS_FILE = path.join(DATA_DIR, "local-recovery-snapshots.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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

function n(x) {
  return Number(x || 0);
}

function id(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

function ts() {
  return new Date().toISOString();
}

function readGrowth() {
  return readJson(GROWTH_FILE, {
    plans: [],
    customers: [],
    subscriptions: [],
    onboarding: []
  });
}

function readBackbone() {
  return readJson(BACKBONE_FILE, {
    product: { name: "Trading Pro Max", version: "0.0.0-local", stage: "Local", targetProgress: 0 },
    tenant: { name: "Trading Pro Max Global", region: "global", mode: "private-operator" },
    session: { active: false, userId: null, role: null, token: null, lastSeenAt: null },
    roles: ["OWNER", "ADMIN", "TRADER", "ANALYST", "RISK", "OPS"],
    users: [],
    flags: {},
    modules: [],
    release: { closed: 0, total: 0, readiness: 0, updatedAt: null }
  });
}

function readBackups() {
  return readJson(BACKUPS_FILE, []);
}

function readAudit() {
  return readJson(AUDIT_FILE, []);
}

function readSnapshots() {
  return readJson(SNAPSHOTS_FILE, []);
}

function readEnvironment() {
  const db = readDb();
  const growth = readGrowth();
  const backbone = readBackbone();
  const backups = readBackups();
  const audit = readAudit();

  return { db, growth, backbone, backups, audit };
}

function summaryFromEnvironment(env) {
  const db = env.db || {};
  const growth = env.growth || {};
  const positions = Array.isArray(db.portfolio?.positions) ? db.portfolio.positions.length : 0;
  const orders = Array.isArray(db.orders) ? db.orders.length : 0;
  const ledger = Array.isArray(db.ledger) ? db.ledger.length : 0;
  const watchlist = Array.isArray(db.watchlist) ? db.watchlist.length : 0;
  const alerts = Array.isArray(db.alerts) ? db.alerts.length : 0;
  const journal = Array.isArray(db.journal) ? db.journal.length : 0;
  const users = Array.isArray(db.users) ? db.users.length : 0;
  const brokers = Array.isArray(db.brokers) ? db.brokers.length : 0;
  const customers = Array.isArray(growth.customers) ? growth.customers.length : 0;
  const activeSubscriptions = Array.isArray(growth.subscriptions) ? growth.subscriptions.filter(x => x.status === "ACTIVE").length : 0;

  return {
    cash: n(db.portfolio?.cash),
    positions,
    orders,
    ledger,
    watchlist,
    alerts,
    journal,
    users,
    brokers,
    customers,
    activeSubscriptions
  };
}

export function buildLocalRecoveryStatus() {
  const env = readEnvironment();
  const snapshots = readSnapshots();
  const summary = summaryFromEnvironment(env);

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Recovery",
      progress: 94
    },
    summary,
    snapshots: snapshots.map((x) => ({
      id: x.id,
      label: x.label,
      createdAt: x.createdAt,
      meta: x.meta || {}
    })),
    latestSnapshot: snapshots[0] ? {
      id: snapshots[0].id,
      label: snapshots[0].label,
      createdAt: snapshots[0].createdAt,
      meta: snapshots[0].meta || {}
    } : null,
    updatedAt: ts()
  };
}

export function createLocalSnapshot(payload = {}) {
  const label = String(payload.label || "local-manual-snapshot").trim();
  const env = readEnvironment();
  const snapshots = readSnapshots();
  const meta = summaryFromEnvironment(env);

  snapshots.unshift({
    id: id("LRS"),
    label,
    createdAt: ts(),
    meta,
    data: env
  });

  writeJson(SNAPSHOTS_FILE, snapshots.slice(0, 25));
  addLog("LOCAL RECOVERY -> SNAPSHOT CREATED");
  return buildLocalRecoveryStatus();
}

export function restoreLocalSnapshot(payload = {}) {
  const snapshotId = String(payload.id || "").trim();
  const snapshots = readSnapshots();
  const target = snapshotId
    ? snapshots.find((x) => x.id === snapshotId) || null
    : snapshots[0] || null;

  if (!target || !target.data) {
    return {
      ok: false,
      error: "snapshot_not_found",
      status: buildLocalRecoveryStatus()
    };
  }

  writeDb(target.data.db || {});
  writeJson(GROWTH_FILE, target.data.growth || { plans: [], customers: [], subscriptions: [], onboarding: [] });
  writeJson(BACKBONE_FILE, target.data.backbone || {});
  writeJson(BACKUPS_FILE, Array.isArray(target.data.backups) ? target.data.backups : []);
  writeJson(AUDIT_FILE, Array.isArray(target.data.audit) ? target.data.audit : []);

  addLog("LOCAL RECOVERY -> SNAPSHOT RESTORED " + target.id);

  return {
    ok: true,
    restored: {
      id: target.id,
      label: target.label,
      createdAt: target.createdAt
    },
    status: buildLocalRecoveryStatus()
  };
}
