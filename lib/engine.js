import { addLog, getLiveMarket, getState, persistState } from "./state.js";

const g = globalThis;

function ensureEngine() {
  if (!g.__TPM_ENGINE__) {
    g.__TPM_ENGINE__ = {
      running: false,
      ticks: 0,
      lastTick: null,
      timer: null,
      lastSignal: null
    };
  }
  return g.__TPM_ENGINE__;
}

function snapshot() {
  const e = ensureEngine();
  return {
    running: e.running,
    ticks: e.ticks,
    lastTick: e.lastTick,
    lastSignal: e.lastSignal
  };
}

function makePaperTrade(market, ticks) {
  const direction = Math.random() > 0.5 ? "CALL" : "PUT";
  const entry = Number(market.price);
  const exit = Number((entry + (Math.random() * 220 - 110)).toFixed(2));
  const pnl = Number((exit - entry).toFixed(2));

  return {
    id: "PT-" + Date.now() + "-" + ticks,
    symbol: market.symbol,
    signal: direction,
    confidence: market.confidence,
    entry,
    exit,
    status: "CLOSED",
    pnl,
    createdAt: new Date().toISOString()
  };
}

function tick() {
  const e = ensureEngine();
  const s = getState();
  const market = getLiveMarket();

  e.ticks += 1;
  e.lastTick = new Date().toISOString();
  e.lastSignal = market.signal;

  s.metrics.engineReadiness = Math.min(100, s.metrics.engineReadiness + (Math.random() > 0.45 ? 1 : 0));
  s.metrics.platformReadiness = Math.min(100, s.metrics.platformReadiness + (Math.random() > 0.70 ? 1 : 0));
  s.metrics.launchReadiness = Math.min(100, s.metrics.launchReadiness + (Math.random() > 0.82 ? 1 : 0));

  if (e.ticks % 4 === 0) {
    addLog("AI LOOP -> " + market.symbol + " " + market.signal + " @ " + market.price);
  }

  if (e.ticks % 6 === 0) {
    const trade = makePaperTrade(market, e.ticks);
    s.paperTrades.unshift(trade);
    s.paperTrades = s.paperTrades.slice(0, 24);
    addLog("PAPER TRADE -> " + trade.signal + " " + trade.symbol + " @ " + trade.entry + " | PnL " + trade.pnl);
  }

  if (e.ticks % 9 === 0) {
    addLog("RISK CHECK -> " + s.riskMode);
  }

  persistState();
}

export function getEngineStatus() {
  ensureEngine();
  return snapshot();
}

export function startEngine() {
  const e = ensureEngine();
  if (!e.running) {
    e.running = true;
    e.timer = setInterval(tick, 1000);
    addLog("ENGINE STARTED");
  }
  persistState();
  return snapshot();
}

export function stopEngine() {
  const e = ensureEngine();
  if (e.timer) {
    clearInterval(e.timer);
    e.timer = null;
  }
  e.running = false;
  addLog("ENGINE STOPPED");
  persistState();
  return snapshot();
}
