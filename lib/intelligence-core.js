param([string]$ProjectPath="C:\Users\ahmad\Desktop\trading-pro-max-full")

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $ProjectPath

New-Item -ItemType Directory -Force `
  ".\lib" `
  ".\app\intelligence" `
  ".\app\api\intelligence\overview" `
  ".\app\api\intelligence\signals" `
  ".\app\api\intelligence\opportunities" `
  ".\app\api\intelligence\decisions" | Out-Null

@'
import { getState } from "./state.js";
import { getEngineStatus } from "./engine.js";
import { readDb } from "./core-db.js";

function n(x) {
  return Number(x || 0);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pick(list, i) {
  return list[i % list.length];
}

function buildUniverse() {
  const db = readDb();
  const base = Array.isArray(db.watchlist) && db.watchlist.length
    ? db.watchlist
    : ["BTC/USDT", "ETH/USDT", "SOL/USDT", "EUR/USD", "XAU/USD", "NASDAQ", "US30"];

  return [...new Set(base)].slice(0, 12);
}

function signalFor(symbol, index, state, engine) {
  const directions = ["CALL", "PUT", "HOLD"];
  const volatilitySet = ["LOW", "MEDIUM", "HIGH"];
  const horizonSet = ["SCALP", "INTRADAY", "SWING"];
  const direction = pick(directions, index + (engine.running ? 1 : 2));
  const volatility = pick(volatilitySet, index + n(engine.ticks));
  const horizon = pick(horizonSet, index + (state.autoMode ? 1 : 2));

  const baseConfidence =
    58 +
    (engine.running ? 8 : 0) +
    (state.aiEnabled ? 7 : -4) +
    (state.riskMode === "SAFE" ? 4 : state.riskMode === "AGGRESSIVE" ? -2 : 1) +
    (volatility === "LOW" ? 8 : volatility === "MEDIUM" ? 4 : -3) +
    ((index * 3) % 11);

  const confidence = clamp(Math.round(baseConfidence), 45, 96);
  const score = clamp(
    confidence +
    (direction === "CALL" || direction === "PUT" ? 6 : -4) +
    (horizon === "SWING" ? 4 : horizon === "INTRADAY" ? 2 : 0),
    0,
    100
  );

  return {
    symbol,
    direction,
    confidence,
    volatility,
    horizon,
    score,
    updatedAt: new Date().toISOString()
  };
}

export function buildSignalMatrix() {
  const state = getState();
  const engine = getEngineStatus();
  const universe = buildUniverse();

  return universe
    .map((symbol, index) => signalFor(symbol, index, state, engine))
    .sort((a, b) => b.score - a.score);
}

export function buildOpportunities() {
  const state = getState();
  const db = readDb();
  const signals = buildSignalMatrix();

  const alerts = Array.isArray(db.alerts) ? db.alerts.length : 0;
  const brokers = Array.isArray(db.brokers) ? db.brokers.filter(x => x.connected).length : 0;
  const sessionActive = Boolean(db.session?.active);

  return signals.slice(0, 8).map((x, i) => {
    const executionReadiness =
      52 +
      (sessionActive ? 10 : -8) +
      (brokers > 0 ? 8 : -4) +
      (alerts > 0 ? 4 : 0) +
      (state.protection?.guardianStatus === "ARMED" ? 8 : -10) +
      (i % 5);

    const priority =
      x.score >= 88 ? "PRIME" :
      x.score >= 78 ? "HIGH" :
      x.score >= 68 ? "MEDIUM" : "LOW";

    return {
      ...x,
      priority,
      executionReadiness: clamp(Math.round(executionReadiness), 20, 100),
      note:
        priority === "PRIME" ? "highest signal alignment across engine, risk, and session posture" :
        priority === "HIGH" ? "strong candidate with good execution posture" :
        priority === "MEDIUM" ? "monitor closely and wait for better confirmation" :
        "keep on radar only"
    };
  });
}

export function buildDecisions() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();
  const opportunities = buildOpportunities();
  const top = opportunities[0] || null;

  const items = [];

  items.push({
    title: "Guardian posture",
    owner: "risk",
    action: state.protection?.guardianStatus === "ARMED" ? "KEEP_GUARDIAN_ARMED" : "RESTORE_GUARDIAN",
    priority: state.protection?.guardianStatus === "ARMED" ? "LOW" : "CRITICAL",
    detail: "guardian is " + (state.protection?.guardianStatus || "UNKNOWN")
  });

  items.push({
    title: "Operator session",
    owner: "identity",
    action: db.session?.active ? "MAINTAIN_SESSION" : "ACTIVATE_SESSION",
    priority: db.session?.active ? "LOW" : "CRITICAL",
    detail: db.session?.active ? "operator session active" : "operator session inactive"
  });

  items.push({
    title: "Engine state",
    owner: "core",
    action: engine.running ? "KEEP_ENGINE_RUNNING" : "START_ENGINE",
    priority: engine.running ? "LOW" : "CRITICAL",
    detail: engine.running ? "engine loop is active" : "engine loop is stopped"
  });

  if (top) {
    items.push({
      title: "Top opportunity",
      owner: "intelligence",
      action: "TRACK_" + top.symbol.replace(/[^A-Z0-9]/gi, "_"),
      priority: top.priority,
      detail: top.symbol + " · " + top.direction + " · confidence " + top.confidence + "%"
    });
  }

  items.push({
    title: "Live trading gate",
    owner: "guardian",
    action: state.protection?.liveTradingEnabled ? "REVIEW_LIVE_GATE" : "KEEP_LIVE_GATED",
    priority: state.protection?.liveTradingEnabled ? "HIGH" : "MEDIUM",
    detail: "live trading " + (state.protection?.liveTradingEnabled ? "enabled" : "disabled")
  });

  return items;
}

export function buildIntelligenceOverview() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();
  const signals = buildSignalMatrix();
  const opportunities = buildOpportunities();
  const decisions = buildDecisions();

  const readiness = Number((
    (
      n(state.metrics?.engineReadiness) +
      n(state.metrics?.platformReadiness) +
      n(state.metrics?.launchReadiness) +
      n(state.metrics?.privateOperatorStack) +
      (engine.running ? 88 : 52) +
      (db.session?.active ? 86 : 44) +
      ((Array.isArray(db.brokers) ? db.brokers.filter(x => x.connected).length : 0) > 0 ? 82 : 58)
    ) / 7
  ).toFixed(2));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Intelligence Fabric",
      progress: 80
    },
    core: {
      status: state.status,
      riskMode: state.riskMode,
      autoMode: state.autoMode,
      aiEnabled: state.aiEnabled
    },
    engine: {
      running: Boolean(engine.running),
      ticks: n(engine.ticks),
      lastSignal: engine.lastSignal || "NONE",
      lastTick: engine.lastTick || null
    },
    counts: {
      signals: signals.length,
      opportunities: opportunities.length,
      decisions: decisions.length,
      watchlist: Array.isArray(db.watchlist) ? db.watchlist.length : 0,
      alerts: Array.isArray(db.alerts) ? db.alerts.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0
    },
    readiness,
    updatedAt: new Date().toISOString()
  };
}
