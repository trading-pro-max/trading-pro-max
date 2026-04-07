import { readDb, writeDb } from "./core-db.js";
import { getState, applyProtection, addLog } from "./state.js";
import { getEngineStatus } from "./engine.js";
import { getBackboneStatus } from "./backbone.js";
import { buildCloudStatus } from "./cloud-core.js";
import { buildGrowthStatus } from "./growth-store.js";

function n(x) {
  return Number(x || 0);
}

export function buildOperatorStatus() {
  const db = readDb();
  const state = getState();
  const engine = getEngineStatus();
  const backbone = getBackboneStatus();
  const cloud = buildCloudStatus();
  const growth = buildGrowthStatus();

  const users = Array.isArray(db.users) ? db.users : [];
  const watchlist = Array.isArray(db.watchlist) ? db.watchlist : [];
  const alerts = Array.isArray(db.alerts) ? db.alerts : [];
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const ledger = Array.isArray(db.ledger) ? db.ledger : [];

  const operatingScore = Number((
    (
      n(state.metrics?.engineReadiness) +
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness) +
      n(state.metrics?.privateOperatorStack) +
      n(backbone.release?.readiness) +
      n(cloud.deploymentReadiness) +
      n(growth.launchScore)
    ) / 7
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Operator OS",
      progress: 68
    },
    operator: {
      sessionActive: Boolean(db.session?.active),
      userId: db.session?.userId || null,
      lastLoginAt: db.session?.lastLoginAt || null,
      users: users.length
    },
    preferences: {
      theme: db.settings?.theme || "dark",
      timezone: db.settings?.timezone || "UTC",
      defaultRisk: db.settings?.defaultRisk || "BALANCED",
      liveTrading: Boolean(db.settings?.liveTrading),
      onboardingComplete: Boolean(db.settings?.onboardingComplete)
    },
    guardian: {
      status: state.protection?.guardianStatus || "UNKNOWN",
      sessionMode: state.protection?.sessionMode || "UNKNOWN",
      killSwitch: Boolean(state.protection?.killSwitch),
      liveTradingEnabled: Boolean(state.protection?.liveTradingEnabled),
      maxDailyLoss: n(state.protection?.maxDailyLoss),
      maxOpenPositions: n(state.protection?.maxOpenPositions)
    },
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE",
      lastTick: engine.lastTick || null
    },
    workspace: {
      watchlist: watchlist.length,
      alerts: alerts.length,
      orders: orders.length,
      ledger: ledger.length,
      cash: n(db.portfolio?.cash)
    },
    scores: {
      operator: operatingScore,
      backbone: n(backbone.release?.readiness),
      cloud: n(cloud.deploymentReadiness),
      growth: n(growth.launchScore)
    },
    updatedAt: new Date().toISOString()
  };
}

export function updatePreferences(payload = {}) {
  const db = readDb();

  db.settings = {
    ...(db.settings || {}),
    theme: payload.theme || db.settings?.theme || "dark",
    timezone: payload.timezone || db.settings?.timezone || "UTC",
    defaultRisk: payload.defaultRisk || db.settings?.defaultRisk || "BALANCED",
    liveTrading: payload.liveTrading !== undefined ? Boolean(payload.liveTrading) : Boolean(db.settings?.liveTrading),
    onboardingComplete: payload.onboardingComplete !== undefined ? Boolean(payload.onboardingComplete) : Boolean(db.settings?.onboardingComplete)
  };

  writeDb(db);
  addLog("OPERATOR OS -> PREFERENCES UPDATED");
  return buildOperatorStatus();
}

export function activateOperatorSession(payload = {}) {
  const db = readDb();
  const email = String(payload.email || "owner@tradingpromax.ai").trim().toLowerCase();
  const name = String(payload.name || "Global Operator").trim();
  const role = String(payload.role || "OWNER").trim().toUpperCase();

  let user = (db.users || []).find((x) => String(x.email || "").toLowerCase() === email);

  if (!user) {
    user = {
      id: "USR-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      name,
      email,
      role,
      tier: "FOUNDING",
      status: "ACTIVE",
      onboardingComplete: true,
      createdAt: new Date().toISOString()
    };
    db.users.unshift(user);
  }

  db.session = {
    active: true,
    userId: user.id,
    token: "SESS-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    lastLoginAt: new Date().toISOString()
  };

  writeDb(db);
  addLog("OPERATOR OS -> SESSION ACTIVE");
  return buildOperatorStatus();
}

export function endOperatorSession() {
  const db = readDb();
  db.session = {
    active: false,
    userId: null,
    token: null,
    lastLoginAt: null
  };
  writeDb(db);
  addLog("OPERATOR OS -> SESSION ENDED");
  return buildOperatorStatus();
}

export function setUserRole(payload = {}) {
  const db = readDb();
  const userId = String(payload.userId || "").trim();
  const role = String(payload.role || "TRADER").trim().toUpperCase();

  db.users = (db.users || []).map((x) =>
    x.id === userId ? { ...x, role } : x
  );

  writeDb(db);
  addLog("OPERATOR OS -> USER ROLE UPDATED");
  return buildOperatorStatus();
}

export function runGuardianAction(payload = {}) {
  const action = String(payload.action || "").trim().toUpperCase();

  if (action === "LOCK_RISK") applyProtection("LOCK_RISK");
  if (action === "UNLOCK_RISK") applyProtection("UNLOCK_RISK");
  if (action === "KILL_SWITCH_ON") applyProtection("KILL_SWITCH_ON");
  if (action === "KILL_SWITCH_OFF") applyProtection("KILL_SWITCH_OFF");
  if (action === "LIVE_DISABLE") applyProtection("LIVE_DISABLE");
  if (action === "LIVE_ENABLE") applyProtection("LIVE_ENABLE");

  addLog("OPERATOR OS -> GUARDIAN ACTION " + action);
  return buildOperatorStatus();
}
