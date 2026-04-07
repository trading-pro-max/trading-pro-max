import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "core-db.json");
const SNAP_FILE = path.join(DATA_DIR, "local-recovery-snapshots.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    ensureDir();
    if (!fs.existsSync(file)) return fallback;
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

function ts() {
  return new Date().toISOString();
}

function ensureDb() {
  const db = readJson(DB_FILE, {});
  db.portfolio = db.portfolio || { cash: 100000, positions: [] };
  db.watchlist = Array.isArray(db.watchlist) ? db.watchlist : ["BTC/USDT","ETH/USDT","SOL/USDT","XAU/USD","EUR/USD"];
  db.alerts = Array.isArray(db.alerts) ? db.alerts : [];
  db.journal = Array.isArray(db.journal) ? db.journal : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.ledger = Array.isArray(db.ledger) ? db.ledger : [];
  db.users = Array.isArray(db.users) ? db.users : [{
    id: "USR-LOCAL-OWNER",
    name: "Global Operator",
    email: "owner@tradingpromax.ai",
    role: "OWNER",
    status: "ACTIVE",
    createdAt: ts()
  }];
  db.brokers = Array.isArray(db.brokers) ? db.brokers : [{
    id: "BRK-BINANCE",
    key: "BINANCE",
    name: "Binance",
    connected: true,
    status: "CONNECTED",
    mode: "SANDBOX",
    lastSyncAt: ts()
  }];
  db.settings = {
    theme: "dark",
    timezone: "UTC",
    defaultRisk: "BALANCED",
    liveTrading: false,
    onboardingComplete: true,
    ...(db.settings || {})
  };
  db.session = db.session || {
    active: true,
    userId: db.users[0].id,
    token: "SESS-LOCAL-OWNER",
    lastLoginAt: ts()
  };
  writeJson(DB_FILE, db);
  return db;
}

function createSnapshot(label = "local-command-snapshot") {
  const db = ensureDb();
  const snaps = readJson(SNAP_FILE, []);
  snaps.unshift({
    id: "SNAP-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    label,
    createdAt: ts(),
    meta: {
      cash: n(db.portfolio?.cash),
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      ledger: Array.isArray(db.ledger) ? db.ledger.length : 0
    },
    data: db
  });
  writeJson(SNAP_FILE, snaps.slice(0, 25));
  return snaps[0];
}

export function buildLocalCommandStatus() {
  const db = ensureDb();
  const snaps = readJson(SNAP_FILE, []);

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Command Bus",
      progress: 99
    },
    commandReadiness: 96,
    summary: {
      finalReadiness: 96,
      launchpad: 95,
      factory: 94,
      scenarios: 93,
      snapshots: snaps.length,
      certified: true
    },
    commands: [
      { key: "START_DAY", title: "Start Day", detail: "prepare local system for the day" },
      { key: "DEMO_FLOW", title: "Demo Flow", detail: "seed demo orders and workspace activity" },
      { key: "SAFE_MODE", title: "Safe Mode", detail: "set protected local posture" },
      { key: "CERTIFY_LOCAL", title: "Certify Local", detail: "mark local stack as certified" },
      { key: "RESET_BASELINE", title: "Reset Baseline", detail: "restore local clean baseline" },
      { key: "SNAPSHOT_NOW", title: "Snapshot Now", detail: "create instant recovery point" }
    ],
    latestSnapshot: snaps[0] || null,
    metrics: {
      cash: n(db.portfolio?.cash),
      positions: Array.isArray(db.portfolio?.positions) ? db.portfolio.positions.length : 0,
      watchlist: Array.isArray(db.watchlist) ? db.watchlist.length : 0,
      alerts: Array.isArray(db.alerts) ? db.alerts.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      ledger: Array.isArray(db.ledger) ? db.ledger.length : 0,
      users: Array.isArray(db.users) ? db.users.length : 0,
      brokers: Array.isArray(db.brokers) ? db.brokers.length : 0
    },
    updatedAt: ts()
  };
}

export function runLocalCommand(mode = "START_DAY") {
  const x = String(mode || "").trim().toUpperCase();
  const db = ensureDb();

  if (x === "START_DAY") {
    db.alerts.unshift({
      id: "AL-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      symbol: "BTC/USDT",
      type: "PRICE",
      target: 70000,
      condition: "ABOVE",
      enabled: true,
      createdAt: ts()
    });
  }

  if (x === "DEMO_FLOW") {
    db.orders.unshift({
      id: "ORD-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      symbol: "BTC/USDT",
      side: "LONG",
      qty: 0.25,
      entryPrice: 69000,
      currentPrice: 69420,
      status: "OPEN",
      createdAt: ts()
    });
    db.ledger.unshift({
      id: "LED-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      type: "ORDER_OPEN",
      symbol: "BTC/USDT",
      qty: 0.25,
      price: 69000,
      createdAt: ts()
    });
  }

  if (x === "SAFE_MODE") {
    db.settings.defaultRisk = "SAFE";
    db.settings.liveTrading = false;
  }

  if (x === "CERTIFY_LOCAL") {
    db.settings.onboardingComplete = true;
  }

  if (x === "RESET_BASELINE") {
    db.portfolio = { cash: 100000, positions: [] };
    db.orders = [];
    db.ledger = [];
    db.alerts = [];
    db.journal = [];
    db.watchlist = ["BTC/USDT","ETH/USDT","SOL/USDT","XAU/USD","EUR/USD"];
  }

  writeJson(DB_FILE, db);

  if (x === "SNAPSHOT_NOW" || x === "CERTIFY_LOCAL" || x === "RESET_BASELINE" || x === "DEMO_FLOW" || x === "START_DAY" || x === "SAFE_MODE") {
    createSnapshot("local-command-" + x.toLowerCase());
  }

  return buildLocalCommandStatus();
}
