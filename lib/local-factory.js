import fs from "fs";
import path from "path";
import { readDb, writeDb } from "./core-db.js";
import { getState, addLog } from "./state.js";
import { getEngineStatus } from "./engine.js";

const DATA_DIR = path.join(process.cwd(), "data");
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

function demoGrowth() {
  return {
    plans: [
      { id: "PLAN-STARTER", name: "Starter", priceMonthly: 49, tier: "starter", seats: 1, features: ["control", "research", "paper", "alerts"] },
      { id: "PLAN-PRO", name: "Pro", priceMonthly: 149, tier: "pro", seats: 3, features: ["execution", "analytics", "portfolio", "risk"] },
      { id: "PLAN-INSTITUTION", name: "Institution", priceMonthly: 499, tier: "institution", seats: 10, features: ["brokers", "ops", "cloud", "backbone"] }
    ],
    customers: [
      { id: "CUS-DEMO-001", name: "Alpha Desk", email: "alpha@demo.ai", segment: "PRO", status: "ACTIVE", createdAt: ts() },
      { id: "CUS-DEMO-002", name: "Global Capital", email: "global@demo.ai", segment: "INSTITUTION", status: "ACTIVE", createdAt: ts() }
    ],
    subscriptions: [
      { id: "SUB-DEMO-001", customerId: "CUS-DEMO-001", planId: "PLAN-PRO", status: "ACTIVE", amountMonthly: 149, startedAt: ts(), renewalAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
      { id: "SUB-DEMO-002", customerId: "CUS-DEMO-002", planId: "PLAN-INSTITUTION", status: "ACTIVE", amountMonthly: 499, startedAt: ts(), renewalAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() }
    ],
    onboarding: [
      { id: "ONB-DEMO-001", customerId: "CUS-DEMO-001", completedSteps: 6, totalSteps: 6, status: "COMPLETED", updatedAt: ts() },
      { id: "ONB-DEMO-002", customerId: "CUS-DEMO-002", completedSteps: 6, totalSteps: 6, status: "COMPLETED", updatedAt: ts() }
    ]
  };
}

function demoBackbone() {
  return {
    product: {
      name: "Trading Pro Max",
      version: "0.92.0-local",
      stage: "Local Operational Closure",
      targetProgress: 92
    },
    tenant: {
      name: "Trading Pro Max Global",
      region: "global",
      mode: "private-operator"
    },
    session: {
      active: true,
      userId: "USR-LOCAL-OWNER",
      role: "OWNER",
      token: "SESS-LOCAL-OWNER",
      lastSeenAt: ts()
    },
    roles: ["OWNER", "ADMIN", "TRADER", "ANALYST", "RISK", "OPS"],
    users: [
      {
        id: "USR-LOCAL-OWNER",
        name: "Global Operator",
        email: "owner@tradingpromax.ai",
        role: "OWNER",
        status: "ACTIVE",
        createdAt: ts()
      }
    ],
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
      closed: 7,
      total: 7,
      readiness: 100,
      updatedAt: ts()
    }
  };
}

function demoBackups() {
  return [
    {
      id: "BKP-DEMO-001",
      createdAt: ts(),
      label: "local-demo-backup",
      payload: { snapshot: "local-demo" }
    }
  ];
}

function demoAudit() {
  return [
    {
      id: "AUD-DEMO-001",
      time: ts(),
      severity: "info",
      source: "local-factory",
      event: "seed-complete",
      message: "local demo environment seeded"
    },
    {
      id: "AUD-DEMO-002",
      time: ts(),
      severity: "info",
      source: "local-factory",
      event: "qa-baseline",
      message: "local qa baseline restored"
    }
  ];
}

export function buildLocalFactoryStatus() {
  const db = readDb();
  const state = getState();
  const engine = getEngineStatus();
  const growth = readJson(GROWTH_FILE, { customers: [], subscriptions: [], onboarding: [] });
  const backups = readJson(BACKUPS_FILE, []);
  const audit = readJson(AUDIT_FILE, []);

  const positions = Array.isArray(db.portfolio?.positions) ? db.portfolio.positions : [];
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const ledger = Array.isArray(db.ledger) ? db.ledger : [];
  const alerts = Array.isArray(db.alerts) ? db.alerts : [];
  const watchlist = Array.isArray(db.watchlist) ? db.watchlist : [];
  const journal = Array.isArray(db.journal) ? db.journal : [];
  const brokers = Array.isArray(db.brokers) ? db.brokers : [];
  const users = Array.isArray(db.users) ? db.users : [];
  const customers = Array.isArray(growth.customers) ? growth.customers.length : 0;
  const activeSubscriptions = Array.isArray(growth.subscriptions) ? growth.subscriptions.filter(x => x.status === "ACTIVE").length : 0;

  const readiness = Number((
    (
      n(state.metrics?.engineReadiness) +
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness) +
      n(state.metrics?.privateOperatorStack) +
      (engine.running ? 88 : 52) +
      (db.session?.active ? 86 : 44) +
      (orders.length > 0 ? 84 : 48) +
      (customers > 0 ? 82 : 42)
    ) / 8
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Factory",
      progress: 92
    },
    readiness,
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE"
    },
    workspace: {
      cash: n(db.portfolio?.cash),
      positions: positions.length,
      orders: orders.length,
      ledger: ledger.length,
      alerts: alerts.length,
      watchlist: watchlist.length,
      journal: journal.length,
      brokers: brokers.length,
      connectedBrokers: brokers.filter(x => x.connected).length,
      users: users.length
    },
    growth: {
      customers,
      activeSubscriptions
    },
    ops: {
      backups: Array.isArray(backups) ? backups.length : 0,
      audit: Array.isArray(audit) ? audit.length : 0
    },
    scenarios: [
      "seed complete local demo data",
      "restore clean local baseline",
      "validate local end-to-end flow"
    ],
    updatedAt: ts()
  };
}

export function seedLocalFactory() {
  const db = readDb();

  db.portfolio = {
    cash: 125000,
    positions: [
      {
        id: "POS-DEMO-001",
        orderId: "ORD-DEMO-001",
        symbol: "BTC/USDT",
        side: "LONG",
        qty: 0.6,
        avgPrice: 68210.55,
        currentPrice: 69180.10,
        status: "OPEN",
        createdAt: ts()
      },
      {
        id: "POS-DEMO-002",
        orderId: "ORD-DEMO-002",
        symbol: "ETH/USDT",
        side: "LONG",
        qty: 4.2,
        avgPrice: 3488.20,
        currentPrice: 3561.40,
        status: "OPEN",
        createdAt: ts()
      }
    ]
  };

  db.watchlist = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD", "NASDAQ", "US30"];
  db.alerts = [
    { id: "AL-DEMO-001", symbol: "BTC/USDT", type: "PRICE", target: 70000, condition: "ABOVE", enabled: true, createdAt: ts() },
    { id: "AL-DEMO-002", symbol: "ETH/USDT", type: "PRICE", target: 3600, condition: "ABOVE", enabled: true, createdAt: ts() },
    { id: "AL-DEMO-003", symbol: "XAU/USD", type: "PRICE", target: 2350, condition: "ABOVE", enabled: true, createdAt: ts() }
  ];

  db.journal = [
    { id: "JR-DEMO-001", symbol: "BTC/USDT", title: "Momentum carry", note: "Local demo setup confirmed trend continuation posture.", mood: "FOCUSED", outcome: "WATCH", tags: ["local","demo"], createdAt: ts() },
    { id: "JR-DEMO-002", symbol: "ETH/USDT", title: "Rotation watch", note: "Strength remains constructive above local support.", mood: "CALM", outcome: "REVIEW", tags: ["rotation","demo"], createdAt: ts() }
  ];

  db.users = [
    {
      id: "USR-LOCAL-OWNER",
      name: "Global Operator",
      email: "owner@tradingpromax.ai",
      role: "OWNER",
      tier: "FOUNDING",
      status: "ACTIVE",
      onboardingComplete: true,
      createdAt: ts()
    }
  ];

  db.session = {
    active: true,
    userId: "USR-LOCAL-OWNER",
    token: "SESS-LOCAL-OWNER",
    lastLoginAt: ts()
  };

  db.settings = {
    theme: "dark",
    timezone: "UTC",
    defaultRisk: "BALANCED",
    liveTrading: false,
    onboardingComplete: true
  };

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

  db.orders = [
    {
      id: "ORD-DEMO-001",
      symbol: "BTC/USDT",
      side: "LONG",
      qty: 0.6,
      entryPrice: 68210.55,
      currentPrice: 69180.10,
      status: "OPEN",
      executionMode: "PAPER_EXEC",
      createdAt: ts()
    },
    {
      id: "ORD-DEMO-002",
      symbol: "ETH/USDT",
      side: "LONG",
      qty: 4.2,
      entryPrice: 3488.20,
      currentPrice: 3561.40,
      status: "OPEN",
      executionMode: "PAPER_EXEC",
      createdAt: ts()
    },
    {
      id: "ORD-DEMO-003",
      symbol: "SOL/USDT",
      side: "LONG",
      qty: 25,
      entryPrice: 178.40,
      currentPrice: 183.90,
      exitPrice: 183.90,
      pnl: 137.5,
      status: "CLOSED",
      executionMode: "PAPER_EXEC",
      createdAt: ts(),
      closedAt: ts()
    }
  ];

  db.ledger = [
    {
      id: "LED-DEMO-001",
      type: "ORDER_OPEN",
      orderId: "ORD-DEMO-001",
      symbol: "BTC/USDT",
      side: "LONG",
      qty: 0.6,
      price: 68210.55,
      executionMode: "PAPER_EXEC",
      createdAt: ts()
    },
    {
      id: "LED-DEMO-002",
      type: "ORDER_OPEN",
      orderId: "ORD-DEMO-002",
      symbol: "ETH/USDT",
      side: "LONG",
      qty: 4.2,
      price: 3488.20,
      executionMode: "PAPER_EXEC",
      createdAt: ts()
    },
    {
      id: "LED-DEMO-003",
      type: "ORDER_CLOSE",
      orderId: "ORD-DEMO-003",
      symbol: "SOL/USDT",
      side: "LONG",
      qty: 25,
      entryPrice: 178.40,
      exitPrice: 183.90,
      pnl: 137.5,
      createdAt: ts()
    }
  ];

  writeDb(db);
  writeJson(GROWTH_FILE, demoGrowth());
  writeJson(BACKBONE_FILE, demoBackbone());
  writeJson(BACKUPS_FILE, demoBackups());
  writeJson(AUDIT_FILE, demoAudit());

  addLog("LOCAL FACTORY -> DEMO SEEDED");
  return buildLocalFactoryStatus();
}

export function resetLocalFactory() {
  const db = readDb();

  db.portfolio = { cash: 100000, positions: [] };
  db.watchlist = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD"];
  db.alerts = [];
  db.journal = [];
  db.orders = [];
  db.ledger = [];
  db.settings = {
    ...(db.settings || {}),
    theme: "dark",
    timezone: "UTC",
    defaultRisk: "BALANCED",
    liveTrading: false,
    onboardingComplete: true
  };

  writeDb(db);
  writeJson(GROWTH_FILE, demoGrowth());
  writeJson(BACKUPS_FILE, demoBackups());
  writeJson(AUDIT_FILE, demoAudit());

  addLog("LOCAL FACTORY -> RESET COMPLETE");
  return buildLocalFactoryStatus();
}
