import { readDb, writeDb } from "./core-db.js";
import { getState, runCommand, applyProtection, addLog } from "./state.js";
import { getEngineStatus, startEngine, stopEngine } from "./engine.js";
import { buildLocalOSStatus } from "./local-os.js";
import { buildLocalQAStatus } from "./local-qa.js";
import { buildReleaseBoard } from "./release-orchestrator.js";

function n(x) {
  return Number(x || 0);
}

export function buildLaunchpadStatus() {
  const os = buildLocalOSStatus();
  const qa = buildLocalQAStatus();
  const release = buildReleaseBoard();
  const db = readDb();
  const state = getState();
  const engine = getEngineStatus();

  const finalReadiness = Number((
    (
      n(os.uiScore) +
      n(qa.summary?.readiness) +
      n(release.summary?.releaseReadiness) +
      (engine.running ? 88 : 52) +
      (db.session?.active ? 86 : 44) +
      (state.protection?.guardianStatus === "ARMED" ? 90 : 55)
    ) / 6
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Launchpad",
      progress: 88
    },
    finalReadiness,
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
      liveTradingEnabled: Boolean(state.protection?.liveTradingEnabled)
    },
    localOS: {
      uiScore: n(os.uiScore),
      watchlist: n(os.workspace?.watchlist),
      alerts: n(os.workspace?.alerts),
      orders: n(os.workspace?.orders),
      brokers: n(os.workspace?.brokers)
    },
    qa: qa.summary,
    release: release.summary,
    session: {
      active: Boolean(db.session?.active),
      userId: db.session?.userId || null,
      onboardingComplete: Boolean(db.settings?.onboardingComplete)
    },
    updatedAt: new Date().toISOString()
  };
}

export function runLaunchpadBoot(action = "FULL_BOOT") {
  const x = String(action || "").trim().toUpperCase();
  const db = readDb();

  if (!Array.isArray(db.users) || db.users.length === 0) {
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

  writeDb(db);

  if (x === "FULL_BOOT") {
    startEngine();
    runCommand("AUTO_ON");
    runCommand("AI_ON");
    runCommand("RISK_BALANCED");
    applyProtection("UNLOCK_RISK");
    applyProtection("KILL_SWITCH_OFF");
    applyProtection("LIVE_DISABLE");
  }

  if (x === "SAFE_BOOT") {
    startEngine();
    runCommand("AUTO_ON");
    runCommand("AI_ON");
    runCommand("RISK_SAFE");
    applyProtection("LOCK_RISK");
    applyProtection("KILL_SWITCH_OFF");
    applyProtection("LIVE_DISABLE");
  }

  if (x === "QUIET_MODE") {
    stopEngine();
    runCommand("AUTO_OFF");
    runCommand("AI_OFF");
    runCommand("RISK_SAFE");
    applyProtection("LOCK_RISK");
    applyProtection("LIVE_DISABLE");
  }

  if (x === "RESET_SESSION") {
    db.session = {
      active: true,
      userId: db.users[0].id,
      token: "SESS-LOCAL-RESET",
      lastLoginAt: new Date().toISOString()
    };
    writeDb(db);
  }

  addLog("LAUNCHPAD -> " + x);
  return buildLaunchpadStatus();
}
