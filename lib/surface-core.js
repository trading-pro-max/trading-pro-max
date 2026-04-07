param([string]$ProjectPath="C:\Users\ahmad\Desktop\trading-pro-max-full")

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $ProjectPath

New-Item -ItemType Directory -Force `
  ".\lib" `
  ".\app\mobile-hq" `
  ".\app\desktop-hq" `
  ".\app\api\surface\status" | Out-Null

@'
import { getState } from "./state.js";
import { getEngineStatus } from "./engine.js";
import { readDb } from "./core-db.js";

function n(x) {
  return Number(x || 0);
}

export function buildSurfaceStatus() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();

  const watchlist = Array.isArray(db.watchlist) ? db.watchlist : [];
  const alerts = Array.isArray(db.alerts) ? db.alerts : [];
  const journal = Array.isArray(db.journal) ? db.journal : [];
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const ledger = Array.isArray(db.ledger) ? db.ledger : [];
  const brokers = Array.isArray(db.brokers) ? db.brokers : [];
  const users = Array.isArray(db.users) ? db.users : [];
  const logs = Array.isArray(state.logs) ? state.logs : [];
  const positions = Array.isArray(db.portfolio?.positions) ? db.portfolio.positions : [];

  const surfaceScore = Number((
    (
      n(state.metrics?.engineReadiness) +
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness) +
      n(state.metrics?.privateOperatorStack) +
      (engine.running ? 88 : 55) +
      ((db.session?.active) ? 86 : 44) +
      (brokers.length > 0 ? 80 : 52) +
      (orders.length > 0 ? 78 : 58)
    ) / 8
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Global Surface",
      progress: 74
    },
    core: {
      status: state.status,
      riskMode: state.riskMode,
      autoMode: state.autoMode,
      aiEnabled: state.aiEnabled
    },
    guardian: {
      status: state.protection?.guardianStatus || "UNKNOWN",
      sessionMode: state.protection?.sessionMode || "UNKNOWN",
      killSwitch: Boolean(state.protection?.killSwitch),
      liveTradingEnabled: Boolean(state.protection?.liveTradingEnabled)
    },
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE",
      lastTick: engine.lastTick || null
    },
    workspace: {
      cash: n(db.portfolio?.cash),
      positions: positions.length,
      watchlist: watchlist.length,
      alerts: alerts.length,
      journal: journal.length,
      orders: orders.length,
      ledger: ledger.length,
      users: users.length,
      brokers: brokers.length,
      connectedBrokers: brokers.filter(x => x.connected).length
    },
    channels: {
      mobile: {
        title: "Mobile HQ",
        score: Math.min(100, Math.round(surfaceScore - 2)),
        mode: "monitoring-first"
      },
      desktop: {
        title: "Desktop HQ",
        score: Math.min(100, Math.round(surfaceScore + 3)),
        mode: "operator-first"
      }
    },
    feed: logs.slice(0, 12),
    updatedAt: new Date().toISOString()
  };
}
