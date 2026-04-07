import { readStateFromDisk, writeStateToDisk } from "./store.js";

const g = globalThis;

const baseState = {
  status: "ONLINE",
  autoMode: true,
  aiEnabled: true,
  riskMode: "BALANCED",
  lastCommand: "BOOT",
  metrics: {
    engineReadiness: 82,
    platformReadiness: 76,
    launchReadiness: 68,
    privateOperatorStack: 72
  },
  logs: [
    { time: new Date().toISOString(), text: "CORE REBUILD ONLINE" }
  ],
  paperTrades: [],
  protection: {
    killSwitch: false,
    liveTradingEnabled: false,
    maxDailyLoss: 250,
    maxOpenPositions: 3,
    sessionMode: "PROTECTED",
    guardianStatus: "ARMED"
  }
};

function ensureStateShape(state) {
  return {
    ...baseState,
    ...(state || {}),
    metrics: {
      ...baseState.metrics,
      ...((state && state.metrics) || {})
    },
    logs: Array.isArray(state?.logs) ? state.logs : baseState.logs,
    paperTrades: Array.isArray(state?.paperTrades) ? state.paperTrades : [],
    protection: {
      ...baseState.protection,
      ...((state && state.protection) || {})
    }
  };
}

if (!g.__TPM_STATE__) {
  g.__TPM_STATE__ = ensureStateShape(readStateFromDisk() || baseState);
  writeStateToDisk(g.__TPM_STATE__);
}

export function getState() {
  g.__TPM_STATE__ = ensureStateShape(g.__TPM_STATE__);
  return g.__TPM_STATE__;
}

export function persistState() {
  g.__TPM_STATE__ = ensureStateShape(g.__TPM_STATE__);
  writeStateToDisk(g.__TPM_STATE__);
}

export function addLog(text) {
  const s = getState();
  s.logs.unshift({
    time: new Date().toISOString(),
    text
  });
  s.logs = s.logs.slice(0, 80);
  persistState();
}

export function runCommand(command) {
  const s = getState();
  s.lastCommand = command;

  switch (command) {
    case "AUTO_ON":
      s.autoMode = true;
      addLog("AUTO MODE ENABLED");
      break;
    case "AUTO_OFF":
      s.autoMode = false;
      addLog("AUTO MODE DISABLED");
      break;
    case "AI_ON":
      s.aiEnabled = true;
      addLog("AI ENABLED");
      break;
    case "AI_OFF":
      s.aiEnabled = false;
      addLog("AI DISABLED");
      break;
    case "RISK_SAFE":
      s.riskMode = "SAFE";
      addLog("RISK MODE SAFE");
      break;
    case "RISK_BALANCED":
      s.riskMode = "BALANCED";
      addLog("RISK MODE BALANCED");
      break;
    case "RISK_AGGRESSIVE":
      if (s.protection.killSwitch || s.protection.sessionMode === "PROTECTED") {
        addLog("AGGRESSIVE RISK BLOCKED BY GUARDIAN");
      } else {
        s.riskMode = "AGGRESSIVE";
        addLog("RISK MODE AGGRESSIVE");
      }
      break;
    case "SYSTEM_SCAN":
      s.metrics.engineReadiness = Math.min(100, s.metrics.engineReadiness + 1);
      s.metrics.platformReadiness = Math.min(100, s.metrics.platformReadiness + 1);
      s.metrics.launchReadiness = Math.min(100, s.metrics.launchReadiness + 1);
      addLog("SYSTEM SCAN COMPLETE");
      break;
    default:
      addLog("COMMAND EXECUTED -> " + command);
      break;
  }

  persistState();
  return s;
}

export function applyProtection(action) {
  const s = getState();
  const p = s.protection;

  switch (action) {
    case "KILL_SWITCH_ON":
      p.killSwitch = true;
      p.liveTradingEnabled = false;
      p.guardianStatus = "LOCKDOWN";
      p.sessionMode = "PROTECTED";
      s.autoMode = false;
      if (s.riskMode === "AGGRESSIVE") s.riskMode = "BALANCED";
      addLog("GUARDIAN -> KILL SWITCH ON");
      break;

    case "KILL_SWITCH_OFF":
      p.killSwitch = false;
      p.guardianStatus = "ARMED";
      addLog("GUARDIAN -> KILL SWITCH OFF");
      break;

    case "LIVE_ENABLE":
      if (!p.killSwitch) {
        p.liveTradingEnabled = true;
        p.guardianStatus = "ARMED";
        addLog("GUARDIAN -> LIVE TRADING ENABLED");
      } else {
        addLog("GUARDIAN -> LIVE ENABLE BLOCKED");
      }
      break;

    case "LIVE_DISABLE":
      p.liveTradingEnabled = false;
      addLog("GUARDIAN -> LIVE TRADING DISABLED");
      break;

    case "LOCK_RISK":
      p.sessionMode = "PROTECTED";
      if (s.riskMode === "AGGRESSIVE") s.riskMode = "BALANCED";
      addLog("GUARDIAN -> RISK LOCK ACTIVE");
      break;

    case "UNLOCK_RISK":
      p.sessionMode = "FLEX";
      addLog("GUARDIAN -> RISK LOCK RELEASED");
      break;

    default:
      addLog("GUARDIAN -> UNKNOWN ACTION " + action);
      break;
  }

  persistState();
  return s;
}

export function setProtectionLimits(payload) {
  const s = getState();
  const p = s.protection;

  if (payload.maxDailyLoss !== undefined) {
    p.maxDailyLoss = Number(payload.maxDailyLoss);
  }

  if (payload.maxOpenPositions !== undefined) {
    p.maxOpenPositions = Number(payload.maxOpenPositions);
  }

  addLog("GUARDIAN -> LIMITS UPDATED");
  persistState();
  return s;
}

export function getLiveMarket() {
  return {
    symbol: "BTC/USDT",
    price: 68871.09,
    signal: Math.random() > 0.5 ? "CALL" : "PUT",
    confidence: 84,
    time: new Date().toISOString()
  };
}
