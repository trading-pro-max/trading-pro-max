import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const DATA_DIR = path.join(ROOT, "data");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const CONFIG_FILE = path.join(TPM_DIR, "builder-config.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");
const STATUS_FILE = path.join(TPM_DIR, "builder-status.json");
const LOG_FILE = path.join(TPM_DIR, "builder-log.json");
const PID_FILE = path.join(TPM_DIR, "builder.pid");
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
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function clamp100(x) {
  return Math.max(0, Math.min(100, Math.round(Number(x || 0))));
}

function avg(nums) {
  const arr = nums.map((x) => Number(x || 0));
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
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

export function getManifest() {
  ensureDir(TPM_DIR);
  const manifest = readJson(MANIFEST_FILE, null);
  if (manifest && Array.isArray(manifest.modules) && manifest.modules.length) return manifest;
  return writeJson(MANIFEST_FILE, defaultManifest());
}

export function getBuilderConfig() {
  ensureDir(TPM_DIR);
  return readJson(CONFIG_FILE, {
    enabled: true,
    intervalSec: 12,
    localStep: 4,
    globalStep: 2,
    maxLogEntries: 120,
    priority: []
  });
}

function moduleSeed(item, index) {
  const progress = clamp100(item.progress || Math.min(100, 60 + index));
  const readiness = clamp100(item.readiness || Math.min(100, progress + 5));
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
      stability: clamp100(Math.max(60, readiness - 1)),
      data: readiness,
      automation: clamp100(Math.max(58, readiness - 2))
    },
    updatedAt: nowIso()
  };
}

export function getState() {
  const manifest = getManifest();
  const state = readJson(STATE_FILE, { modules: {} });
  state.modules = state.modules || {};

  manifest.modules.forEach((m, index) => {
    const base = state.modules[m.slug] || moduleSeed(m, index);
    state.modules[m.slug] = {
      ...base,
      slug: m.slug,
      title: m.title,
      description: m.description || base.description || "",
      stage: m.stage || base.stage || "Builder Managed",
      status: base.progress >= 100 ? "CLOSED" : (m.status || base.status || "ONLINE"),
      progress: clamp100(base.progress || m.progress || 70),
      readiness: clamp100(base.readiness || m.readiness || 80),
      metrics: {
        build: clamp100(base.metrics?.build || base.progress || m.progress || 70),
        stability: clamp100(base.metrics?.stability || base.readiness || m.readiness || 80),
        data: clamp100(base.metrics?.data || base.readiness || m.readiness || 80),
        automation: clamp100(base.metrics?.automation || base.readiness || m.readiness || 80)
      },
      updatedAt: nowIso()
    };
  });

  writeJson(STATE_FILE, state);
  return state;
}

export function saveState(state) {
  return writeJson(STATE_FILE, state);
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
      cash: clamp100(db.portfolio?.cash),
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
  getManifest();
  getBuilderConfig();
  getState();
  ensureDb();
  const snaps = readSnapshots();
  if (!snaps.length) createSnapshot("initial-bootstrap");
}

export function pulseModule(slug, step = 2, label = "manual-pulse") {
  ensureBootstrap();
  const state = getState();
  if (!state.modules[slug]) return null;

  const mod = state.modules[slug];
  const nextProgress = clamp100(mod.progress + step);
  const nextReadiness = clamp100(Math.max(mod.readiness, nextProgress - 1, mod.readiness + Math.max(1, step - 1)));

  state.modules[slug] = {
    ...mod,
    progress: nextProgress,
    readiness: nextReadiness,
    status: nextProgress >= 100 ? "CLOSED" : "ONLINE",
    metrics: {
      build: nextProgress,
      stability: clamp100(Math.max(mod.metrics?.stability || 70, nextReadiness - 1)),
      data: clamp100(Math.max(mod.metrics?.data || 70, nextReadiness)),
      automation: clamp100(Math.max(mod.metrics?.automation || 68, nextProgress - 1))
    },
    updatedAt: nowIso()
  };

  saveState(state);
  createSnapshot(label + "-" + slug);
  return getModuleStatusBySlug(slug);
}

export function getShellSummary() {
  ensureBootstrap();

  const manifest = getManifest();
  const state = getState();
  const db = ensureDb();
  const snaps = readSnapshots();

  const modules = manifest.modules.map((m) => {
    const s = state.modules[m.slug];
    return {
      slug: m.slug,
      href: "/" + m.slug,
      title: s.title,
      stage: s.stage,
      status: s.status,
      progress: clamp100(s.progress),
      readiness: clamp100(s.readiness),
      description: s.description
    };
  });

  return {
    productName: manifest.productName,
    systemTitle: manifest.systemTitle,
    theme: manifest.theme,
    progress: avg(modules.map((m) => m.progress)),
    readiness: avg(modules.map((m) => m.readiness)),
    modules,
    metrics: {
      cash: Number(db.portfolio?.cash || 0),
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

  const mod = state.modules[slug];
  return {
    productName: shell.productName,
    systemTitle: shell.systemTitle,
    theme: shell.theme,
    navigation: shell.modules,
    shell,
    module: {
      slug: mod.slug,
      title: mod.title,
      stage: mod.stage,
      status: mod.status,
      description: mod.description,
      progress: clamp100(mod.progress),
      readiness: clamp100(mod.readiness),
      metrics: mod.metrics,
      updatedAt: mod.updatedAt
    }
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

export function getBuilderStatus() {
  ensureBootstrap();

  const shell = getShellSummary();
  const manifest = getManifest();
  const config = getBuilderConfig();
  const status = readJson(STATUS_FILE, {
    running: false,
    cycle: 0,
    startedAt: null,
    lastRunAt: null,
    avgProgress: shell.progress,
    avgReadiness: shell.readiness,
    closedModules: shell.modules.filter((x) => x.progress >= 100).length,
    totalModules: shell.modules.length,
    activeModule: null,
    buildOk: true,
    validateOk: true
  });
  const logs = readJson(LOG_FILE, []);
  const pid = fs.existsSync(PID_FILE) ? String(fs.readFileSync(PID_FILE, "utf8")).trim() : null;

  return {
    productName: shell.productName,
    systemTitle: shell.systemTitle,
    shell,
    manifest,
    config,
    builder: status,
    logs,
    pid
  };
}
