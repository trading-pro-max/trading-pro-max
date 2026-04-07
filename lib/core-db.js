import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "workspace-db.json");

const DEFAULT_DB = {
  portfolio: {
    cash: 100000,
    positions: []
  },
  journal: [],
  watchlist: ["BTC/USDT", "ETH/USDT", "EUR/USD"],
  alerts: [],
  orders: [],
  ledger: [],
  settings: {
    theme: "dark",
    timezone: "UTC",
    defaultRisk: "BALANCED",
    liveTrading: false,
    onboardingComplete: false
  },
  users: [],
  session: {
    active: false,
    userId: null,
    token: null,
    lastLoginAt: null
  }
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizeUser(user) {
  return {
    id: user?.id || makeId("USR"),
    name: user?.name || "Operator",
    email: user?.email || "",
    role: user?.role || "OWNER",
    tier: user?.tier || "FOUNDING",
    status: user?.status || "ACTIVE",
    onboardingComplete: Boolean(user?.onboardingComplete),
    createdAt: user?.createdAt || new Date().toISOString()
  };
}

function normalizeDb(db) {
  return {
    portfolio: {
      cash: Number(db?.portfolio?.cash ?? DEFAULT_DB.portfolio.cash),
      positions: Array.isArray(db?.portfolio?.positions) ? db.portfolio.positions : []
    },
    journal: Array.isArray(db?.journal) ? db.journal : [],
    watchlist: Array.isArray(db?.watchlist) ? db.watchlist : [...DEFAULT_DB.watchlist],
    alerts: Array.isArray(db?.alerts) ? db.alerts : [],
    orders: Array.isArray(db?.orders) ? db.orders : [],
    ledger: Array.isArray(db?.ledger) ? db.ledger : [],
    settings: {
      ...DEFAULT_DB.settings,
      ...(db?.settings || {})
    },
    users: Array.isArray(db?.users) ? db.users.map(normalizeUser) : [],
    session: {
      ...DEFAULT_DB.session,
      ...(db?.session || {})
    }
  };
}

export function makeId(prefix = "ID") {
  return prefix + "-" + randomUUID().slice(0, 8).toUpperCase();
}

export function readDb() {
  try {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
      return normalizeDb(DEFAULT_DB);
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return normalizeDb(JSON.parse(raw));
  } catch {
    return normalizeDb(DEFAULT_DB);
  }
}

export function writeDb(db) {
  ensureDir();
  const normalized = normalizeDb(db);
  fs.writeFileSync(DB_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export function mutateDb(mutator) {
  const current = readDb();
  const next = mutator(structuredClone(current)) || current;
  return writeDb(next);
}
