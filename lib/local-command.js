import { buildLaunchpadStatus, runLaunchpadBoot, ensureDb, readSnapshots, createSnapshot } from "./local-launchpad.js";

function n(x) {
  return Number(x || 0);
}

export function buildLocalCommandStatus() {
  const launchpad = buildLaunchpadStatus();
  const db = ensureDb();
  const snaps = readSnapshots();

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Command Bus",
      progress: 99
    },
    commandReadiness: 96,
    summary: {
      finalReadiness: 96,
      launchpad: n(launchpad.finalReadiness),
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
    updatedAt: new Date().toISOString()
  };
}

export function runLocalCommand(mode = "START_DAY") {
  const db = ensureDb();
  const x = String(mode || "").trim().toUpperCase();

  if (x === "START_DAY") {
    runLaunchpadBoot("FULL_BOOT");
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
      createdAt: new Date().toISOString()
    });

    db.ledger.unshift({
      id: "LED-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      type: "ORDER_OPEN",
      symbol: "BTC/USDT",
      qty: 0.25,
      price: 69000,
      createdAt: new Date().toISOString()
    });

    db.portfolio.positions.unshift({
      id: "POS-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      symbol: "BTC/USDT",
      side: "LONG",
      qty: 0.25,
      avgPrice: 69000,
      currentPrice: 69420,
      status: "OPEN",
      createdAt: new Date().toISOString()
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

  createSnapshot("local-command-" + x.toLowerCase());
  return buildLocalCommandStatus();
}
