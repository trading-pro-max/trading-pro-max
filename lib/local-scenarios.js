import fs from "fs";
import path from "path";
import { readDb, writeDb } from "./core-db.js";
import { getState, addLog } from "./state.js";
import { getEngineStatus, startEngine } from "./engine.js";

const DATA_DIR = path.join(process.cwd(), "data");
const GROWTH_FILE = path.join(DATA_DIR, "growth-center.json");

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

function ts() {
  return new Date().toISOString();
}

function id(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

function readGrowth() {
  return readJson(GROWTH_FILE, {
    plans: [],
    customers: [],
    subscriptions: [],
    onboarding: []
  });
}

function writeGrowth(x) {
  return writeJson(GROWTH_FILE, x);
}

function pushUniqueWatchlist(arr, symbols) {
  return [...new Set([...(Array.isArray(arr) ? arr : []), ...symbols])];
}

function ensureBaseDb() {
  const db = readDb();

  db.portfolio = db.portfolio || { cash: 100000, positions: [] };
  db.watchlist = Array.isArray(db.watchlist) ? db.watchlist : [];
  db.alerts = Array.isArray(db.alerts) ? db.alerts : [];
  db.journal = Array.isArray(db.journal) ? db.journal : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.ledger = Array.isArray(db.ledger) ? db.ledger : [];
  db.users = Array.isArray(db.users) ? db.users : [];
  db.brokers = Array.isArray(db.brokers) ? db.brokers : [];
  db.settings = {
    theme: "dark",
    timezone: "UTC",
    defaultRisk: "BALANCED",
    liveTrading: false,
    onboardingComplete: true,
    ...(db.settings || {})
  };
  db.session = db.session || {
    active: false,
    userId: null,
    token: null,
    lastLoginAt: null
  };

  if (!db.users.length) {
    db.users.unshift({
      id: "USR-LOCAL-OWNER",
      name: "Global Operator",
      email: "owner@tradingpromax.ai",
      role: "OWNER",
      tier: "FOUNDING",
      status: "ACTIVE",
      onboardingComplete: true,
      createdAt: ts()
    });
  }

  if (!db.session.active) {
    db.session = {
      active: true,
      userId: db.users[0].id,
      token: "SESS-LOCAL-OWNER",
      lastLoginAt: ts()
    };
  }

  if (!db.brokers.length) {
    db.brokers = [
      {
        id: "BRK-IBKR",
        key: "IBKR",
        name: "Interactive Brokers",
        category: "multi-asset",
        status: "CONNECTED",
        connected: true,
        mode: "SANDBOX",
        coverage: ["stocks", "options", "futures", "fx"],
        lastSyncAt: ts()
      },
      {
        id: "BRK-BINANCE",
        key: "BINANCE",
        name: "Binance",
        category: "crypto",
        status: "CONNECTED",
        connected: true,
        mode: "SANDBOX",
        coverage: ["spot", "futures"],
        lastSyncAt: ts()
      }
    ];
  }

  return db;
}

function summarize(scenario) {
  const db = readDb();
  const growth = readGrowth();
  const state = getState();
  const engine = getEngineStatus();

  return {
    scenario,
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE"
    },
    workspace: {
      cash: n(db.portfolio?.cash),
      positions: Array.isArray(db.portfolio?.positions) ? db.portfolio.positions.length : 0,
      watchlist: Array.isArray(db.watchlist) ? db.watchlist.length : 0,
      alerts: Array.isArray(db.alerts) ? db.alerts.length : 0,
      journal: Array.isArray(db.journal) ? db.journal.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      ledger: Array.isArray(db.ledger) ? db.ledger.length : 0,
      users: Array.isArray(db.users) ? db.users.length : 0,
      brokers: Array.isArray(db.brokers) ? db.brokers.filter(x => x.connected).length : 0
    },
    growth: {
      customers: Array.isArray(growth.customers) ? growth.customers.length : 0,
      activeSubscriptions: Array.isArray(growth.subscriptions) ? growth.subscriptions.filter(x => x.status === "ACTIVE").length : 0
    },
    guardian: {
      status: state.protection?.guardianStatus || "UNKNOWN",
      sessionMode: state.protection?.sessionMode || "UNKNOWN",
      killSwitch: Boolean(state.protection?.killSwitch)
    },
    updatedAt: ts()
  };
}

export function buildLocalScenarioStatus() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();
  const growth = readGrowth();

  const scenarios = [
    { key: "MORNING_BOOT", title: "Morning Boot", detail: "starts engine posture and prepares local shell" },
    { key: "MOMENTUM_PUSH", title: "Momentum Push", detail: "adds fresh orders, positions, and trade history" },
    { key: "RISK_EVENT", title: "Risk Event", detail: "creates stress conditions with defensive posture" },
    { key: "CLIENT_INFLOW", title: "Client Inflow", detail: "adds clients, subscriptions, and onboarding completion" },
    { key: "BROKER_SYNC", title: "Broker Sync", detail: "refreshes broker connectivity and watchlist coverage" },
    { key: "RESET_DAY", title: "Reset Day", detail: "cleans intraday activity while preserving base system" }
  ];

  const readiness = Number((
    (
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness) +
      n(state.metrics?.privateOperatorStack) +
      (engine.running ? 88 : 54) +
      (db.session?.active ? 86 : 44) +
      ((Array.isArray(growth.subscriptions) ? growth.subscriptions.filter(x => x.status === "ACTIVE").length : 0) > 0 ? 84 : 48)
    ) / 6
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Scenario Runner",
      progress: 90
    },
    readiness,
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE"
    },
    workspace: {
      cash: n(db.portfolio?.cash),
      positions: Array.isArray(db.portfolio?.positions) ? db.portfolio.positions.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      ledger: Array.isArray(db.ledger) ? db.ledger.length : 0,
      alerts: Array.isArray(db.alerts) ? db.alerts.length : 0,
      journal: Array.isArray(db.journal) ? db.journal.length : 0
    },
    growth: {
      customers: Array.isArray(growth.customers) ? growth.customers.length : 0,
      activeSubscriptions: Array.isArray(growth.subscriptions) ? growth.subscriptions.filter(x => x.status === "ACTIVE").length : 0
    },
    scenarios,
    updatedAt: ts()
  };
}

export function runLocalScenario(name) {
  const scenario = String(name || "").trim().toUpperCase();
  const db = ensureBaseDb();
  const growth = readGrowth();

  if (scenario === "MORNING_BOOT") {
    startEngine();
    db.watchlist = pushUniqueWatchlist(db.watchlist, ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD", "NASDAQ"]);
    db.alerts.unshift({
      id: id("AL"),
      symbol: "BTC/USDT",
      type: "PRICE",
      target: 70500,
      condition: "ABOVE",
      enabled: true,
      createdAt: ts()
    });
    db.journal.unshift({
      id: id("JR"),
      symbol: "SYSTEM",
      title: "Morning boot",
      note: "Local morning operating posture restored.",
      mood: "FOCUSED",
      outcome: "ACTIVE",
      tags: ["boot", "local"],
      createdAt: ts()
    });
    addLog("SCENARIO -> MORNING_BOOT");
  }

  if (scenario === "MOMENTUM_PUSH") {
    startEngine();

    const orderId = id("ORD");
    const positionId = id("POS");
    const entryPrice = 69125.4;
    const currentPrice = 69880.2;
    const qty = 0.35;
    const pnl = Number(((currentPrice - entryPrice) * qty).toFixed(2));

    db.orders.unshift({
      id: orderId,
      symbol: "BTC/USDT",
      side: "LONG",
      qty,
      entryPrice,
      currentPrice,
      status: "OPEN",
      executionMode: "PAPER_EXEC",
      createdAt: ts()
    });

    db.portfolio.positions.unshift({
      id: positionId,
      orderId,
      symbol: "BTC/USDT",
      side: "LONG",
      qty,
      avgPrice: entryPrice,
      currentPrice,
      status: "OPEN",
      createdAt: ts()
    });

    db.ledger.unshift({
      id: id("LED"),
      type: "ORDER_OPEN",
      orderId,
      symbol: "BTC/USDT",
      side: "LONG",
      qty,
      price: entryPrice,
      executionMode: "PAPER_EXEC",
      createdAt: ts()
    });

    db.journal.unshift({
      id: id("JR"),
      symbol: "BTC/USDT",
      title: "Momentum push detected",
      note: "Local momentum scenario opened with favorable continuation bias.",
      mood: "CONFIDENT",
      outcome: "WATCH",
      tags: ["momentum", "demo"],
      createdAt: ts()
    });

    db.portfolio.cash = Number((n(db.portfolio.cash) - entryPrice * qty).toFixed(2));
    addLog("SCENARIO -> MOMENTUM_PUSH");
  }

  if (scenario === "RISK_EVENT") {
    db.alerts.unshift({
      id: id("AL"),
      symbol: "ETH/USDT",
      type: "RISK",
      target: 3350,
      condition: "BELOW",
      enabled: true,
      createdAt: ts()
    });

    db.journal.unshift({
      id: id("JR"),
      symbol: "RISK",
      title: "Risk event triggered",
      note: "Defensive posture scenario injected for local validation.",
      mood: "ALERT",
      outcome: "PROTECT",
      tags: ["risk", "stress"],
      createdAt: ts()
    });

    addLog("SCENARIO -> RISK_EVENT");
  }

  if (scenario === "CLIENT_INFLOW") {
    if (!Array.isArray(growth.plans) || !growth.plans.length) {
      growth.plans = [
        { id: "PLAN-STARTER", name: "Starter", priceMonthly: 49, tier: "starter", seats: 1, features: ["control"] },
        { id: "PLAN-PRO", name: "Pro", priceMonthly: 149, tier: "pro", seats: 3, features: ["execution"] }
      ];
    }

    const customerId = id("CUS");
    growth.customers = Array.isArray(growth.customers) ? growth.customers : [];
    growth.subscriptions = Array.isArray(growth.subscriptions) ? growth.subscriptions : [];
    growth.onboarding = Array.isArray(growth.onboarding) ? growth.onboarding : [];

    growth.customers.unshift({
      id: customerId,
      name: "Local Client " + Math.floor(Math.random() * 900 + 100),
      email: "client" + Math.floor(Math.random() * 900 + 100) + "@local.ai",
      segment: "PRO",
      status: "ACTIVE",
      createdAt: ts()
    });

    growth.subscriptions.unshift({
      id: id("SUB"),
      customerId,
      planId: "PLAN-PRO",
      status: "ACTIVE",
      amountMonthly: 149,
      startedAt: ts(),
      renewalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    growth.onboarding.unshift({
      id: id("ONB"),
      customerId,
      completedSteps: 6,
      totalSteps: 6,
      status: "COMPLETED",
      updatedAt: ts()
    });

    addLog("SCENARIO -> CLIENT_INFLOW");
  }

  if (scenario === "BROKER_SYNC") {
    db.brokers = (Array.isArray(db.brokers) ? db.brokers : []).map((x) => ({
      ...x,
      connected: true,
      status: "CONNECTED",
      mode: "SANDBOX",
      lastSyncAt: ts()
    }));

    db.watchlist = pushUniqueWatchlist(db.watchlist, ["AVAX/USDT", "GBP/USD", "US30"]);
    db.alerts.unshift({
      id: id("AL"),
      symbol: "US30",
      type: "PRICE",
      target: 40000,
      condition: "ABOVE",
      enabled: true,
      createdAt: ts()
    });

    addLog("SCENARIO -> BROKER_SYNC");
  }

  if (scenario === "RESET_DAY") {
    db.orders = [];
    db.ledger = [];
    db.portfolio.positions = [];
    db.alerts = [];
    db.journal = [];
    db.portfolio.cash = 100000;
    db.watchlist = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD"];
    addLog("SCENARIO -> RESET_DAY");
  }

  writeDb(db);
  writeGrowth(growth);

  return summarize(scenario);
}
