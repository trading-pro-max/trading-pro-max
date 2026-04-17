import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDefaultWatchlistSymbols } from "./market-catalog.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DESK_STATE_FILE = path.join(DATA_DIR, "trading-terminal-desk.json");
const DESK_RECOVERY_FILE = path.join(DATA_DIR, "trading-terminal-desk-recovery.json");
const REFRESH_POLICY_KEYS = new Set(["Fast", "Balanced", "Deliberate"]);
const CONNECTOR_STATE_KEYS = new Set(["not_configured", "configured", "validating", "ready", "blocked", "unsupported", "error"]);

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function trimList(items = [], limit = 120) {
  return items.slice(0, limit);
}

export function createDeskId(prefix = "ID") {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function createDeskLog(level, message, extra = {}) {
  return {
    id: createDeskId(level === "ERROR" ? "ERR" : "LOG"),
    time: new Date().toISOString(),
    level,
    message,
    ...extra
  };
}

function defaultFavorites() {
  return Object.fromEntries(getDefaultWatchlistSymbols().map((symbol, index) => [symbol, index < 4]));
}

function normalizeOrder(order = {}) {
  return {
    id: order.id || createDeskId("ORD"),
    symbol: String(order.symbol || "").trim(),
    side: order.side === "Sell" ? "Sell" : "Buy",
    quantity: numeric(order.quantity, 0),
    type: ["Market", "Limit", "Stop"].includes(order.type) ? order.type : "Market",
    entryPrice: numeric(order.entryPrice ?? order.entry, 0),
    stopLoss: numeric(order.stopLoss, 0),
    takeProfit: numeric(order.takeProfit, 0),
    leverage: Math.max(1, numeric(order.leverage, 1)),
    createdTime: order.createdTime || order.timestamp || new Date().toISOString(),
    filledTime: order.filledTime || null,
    status: order.status || "Pending",
    pnl: numeric(order.pnl, 0),
    unrealizedPnl: numeric(order.unrealizedPnl, 0),
    realizedPnl: numeric(order.realizedPnl, 0),
    notional: numeric(order.notional, 0),
    riskAmount: numeric(order.riskAmount, 0),
    rejectionReason: order.rejectionReason || null,
    warningFlags: Array.isArray(order.warningFlags) ? order.warningFlags : []
  };
}

function normalizePosition(position = {}) {
  return {
    id: position.id || createDeskId("POS"),
    symbol: String(position.symbol || "").trim(),
    side: position.side === "Short" ? "Short" : "Long",
    quantity: numeric(position.quantity, 0),
    entryPrice: numeric(position.entryPrice ?? position.entry, 0),
    marketPrice: numeric(position.marketPrice ?? position.entryPrice, 0),
    stopLoss: numeric(position.stopLoss, 0),
    takeProfit: numeric(position.takeProfit, 0),
    leverage: Math.max(1, numeric(position.leverage, 1)),
    createdTime: position.createdTime || position.openedAt || new Date().toISOString(),
    updatedTime: position.updatedTime || position.createdTime || new Date().toISOString(),
    status: position.status || "Open",
    pnl: numeric(position.pnl, 0),
    unrealizedPnl: numeric(position.unrealizedPnl, 0),
    realizedPnl: numeric(position.realizedPnl, 0),
    usedCapital: numeric(position.usedCapital, 0),
    notional: numeric(position.notional, 0)
  };
}

function normalizeFill(fill = {}) {
  return {
    id: fill.id || createDeskId("FIL"),
    orderId: fill.orderId || null,
    positionId: fill.positionId || null,
    symbol: String(fill.symbol || "").trim(),
    side: fill.side === "Sell" ? "Sell" : "Buy",
    quantity: numeric(fill.quantity, 0),
    type: fill.type || "Market",
    price: numeric(fill.price ?? fill.entry, 0),
    status: fill.status || "Filled",
    createdTime: fill.createdTime || fill.timestamp || new Date().toISOString(),
    realizedPnl: numeric(fill.realizedPnl, 0),
    unrealizedPnl: numeric(fill.unrealizedPnl, 0)
  };
}

function normalizeAccount(account = {}) {
  const startingBalance = numeric(account.startingBalance, 100000);
  const balance = numeric(account.balance, startingBalance);
  const equity = numeric(account.equity, balance);
  const usedMargin = numeric(account.usedMargin, 0);

  return {
    startingBalance,
    balance,
    equity,
    freeMargin: numeric(account.freeMargin, equity - usedMargin),
    usedMargin,
    sessionPnl: numeric(account.sessionPnl, equity - startingBalance),
    realizedPnl: numeric(account.realizedPnl, balance - startingBalance),
    unrealizedPnl: numeric(account.unrealizedPnl, equity - balance),
    wins: numeric(account.wins, 0),
    losses: numeric(account.losses, 0),
    exposureBySymbol:
      account.exposureBySymbol && typeof account.exposureBySymbol === "object" && !Array.isArray(account.exposureBySymbol)
        ? account.exposureBySymbol
        : {}
  };
}

function normalizeRisk(risk = {}) {
  const stopLossPolicy = risk.stopLossPolicy === "warn-only" ? "warn-only" : "required";

  return {
    maxPaperPositionNotional: numeric(risk.maxPaperPositionNotional ?? risk.maxPositionSize, 65000),
    maxSymbolExposure: numeric(risk.maxSymbolExposure, 90000),
    maxSessionExposure: numeric(risk.maxSessionExposure, 250000),
    maxSessionLoss: numeric(risk.maxSessionLoss, 6500),
    requireStopLoss: stopLossPolicy === "required" ? true : boolean(risk.requireStopLoss, false),
    stopLossPolicy,
    warnOnConflictingExposure: boolean(risk.warnOnConflictingExposure, true),
    preventDuplicateOrders: boolean(risk.preventDuplicateOrders, true),
    preventConflictingOrders: boolean(risk.preventConflictingOrders, true),
    blockPreviewExecution: boolean(risk.blockPreviewExecution, true)
  };
}

function normalizeControls(controls = {}) {
  const refreshPolicyKey = REFRESH_POLICY_KEYS.has(controls.refreshPolicyKey) ? controls.refreshPolicyKey : "Balanced";

  return {
    refreshPolicyKey,
    sessionId: controls.sessionId || createDeskId("SES"),
    lastAction: controls.lastAction || null,
    lastResetAt: controls.lastResetAt || null,
    lastRecoveredAt: controls.lastRecoveredAt || null,
    lastClearedAuditAt: controls.lastClearedAuditAt || null,
    lastClearedExecutionAt: controls.lastClearedExecutionAt || null,
    lastRestoredDefaultsAt: controls.lastRestoredDefaultsAt || null
  };
}

function normalizePersistence(persistence = {}) {
  return {
    status: persistence.status || "Persisted",
    path: persistence.path || DESK_STATE_FILE,
    lastSavedAt: persistence.lastSavedAt || new Date().toISOString(),
    lastError: persistence.lastError || null
  };
}

function normalizeConnectorRecord(record = {}) {
  return {
    lastValidatedAt: record.lastValidatedAt || null,
    lastKnownStatus: CONNECTOR_STATE_KEYS.has(record.lastKnownStatus) ? record.lastKnownStatus : "not_configured",
    lastKnownSummary: record.lastKnownSummary || "",
    validationCount: Math.max(0, numeric(record.validationCount, 0))
  };
}

function normalizeConnectors(connectors = {}) {
  const records =
    connectors.records && typeof connectors.records === "object" && !Array.isArray(connectors.records)
      ? Object.fromEntries(Object.entries(connectors.records).map(([key, value]) => [key, normalizeConnectorRecord(value)]))
      : {};

  return {
    lastValidationSweepAt: connectors.lastValidationSweepAt || null,
    lastRecheckAt: connectors.lastRecheckAt || null,
    lastAction: connectors.lastAction || null,
    records
  };
}

function normalizeDecisionSnapshot(item = {}) {
  return {
    id: item.id || createDeskId("JRN"),
    time: item.time || new Date().toISOString(),
    symbol: item.symbol || "",
    timeframe: item.timeframe || "15m",
    bias: item.bias || "Balanced",
    confidence: numeric(item.confidence, 0),
    confidenceBreakdown: Array.isArray(item.confidenceBreakdown) ? item.confidenceBreakdown : [],
    momentumState: item.momentumState || "Balanced",
    volatilityState: item.volatilityState || "Contained",
    structureState: item.structureState || item.marketStructureState || "Neutral Structure",
    regime: item.regime || "Range",
    opportunityScore: numeric(item.opportunityScore, 0),
    riskScore: numeric(item.riskScore, 0),
    whyTrade: Array.isArray(item.whyTrade) ? item.whyTrade : [],
    whyNot: Array.isArray(item.whyNot) ? item.whyNot : [],
    whatChanged: Array.isArray(item.whatChanged) ? item.whatChanged : [],
    invalidationFactors: Array.isArray(item.invalidationFactors) ? item.invalidationFactors : [],
    riskFlags: Array.isArray(item.riskFlags) ? item.riskFlags : []
  };
}

function normalizeRecommendation(item = {}) {
  return {
    id: item.id || createDeskId("REC"),
    time: item.time || new Date().toISOString(),
    symbol: item.symbol || "",
    timeframe: item.timeframe || "15m",
    code: item.code || "operator-review",
    title: item.title || "Review operator state",
    detail: item.detail || "Operator review recommended.",
    action: item.action || "Inspect desk state.",
    severity: item.severity || "info",
    signature: item.signature || "",
    changed: boolean(item.changed, false)
  };
}

export function normalizeDeskState(state = {}) {
  const watchlistSymbols =
    Array.isArray(state.watchlistSymbols) && state.watchlistSymbols.length
      ? state.watchlistSymbols.map((item) => String(item).trim()).filter(Boolean)
      : getDefaultWatchlistSymbols();

  const risk = normalizeRisk(state.risk);

  return {
    version: 3,
    selectedSymbol: state.selectedSymbol || watchlistSymbols[0] || "EUR/USD",
    selectedTimeframe: state.selectedTimeframe || "15m",
    accountMode: state.accountMode === "Preview" ? "Preview" : "Paper",
    providerKey: state.providerKey || "demo",
    favorites:
      state.favorites && typeof state.favorites === "object" && !Array.isArray(state.favorites)
        ? { ...defaultFavorites(), ...state.favorites }
        : defaultFavorites(),
    watchlistSymbols,
    risk,
    controls: normalizeControls(state.controls),
    account: normalizeAccount(state.account),
    orders: trimList((state.orders || []).map(normalizeOrder), 240),
    positions: trimList((state.positions || []).map(normalizePosition), 120),
    fills: trimList((state.fills || []).map(normalizeFill), 240),
    activityLog: trimList(
      (state.activityLog || []).map((item) => ({
        id: item.id || createDeskId("ACT"),
        time: item.time || new Date().toISOString(),
        event: item.event || "Desk event",
        owner: item.owner || "System",
        status: item.status || "Logged",
        detail: item.detail || ""
      })),
      180
    ),
    auditTrail: trimList(
      (state.auditTrail || []).map((item) => ({
        id: item.id || createDeskId("AUD"),
        time: item.time || new Date().toISOString(),
        level: item.level || "INFO",
        message: item.message || "Audit event recorded."
      })),
      260
    ),
    decisionJournal: trimList((state.decisionJournal || []).map(normalizeDecisionSnapshot), 220),
    recommendationHistory: trimList((state.recommendationHistory || []).map(normalizeRecommendation), 220),
    system: {
      lastMarketSyncAt: state.system?.lastMarketSyncAt || null,
      lastExecutionSyncAt: state.system?.lastExecutionSyncAt || null,
      lastQuoteSyncAt: state.system?.lastQuoteSyncAt || null,
      lastCandleSyncAt: state.system?.lastCandleSyncAt || null,
      lastOverviewSyncAt: state.system?.lastOverviewSyncAt || null,
      executionHealth: state.system?.executionHealth || "Ready",
      sessionIntegrity: state.system?.sessionIntegrity || "Nominal"
    },
    connectors: normalizeConnectors(state.connectors),
    persistence: normalizePersistence(state.persistence)
  };
}

export function createDefaultDeskState() {
  return normalizeDeskState({});
}

export function readDeskState() {
  try {
    ensureDataDir();
    if (!fs.existsSync(DESK_STATE_FILE)) {
      return normalizeDeskState({});
    }

    const raw = fs.readFileSync(DESK_STATE_FILE, "utf8");
    return normalizeDeskState(JSON.parse(raw));
  } catch {
    return normalizeDeskState({});
  }
}

export function writeDeskState(state) {
  ensureDataDir();
  const normalized = normalizeDeskState(state);
  const payload = {
    ...normalized,
    persistence: {
      ...normalized.persistence,
      status: "Persisted",
      path: DESK_STATE_FILE,
      lastSavedAt: new Date().toISOString(),
      lastError: null
    }
  };

  fs.writeFileSync(DESK_STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export function updateDeskState(mutator) {
  const current = readDeskState();
  const next = mutator(structuredClone(current)) || current;
  return writeDeskState(next);
}

export function writeDeskRecovery(state, reason = "Operator checkpoint") {
  ensureDataDir();
  const payload = {
    capturedAt: new Date().toISOString(),
    reason,
    path: DESK_RECOVERY_FILE,
    state: normalizeDeskState(state)
  };

  fs.writeFileSync(DESK_RECOVERY_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export function readDeskRecovery() {
  try {
    ensureDataDir();
    if (!fs.existsSync(DESK_RECOVERY_FILE)) return null;

    const raw = JSON.parse(fs.readFileSync(DESK_RECOVERY_FILE, "utf8"));
    return {
      capturedAt: raw.capturedAt || null,
      reason: raw.reason || "Operator checkpoint",
      path: raw.path || DESK_RECOVERY_FILE,
      state: normalizeDeskState(raw.state || {})
    };
  } catch {
    return null;
  }
}

export function clearDeskRecovery() {
  ensureDataDir();
  if (fs.existsSync(DESK_RECOVERY_FILE)) {
    fs.unlinkSync(DESK_RECOVERY_FILE);
  }
}

export function getDeskStatePath() {
  return DESK_STATE_FILE;
}

export function getDeskRecoveryPath() {
  return DESK_RECOVERY_FILE;
}
