import { getState, runCommand, applyProtection } from "./state.js";
import { getEngineStatus, startEngine, stopEngine } from "./engine.js";
import { readDb } from "./core-db.js";

function n(x) {
  return Number(x || 0);
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

export function buildLocalOSStatus() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();

  const watchlist = safeArray(db.watchlist);
  const alerts = safeArray(db.alerts);
  const journal = safeArray(db.journal);
  const orders = safeArray(db.orders);
  const ledger = safeArray(db.ledger);
  const users = safeArray(db.users);
  const brokers = safeArray(db.brokers);
  const positions = safeArray(db.portfolio?.positions);
  const logs = safeArray(state.logs);

  const uiScore = Number((
    (
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness) +
      n(state.metrics?.privateOperatorStack) +
      (engine.running ? 88 : 52) +
      (db.session?.active ? 86 : 44) +
      (watchlist.length >= 5 ? 84 : 58) +
      (orders.length >= 1 ? 82 : 54) +
      (brokers.length >= 1 ? 80 : 50)
    ) / 8
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Operating System",
      progress: 78
    },
    core: {
      status: state.status,
      autoMode: state.autoMode,
      aiEnabled: state.aiEnabled,
      riskMode: state.riskMode
    },
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE",
      lastTick: engine.lastTick || null
    },
    guardian: {
      status: state.protection?.guardianStatus || "UNKNOWN",
      sessionMode: state.protection?.sessionMode || "UNKNOWN",
      killSwitch: Boolean(state.protection?.killSwitch),
      liveTradingEnabled: Boolean(state.protection?.liveTradingEnabled),
      maxDailyLoss: n(state.protection?.maxDailyLoss),
      maxOpenPositions: n(state.protection?.maxOpenPositions)
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
    uiScore,
    logs: logs.slice(0, 10),
    updatedAt: new Date().toISOString()
  };
}

export function buildLocalModules() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();

  const brokers = safeArray(db.brokers);
  const orders = safeArray(db.orders);
  const ledger = safeArray(db.ledger);
  const watchlist = safeArray(db.watchlist);
  const alerts = safeArray(db.alerts);
  const journal = safeArray(db.journal);

  return [
    { key: "war-room", title: "War Room", url: "/war-room", score: 88, status: "ONLINE" },
    { key: "local-os", title: "Local OS", url: "/local-os", score: 92, status: "ACTIVE" },
    { key: "control", title: "Mission Control", url: "/control", score: n(state.metrics?.platformReadiness), status: state.status },
    { key: "workspace", title: "Workspace", url: "/workspace", score: Math.min(100, 58 + watchlist.length * 4 + alerts.length * 6 + journal.length * 4), status: "ONLINE" },
    { key: "execution", title: "Execution", url: "/execution", score: Math.min(100, 56 + orders.length * 5 + ledger.length * 6), status: "ONLINE" },
    { key: "brokers", title: "Broker Hub", url: "/brokers", score: Math.min(100, 55 + brokers.length * 6 + brokers.filter(x => x.connected).length * 8), status: "READY" },
    { key: "research", title: "Research", url: "/research", score: 76, status: "ONLINE" },
    { key: "risk", title: "Risk Center", url: "/risk", score: state.protection?.guardianStatus === "ARMED" ? 88 : 62, status: state.protection?.guardianStatus || "UNKNOWN" },
    { key: "analytics", title: "Analytics", url: "/analytics", score: 79, status: "ONLINE" },
    { key: "operator-os", title: "Operator OS", url: "/operator-os", score: 84, status: db.session?.active ? "ACTIVE" : "READY" },
    { key: "desktop-hq", title: "Desktop HQ", url: "/desktop-hq", score: 82, status: "ONLINE" },
    { key: "mobile-hq", title: "Mobile HQ", url: "/mobile-hq", score: 78, status: "ONLINE" },
    { key: "intelligence", title: "Intelligence", url: "/intelligence", score: engine.running ? 83 : 64, status: "ONLINE" },
    { key: "release", title: "Release Center", url: "/release-center", score: 75, status: "ONLINE" }
  ];
}

export function runLocalQuickAction(action) {
  const x = String(action || "").trim().toUpperCase();

  if (x === "ENGINE_START") startEngine();
  if (x === "ENGINE_STOP") stopEngine();
  if (x === "AUTO_ON") runCommand("AUTO_ON");
  if (x === "AUTO_OFF") runCommand("AUTO_OFF");
  if (x === "AI_ON") runCommand("AI_ON");
  if (x === "AI_OFF") runCommand("AI_OFF");
  if (x === "RISK_SAFE") runCommand("RISK_SAFE");
  if (x === "RISK_BALANCED") runCommand("RISK_BALANCED");
  if (x === "LOCK_RISK") applyProtection("LOCK_RISK");
  if (x === "UNLOCK_RISK") applyProtection("UNLOCK_RISK");
  if (x === "KILL_SWITCH_ON") applyProtection("KILL_SWITCH_ON");
  if (x === "KILL_SWITCH_OFF") applyProtection("KILL_SWITCH_OFF");
  if (x === "LIVE_DISABLE") applyProtection("LIVE_DISABLE");

  return buildLocalOSStatus();
}
