import { readDb, writeDb } from "./core-db.js";
import { getState, addLog } from "./state.js";
import { getEngineStatus } from "./engine.js";

function n(x) {
  return Number(x || 0);
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

export function buildLocalRoutes() {
  return [
    { key: "local-os", title: "Local OS", url: "/local-os", category: "shell", status: "READY" },
    { key: "local-qa", title: "Local QA", url: "/local-qa", category: "quality", status: "ACTIVE" },
    { key: "control", title: "Mission Control", url: "/control", category: "core", status: "READY" },
    { key: "workspace", title: "Workspace", url: "/workspace", category: "workspace", status: "READY" },
    { key: "strategy-lab", title: "Strategy Lab", url: "/strategy-lab", category: "research", status: "READY" },
    { key: "execution", title: "Execution", url: "/execution", category: "execution", status: "READY" },
    { key: "brokers", title: "Broker Hub", url: "/brokers", category: "broker", status: "READY" },
    { key: "research", title: "Research", url: "/research", category: "research", status: "READY" },
    { key: "risk", title: "Risk Center", url: "/risk", category: "risk", status: "READY" },
    { key: "analytics", title: "Analytics", url: "/analytics", category: "analytics", status: "READY" },
    { key: "notifications", title: "Notifications", url: "/notifications", category: "monitoring", status: "READY" },
    { key: "operator-os", title: "Operator OS", url: "/operator-os", category: "operator", status: "READY" },
    { key: "desktop-hq", title: "Desktop HQ", url: "/desktop-hq", category: "surface", status: "READY" },
    { key: "mobile-hq", title: "Mobile HQ", url: "/mobile-hq", category: "surface", status: "READY" },
    { key: "intelligence", title: "Intelligence", url: "/intelligence", category: "intelligence", status: "READY" },
    { key: "release-center", title: "Release Center", url: "/release-center", category: "release", status: "READY" }
  ];
}

export function buildLocalChecks() {
  const db = readDb();
  const state = getState();
  const engine = getEngineStatus();

  const watchlist = safeArray(db.watchlist).length;
  const alerts = safeArray(db.alerts).length;
  const journal = safeArray(db.journal).length;
  const brokers = safeArray(db.brokers).length;
  const users = safeArray(db.users).length;
  const orders = safeArray(db.orders).length;
  const ledger = safeArray(db.ledger).length;

  return [
    {
      key: "core-online",
      title: "Core online",
      ok: state.status === "ONLINE",
      score: state.status === "ONLINE" ? 100 : 25,
      detail: state.status
    },
    {
      key: "engine-active",
      title: "Engine active",
      ok: Boolean(engine.running) || n(state.metrics?.engineReadiness) >= 80,
      score: engine.running ? 100 : Math.max(35, n(state.metrics?.engineReadiness)),
      detail: engine.running ? "RUNNING" : "STOPPED"
    },
    {
      key: "session-active",
      title: "Operator session",
      ok: Boolean(db.session?.active),
      score: db.session?.active ? 100 : 20,
      detail: db.session?.active ? "ACTIVE" : "INACTIVE"
    },
    {
      key: "onboarding-complete",
      title: "Onboarding complete",
      ok: Boolean(db.settings?.onboardingComplete),
      score: db.settings?.onboardingComplete ? 100 : 20,
      detail: String(Boolean(db.settings?.onboardingComplete))
    },
    {
      key: "guardian-armed",
      title: "Guardian armed",
      ok: state.protection?.guardianStatus === "ARMED",
      score: state.protection?.guardianStatus === "ARMED" ? 100 : 35,
      detail: state.protection?.guardianStatus || "UNKNOWN"
    },
    {
      key: "watchlist-depth",
      title: "Watchlist depth",
      ok: watchlist >= 5,
      score: Math.min(100, 30 + watchlist * 14),
      detail: "count " + watchlist
    },
    {
      key: "alert-coverage",
      title: "Alert coverage",
      ok: alerts >= 1,
      score: Math.min(100, 30 + alerts * 30),
      detail: "count " + alerts
    },
    {
      key: "journal-depth",
      title: "Journal depth",
      ok: journal >= 1,
      score: Math.min(100, 30 + journal * 20),
      detail: "count " + journal
    },
    {
      key: "broker-registry",
      title: "Broker registry",
      ok: brokers >= 1,
      score: Math.min(100, 30 + brokers * 18),
      detail: "count " + brokers
    },
    {
      key: "user-registry",
      title: "User registry",
      ok: users >= 1,
      score: Math.min(100, 30 + users * 18),
      detail: "count " + users
    },
    {
      key: "execution-history",
      title: "Execution history",
      ok: orders >= 1 || ledger >= 1,
      score: Math.min(100, 25 + orders * 15 + ledger * 18),
      detail: "orders " + orders + " · ledger " + ledger
    }
  ].map((x) => ({ ...x, score: Math.max(0, Math.min(100, Math.round(x.score))) }));
}

export function buildLocalQAStatus() {
  const db = readDb();
  const state = getState();
  const engine = getEngineStatus();
  const checks = buildLocalChecks();
  const routes = buildLocalRoutes();

  const passed = checks.filter((x) => x.ok).length;
  const total = checks.length;
  const readiness = Number((checks.reduce((s, x) => s + n(x.score), 0) / total).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local QA Closure",
      progress: 84
    },
    summary: {
      passed,
      total,
      readiness,
      routes: routes.length
    },
    core: {
      status: state.status,
      engineRunning: Boolean(engine.running),
      guardian: state.protection?.guardianStatus || "UNKNOWN",
      session: Boolean(db.session?.active)
    },
    workspace: {
      watchlist: safeArray(db.watchlist).length,
      alerts: safeArray(db.alerts).length,
      journal: safeArray(db.journal).length,
      users: safeArray(db.users).length,
      brokers: safeArray(db.brokers).length,
      orders: safeArray(db.orders).length,
      ledger: safeArray(db.ledger).length
    },
    checks,
    routes,
    updatedAt: new Date().toISOString()
  };
}

export function autoFixLocalQA() {
  const db = readDb();

  if (!safeArray(db.users).length) {
    db.users = [
      {
        id: "USR-LOCAL-OWNER",
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

  if (!db.session?.active) {
    db.session = {
      active: true,
      userId: db.users[0].id,
      token: "SESS-LOCAL-OWNER",
      lastLoginAt: new Date().toISOString()
    };
  }

  db.settings = {
    ...(db.settings || {}),
    theme: db.settings?.theme || "dark",
    timezone: db.settings?.timezone || "UTC",
    defaultRisk: db.settings?.defaultRisk || "BALANCED",
    liveTrading: false,
    onboardingComplete: true
  };

  const baseWatchlist = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD"];
  db.watchlist = [...new Set([...(safeArray(db.watchlist)), ...baseWatchlist])].slice(0, 20);

  if (!safeArray(db.alerts).length) {
    db.alerts = [
      {
        id: "AL-LOCAL-001",
        symbol: "BTC/USDT",
        type: "PRICE",
        target: 70000,
        condition: "ABOVE",
        enabled: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  if (!safeArray(db.journal).length) {
    db.journal = [
      {
        id: "JR-LOCAL-001",
        symbol: "BTC/USDT",
        title: "Local QA baseline",
        note: "Local operating system baseline entry created automatically.",
        mood: "FOCUSED",
        outcome: "REVIEW",
        tags: ["local", "qa"],
        createdAt: new Date().toISOString()
      }
    ];
  }

  if (!safeArray(db.brokers).length) {
    db.brokers = [
      {
        id: "BRK-IBKR",
        key: "IBKR",
        name: "Interactive Brokers",
        category: "multi-asset",
        status: "READY",
        connected: false,
        mode: "SANDBOX",
        coverage: ["stocks", "options", "futures", "fx"],
        lastSyncAt: null
      },
      {
        id: "BRK-BINANCE",
        key: "BINANCE",
        name: "Binance",
        category: "crypto",
        status: "READY",
        connected: false,
        mode: "SANDBOX",
        coverage: ["spot", "futures"],
        lastSyncAt: null
      }
    ];
  }

  writeDb(db);
  addLog("LOCAL QA -> AUTO FIX COMPLETE");
  return buildLocalQAStatus();
}
