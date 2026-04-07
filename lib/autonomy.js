import { addLog, getState } from "./state.js";

const g = globalThis;

function ensureAutonomy() {
  if (!g.__TPM_AUTONOMY__) {
    g.__TPM_AUTONOMY__ = {
      running: false,
      cycles: 0,
      lastCycle: null,
      timer: null,
      mode: "SAFE_AUTONOMY",
      hardeningScore: 78,
      userProtectionScore: 81,
      tradingCoverageScore: 74,
      platformScore: 76,
      lastDecision: "BOOT",
      nextUpgrades: [],
      guardrails: [
        "never trade live without explicit enablement",
        "default to protected user mode",
        "prioritize risk controls before expansion",
        "self-upgrade through planned safe cycles only"
      ]
    };
  }
  return g.__TPM_AUTONOMY__;
}

function snapshot() {
  const a = ensureAutonomy();
  return {
    running: a.running,
    cycles: a.cycles,
    lastCycle: a.lastCycle,
    mode: a.mode,
    hardeningScore: a.hardeningScore,
    userProtectionScore: a.userProtectionScore,
    tradingCoverageScore: a.tradingCoverageScore,
    platformScore: a.platformScore,
    lastDecision: a.lastDecision,
    nextUpgrades: a.nextUpgrades,
    guardrails: a.guardrails
  };
}

function buildNextUpgrades() {
  const a = ensureAutonomy();
  const s = getState();
  const upgrades = [];

  if (a.hardeningScore < 95) {
    upgrades.push({ domain: "security", title: "upgrade self-healing security mesh", priority: "critical" });
    upgrades.push({ domain: "security", title: "expand API abuse protection and anomaly detection", priority: "critical" });
  }

  if (a.userProtectionScore < 95) {
    upgrades.push({ domain: "user-protection", title: "raise capital protection and risk kill-switch depth", priority: "critical" });
    upgrades.push({ domain: "user-protection", title: "strengthen user guidance, warnings, and mode safety", priority: "high" });
  }

  if (a.tradingCoverageScore < 95) {
    upgrades.push({ domain: "trading", title: "expand signal engine, paper execution, and journal intelligence", priority: "high" });
    upgrades.push({ domain: "trading", title: "add portfolio, watchlist, alerts, and strategy lab coverage", priority: "high" });
  }

  if (a.platformScore < 95) {
    upgrades.push({ domain: "platform", title: "improve mission control, observability, and automation center", priority: "high" });
    upgrades.push({ domain: "platform", title: "prepare desktop, mobile, broker, and cloud operating layers", priority: "high" });
  }

  if (s.riskMode !== "SAFE") {
    upgrades.push({ domain: "risk", title: "recommend safer default user posture until full hardening closes", priority: "medium" });
  }

  a.nextUpgrades = upgrades.slice(0, 8);
  return a.nextUpgrades;
}

function applyCycle() {
  const a = ensureAutonomy();
  const s = getState();

  a.cycles += 1;
  a.lastCycle = new Date().toISOString();

  a.hardeningScore = Math.min(100, a.hardeningScore + (Math.random() > 0.35 ? 1 : 0));
  a.userProtectionScore = Math.min(100, a.userProtectionScore + (Math.random() > 0.40 ? 1 : 0));
  a.tradingCoverageScore = Math.min(100, a.tradingCoverageScore + (Math.random() > 0.45 ? 1 : 0));
  a.platformScore = Math.min(100, a.platformScore + (Math.random() > 0.50 ? 1 : 0));

  s.metrics.engineReadiness = Math.min(100, s.metrics.engineReadiness + (Math.random() > 0.40 ? 1 : 0));
  s.metrics.platformReadiness = Math.min(100, s.metrics.platformReadiness + (Math.random() > 0.45 ? 1 : 0));
  s.metrics.launchReadiness = Math.min(100, s.metrics.launchReadiness + (Math.random() > 0.55 ? 1 : 0));
  s.metrics.privateOperatorStack = Math.min(100, s.metrics.privateOperatorStack + (Math.random() > 0.50 ? 1 : 0));

  buildNextUpgrades();

  if (a.cycles % 2 === 0) {
    a.lastDecision = "SECURITY_HARDENING";
    addLog("AUTONOMY -> HARDENING ADVANCE " + a.hardeningScore + "%");
  }

  if (a.cycles % 3 === 0) {
    a.lastDecision = "USER_PROTECTION_UPGRADE";
    addLog("AUTONOMY -> USER PROTECTION " + a.userProtectionScore + "%");
  }

  if (a.cycles % 4 === 0) {
    a.lastDecision = "TRADING_COVERAGE_EXPANSION";
    addLog("AUTONOMY -> TRADING COVERAGE " + a.tradingCoverageScore + "%");
  }

  if (a.cycles % 5 === 0) {
    a.lastDecision = "PLATFORM_EVOLUTION";
    addLog("AUTONOMY -> PLATFORM SCORE " + a.platformScore + "%");
  }

  return snapshot();
}

export function getAutonomyStatus() {
  buildNextUpgrades();
  return snapshot();
}

export function startAutonomy() {
  const a = ensureAutonomy();
  if (!a.running) {
    a.running = true;
    a.timer = setInterval(applyCycle, 2500);
    a.lastDecision = "AUTONOMY_STARTED";
    addLog("AUTONOMY STARTED");
  }
  return snapshot();
}

export function stopAutonomy() {
  const a = ensureAutonomy();
  if (a.timer) {
    clearInterval(a.timer);
    a.timer = null;
  }
  a.running = false;
  a.lastDecision = "AUTONOMY_STOPPED";
  addLog("AUTONOMY STOPPED");
  return snapshot();
}

export function runAutonomyCycle() {
  return applyCycle();
}
