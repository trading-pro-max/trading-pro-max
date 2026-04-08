import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const DATA_DIR = path.join(ROOT, "data");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");
const DB_FILE = path.join(DATA_DIR, "core-db.json");
const SNAP_FILE = path.join(DATA_DIR, "local-recovery-snapshots.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function n(x) {
  return Number(x || 0);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

function defaultManifest() {
  return {
    productName: "Trading Pro Max",
    systemTitle: "Global Operating System",
    theme: {
      bg: "#020617",
      panel: "#111827",
      panelSoft: "#0b1220",
      border: "#1f2937",
      text: "#ffffff",
      muted: "#94a3b8",
      accent: "#60a5fa",
      good: "#22c55e",
      warn: "#f59e0b"
    },
    modules: [
      { slug: "launchpad", title: "Launchpad", stage: "Core Shell", status: "ONLINE", progress: 88, readiness: 95, description: "Central local operating shell." },
      { slug: "local-command", title: "Local Command", stage: "Command Bus", status: "ONLINE", progress: 99, readiness: 96, description: "Central command surface for the local system." }
    ]
  };
}

function ensureManifest() {
  ensureDir(TPM_DIR);
  const manifest = readJson(MANIFEST_FILE, null);
  if (manifest && Array.isArray(manifest.modules) && manifest.modules.length) return manifest;
  return writeJson(MANIFEST_FILE, defaultManifest());
}

function moduleStateFromManifestItem(item, index) {
  const progress = n(item.progress || Math.min(100, 60 + index));
  const readiness = n(item.readiness || Math.min(100, progress + 5));
  return {
    slug: item.slug,
    title: item.title,
    description: item.description || "",
    stage: item.stage || "Builder Managed",
    status: item.status || "ONLINE",
    progress,
    readiness,
    metrics: {
      build: progress,
      stability: Math.max(60, Math.min(100, progress - 2)),
      data: readiness,
      automation: Math.max(58, Math.min(100, readiness - 1))
    },
    updatedAt: nowIso()
  };
}

function ensureState() {
  const manifest = ensureManifest();
  const state = readJson(STATE_FILE, { modules: {} });
  state.modules = state.modules || {};

  manifest.modules.forEach((item, index) => {
    const current = state.modules[item.slug] || moduleStateFromManifestItem(item, index);
    state.modules[item.slug] = {
      ...current,
      slug: item.slug,
      title: item.title,
      description: item.description || current.description || "",
      stage: item.stage || current.stage || "Builder Managed",
      status: item.status || current.status || "ONLINE",
      progress: n(current.progress || item.progress || 70),
      readiness: n(current.readiness || item.readiness || 80),
      metrics: {
        build: n(current.metrics?.build || current.progress || item.progress || 70),
        stability: n(current.metrics?.stability || current.readiness || item.readiness || 80),
        data: n(current.metrics?.data || item.readiness || current.readiness || 80),
        automation: n(current.metrics?.automation || item.readiness || current.readiness || 80)
      },
      updatedAt: nowIso()
    };
  });

  writeJson(STATE_FILE, state);
  return state;
}

export function getManifest() {
  return ensureManifest();
}

export function getState() {
  return ensureState();
}

export function ensureDb() {
  ensureDir(DATA_DIR);
  const db = readJson(DB_FILE, {});

  db.portfolio = db.portfolio || { cash: 100000, positions: [] };
  db.watchlist = Array.isArray(db.watchlist) ? db.watchlist : ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD"];
  db.alerts = Array.isArray(db.alerts) ? db.alerts : [];
  db.journal = Array.isArray(db.journal) ? db.journal : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.ledger = Array.isArray(db.ledger) ? db.ledger : [];
  db.users = Array.isArray(db.users) ? db.users : [
    {
      id: "USR-LOCAL-OWNER",
      name: "Global Operator",
      email: "owner@tradingpromax.ai",
      role: "OWNER",
      status: "ACTIVE",
      createdAt: nowIso()
    }
  ];
  db.brokers = Array.isArray(db.brokers) ? db.brokers : [
    {
      id: "BRK-BINANCE",
      key: "BINANCE",
      name: "Binance",
      connected: true,
      status: "CONNECTED",
      mode: "SANDBOX",
      lastSyncAt: nowIso()
    }
  ];
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
    lastLoginAt: nowIso()
  };

  writeJson(DB_FILE, db);
  return db;
}

export function readSnapshots() {
  ensureDir(DATA_DIR);
  return readJson(SNAP_FILE, []);
}

export function createSnapshot(label = "builder-snapshot") {
  const db = ensureDb();
  const snaps = readSnapshots();

  snaps.unshift({
    id: makeId("SNAP"),
    label,
    createdAt: nowIso(),
    meta: {
      cash: n(db.portfolio?.cash),
      positions: Array.isArray(db.portfolio?.positions) ? db.portfolio.positions.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      ledger: Array.isArray(db.ledger) ? db.ledger.length : 0,
      alerts: Array.isArray(db.alerts) ? db.alerts.length : 0
    }
  });

  writeJson(SNAP_FILE, snaps.slice(0, 25));
  return snaps[0];
}

function ensureBootstrap() {
  ensureManifest();
  ensureState();
  ensureDb();
  let snaps = readSnapshots();
  if (!snaps.length) {
    createSnapshot("initial-builder-bootstrap");
    snaps = readSnapshots();
  }
}

export function getShellSummary() {
  ensureBootstrap();

  const manifest = getManifest();
  const state = getState();
  const db = ensureDb();
  const snaps = readSnapshots();

  const modules = manifest.modules.map((item) => {
    const s = state.modules[item.slug];
    return {
      slug: item.slug,
      href: "/" + item.slug,
      title: s.title,
      stage: s.stage,
      status: s.status,
      progress: n(s.progress),
      readiness: n(s.readiness),
      description: s.description
    };
  });

  const avgProgress = Math.round(modules.reduce((a, b) => a + n(b.progress), 0) / Math.max(1, modules.length));
  const avgReadiness = Math.round(modules.reduce((a, b) => a + n(b.readiness), 0) / Math.max(1, modules.length));

  return {
    productName: manifest.productName,
    systemTitle: manifest.systemTitle,
    theme: manifest.theme,
    progress: avgProgress,
    readiness: avgReadiness,
    modules,
    metrics: {
      cash: n(db.portfolio?.cash),
      positions: Array.isArray(db.portfolio?.positions) ? db.portfolio.positions.length : 0,
      watchlist: Array.isArray(db.watchlist) ? db.watchlist.length : 0,
      alerts: Array.isArray(db.alerts) ? db.alerts.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      ledger: Array.isArray(db.ledger) ? db.ledger.length : 0,
      users: Array.isArray(db.users) ? db.users.length : 0,
      brokers: Array.isArray(db.brokers) ? db.brokers.length : 0,
      snapshots: snaps.length
    },
    latestSnapshot: snaps[0] || null,
    updatedAt: nowIso()
  };
}

export function getModuleDataBySlug(slug) {
  ensureBootstrap();

  const manifest = getManifest();
  const state = getState();
  const shell = getShellSummary();
  const item = manifest.modules.find((x) => x.slug === slug);

  if (!item) return null;

  const moduleState = state.modules[slug];
  return {
    productName: manifest.productName,
    systemTitle: manifest.systemTitle,
    theme: manifest.theme,
    module: {
      slug,
      href: "/" + slug,
      title: moduleState.title,
      stage: moduleState.stage,
      status: moduleState.status,
      description: moduleState.description,
      progress: n(moduleState.progress),
      readiness: n(moduleState.readiness),
      metrics: moduleState.metrics,
      updatedAt: moduleState.updatedAt
    },
    navigation: shell.modules,
    shell
  };
}

export function getModuleStatusBySlug(slug) {
  const data = getModuleDataBySlug(slug);
  if (!data) return null;
  return {
    ok: true,
    slug: data.module.slug,
    title: data.module.title,
    stage: data.module.stage,
    status: data.module.status,
    progress: data.module.progress,
    readiness: data.module.readiness,
    metrics: data.module.metrics,
    updatedAt: data.module.updatedAt
  };
}
