import {
  fetchProviderCandles,
  fetchProviderQuotes,
  getConfiguredMarketProviderKey,
  getMarketProviderCatalog,
  resolveProviderRuntime
} from "./market-provider.js";
import {
  PAPER_ACCOUNT_MODES,
  getInstrumentMeta,
  getTimeframeConfig,
  listTimeframeKeys
} from "./market-catalog.js";
import {
  createDefaultDeskState,
  createDeskId,
  getDeskRecoveryPath,
  getDeskStatePath,
  normalizeDeskState,
  readDeskRecovery,
  readDeskState,
  writeDeskRecovery,
  writeDeskState
} from "./persistence.js";
import {
  cancelPaperOrder,
  closePaperPosition,
  submitPaperOrder,
  synchronizePaperState
} from "./paper-execution.js";
import {
  buildConnectorReadiness,
  buildDecisionSnapshot,
  buildOperatorAssistant,
  recordDecisionSnapshot,
  recordOperatorRecommendations
} from "./operator-intelligence.js";

const TERMINAL_SECTIONS = [
  { id: "Dashboard", short: "DB", badge: "Core", detail: "Macro desk overview with live execution context." },
  { id: "Markets", short: "MK", badge: "Live", detail: "Cross-asset tape, regime, and venue posture." },
  { id: "Watchlist", short: "WL", badge: "Desk", detail: "Focused symbols and favorites ready for handoff." },
  { id: "Execution", short: "EX", badge: "Hot", detail: "Ticketing, routing, and realistic paper execution." },
  { id: "Portfolio", short: "PF", badge: "AUM", detail: "Capital, concentration, and session PnL map." },
  { id: "Positions", short: "PS", badge: "Live", detail: "Open risk, protected lanes, and reversal logic." },
  { id: "Orders", short: "OR", badge: "Book", detail: "Working, filled, cancelled, and rejected orders." },
  { id: "Journal", short: "JR", badge: "Log", detail: "Decision journal and audit-ready operator trail." },
  { id: "Risk Control", short: "RC", badge: "Armed", detail: "Local guardrails, warnings, and hard blocks." },
  { id: "Control Center", short: "OP", badge: "Ops", detail: "Operator controls, recovery, and readiness management." },
  { id: "Diagnostics", short: "DG", badge: "Ops", detail: "Provider, persistence, and runtime health." }
];

const CHART_CONFIG = {
  timeframes: listTimeframeKeys(),
  indicators: ["VWAP", "EMA 20", "EMA 50", "Volume", "Auction Levels"],
  tools: ["Crosshair", "Trendline", "Measure", "Alert", "Notes"],
  panelTabs: ["Price", "Volume", "Order Flow", "Correlation"]
};

const EXECUTION_CONFIG = {
  orderTypes: ["Market", "Limit", "Stop"],
  tif: ["DAY", "GTC", "IOC"],
  accountModes: PAPER_ACCOUNT_MODES
};

export const REFRESH_POLICIES = {
  Fast: {
    key: "Fast",
    label: "Fast / Tactical",
    description: "Higher refresh cadence for active local paper routing.",
    overviewMs: 3500,
    chartMs: 2200,
    providerMs: 8000
  },
  Balanced: {
    key: "Balanced",
    label: "Balanced / Desk",
    description: "Balanced refresh policy for the default operator desk.",
    overviewMs: 5000,
    chartMs: 3500,
    providerMs: 15000
  },
  Deliberate: {
    key: "Deliberate",
    label: "Deliberate / Review",
    description: "Lower refresh cadence for stable review and audit work.",
    overviewMs: 9000,
    chartMs: 6000,
    providerMs: 22000
  }
};

function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value, digits) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits ?? (Math.abs(value) >= 1000 ? 0 : 2)
  }).format(value);
}

function formatPrice(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  return Number(value).toFixed(digits);
}

function formatSignedPercent(value) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatTimestamp(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatRelativeAge(timestamp) {
  if (!timestamp) return "No sync";
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(timestamp)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dedupe(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function quoteAgeSeconds(timestamp) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - Date.parse(timestamp)) / 1000));
}

function quoteFreshness(category, timestamp) {
  const age = quoteAgeSeconds(timestamp);
  if (category !== "Digital Asset") {
    const day = new Date().getUTCDay();
    if ((day === 0 || day === 6) && age <= 72 * 60 * 60) return "Session Closed";
  }

  const fresh = category === "Digital Asset" ? 8 : category === "FX Major" ? 18 : 45;
  const warm = category === "Digital Asset" ? 35 : category === "FX Major" ? 75 : 15 * 60;

  if (age <= fresh) return "Fresh";
  if (age <= warm) return "Warm";
  return "Stale";
}

function chartFreshness(timeframeKey, timestamp) {
  if (!timestamp) return "Stale";
  const age = Math.max(0, Date.now() - Date.parse(timestamp));
  const timeframe = getTimeframeConfig(timeframeKey);
  if (age <= timeframe.intervalMs * 1.5) return "Fresh";
  if (age <= timeframe.intervalMs * 4) return "Warm";
  return "Stale";
}

function buildSequence(providerKey, timestamp) {
  const stamp = timestamp ? String(Date.parse(timestamp)).slice(-6) : "000000";
  return `${providerKey.toUpperCase()}-${stamp}`;
}

function getRefreshPolicy(key = "Balanced") {
  return REFRESH_POLICIES[key] || REFRESH_POLICIES.Balanced;
}

function stableJoin(parts = []) {
  return parts
    .flatMap((part) => {
      if (Array.isArray(part)) return [part.join("^")];
      if (part && typeof part === "object") return [JSON.stringify(part)];
      return [String(part ?? "")];
    })
    .join("::");
}

function buildProviderSignature(provider = {}) {
  return stableJoin([
    provider.key,
    provider.label,
    provider.requestedKey,
    provider.requestedLabel,
    provider.state,
    provider.feedHealth,
    provider.freshness,
    provider.fallbackActive ? 1 : 0,
    provider.partialCoverage ? 1 : 0,
    provider.blockedReason || "",
    provider.lastUpdate || "",
    provider.latencyMs || 0
  ]);
}

function buildChartSignature(chart = {}) {
  return stableJoin([
    chart.symbol,
    chart.key,
    chart.label,
    chart.updatedAt || "",
    chart.rawLast,
    chart.rawChange,
    chart.freshness,
    chart.sourceLabel,
    chart.readinessState,
    chart.atr,
    chart.volume,
    chart.imbalance,
    chart.syncState,
    (chart.statsStrip || []).map((item) => stableJoin([item.label, item.value])),
    (chart.candles || []).slice(-6).map((item) =>
      stableJoin([item.time || item.label || "", item.open, item.high, item.low, item.close, item.volume])
    )
  ]);
}

function buildPersistenceFingerprint(state = {}) {
  return stableJoin([
    state.selectedSymbol,
    state.selectedTimeframe,
    state.accountMode,
    state.providerKey,
    state.watchlistSymbols || [],
    Object.entries(state.favorites || {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}:${value ? 1 : 0}`),
    [
      state.risk?.maxPaperPositionNotional,
      state.risk?.maxSymbolExposure,
      state.risk?.maxSessionExposure,
      state.risk?.maxSessionLoss,
      state.risk?.stopLossPolicy,
      state.risk?.preventDuplicateOrders ? 1 : 0,
      state.risk?.preventConflictingOrders ? 1 : 0,
      state.risk?.blockPreviewExecution ? 1 : 0
    ],
    [
      state.controls?.refreshPolicyKey,
      state.controls?.sessionId,
      state.controls?.lastAction || "",
      state.controls?.lastResetAt || "",
      state.controls?.lastRecoveredAt || "",
      state.controls?.lastClearedAuditAt || "",
      state.controls?.lastClearedExecutionAt || "",
      state.controls?.lastRestoredDefaultsAt || ""
    ],
    [
      state.account?.startingBalance,
      state.account?.balance,
      state.account?.equity,
      state.account?.freeMargin,
      state.account?.usedMargin,
      state.account?.sessionPnl,
      state.account?.realizedPnl,
      state.account?.unrealizedPnl,
      state.account?.wins,
      state.account?.losses,
      state.account?.exposureBySymbol || {}
    ],
    (state.orders || []).map((order) =>
      stableJoin([
        order.id,
        order.symbol,
        order.side,
        order.quantity,
        order.type,
        order.entryPrice,
        order.stopLoss,
        order.takeProfit,
        order.leverage,
        order.status,
        order.filledTime || "",
        order.rejectionReason || "",
        order.warningFlags || []
      ])
    ),
    (state.positions || []).map((position) =>
      stableJoin([
        position.id,
        position.symbol,
        position.side,
        position.quantity,
        position.entryPrice,
        position.marketPrice,
        position.stopLoss,
        position.takeProfit,
        position.status,
        position.unrealizedPnl,
        position.realizedPnl,
        position.notional,
        position.usedCapital
      ])
    ),
    (state.fills || []).map((fill) =>
      stableJoin([
        fill.id,
        fill.orderId || "",
        fill.positionId || "",
        fill.symbol,
        fill.side,
        fill.quantity,
        fill.type,
        fill.price,
        fill.status,
        fill.realizedPnl,
        fill.unrealizedPnl
      ])
    ),
    (state.activityLog || []).slice(0, 20).map((entry) => stableJoin([entry.id, entry.time, entry.event, entry.owner, entry.status, entry.detail])),
    (state.auditTrail || []).slice(0, 20).map((entry) => stableJoin([entry.id, entry.time, entry.level, entry.message])),
    (state.decisionJournal || []).slice(0, 10).map((entry) =>
      stableJoin([entry.id, entry.time, entry.symbol, entry.timeframe, entry.bias, entry.confidence, entry.opportunityScore, entry.riskScore])
    ),
    (state.recommendationHistory || []).slice(0, 10).map((entry) =>
      stableJoin([entry.id, entry.time, entry.symbol, entry.timeframe, entry.code, entry.severity, entry.signature])
    ),
    [state.system?.executionHealth || "", state.system?.sessionIntegrity || ""]
  ]);
}

function shouldPersistDeskState(previousState, nextState) {
  return buildPersistenceFingerprint(previousState) !== buildPersistenceFingerprint(nextState);
}

function appendActivity(state, event, owner, status, detail = "") {
  state.activityLog = [
    {
      id: createDeskId("ACT"),
      time: new Date().toISOString(),
      event,
      owner,
      status,
      detail
    },
    ...(state.activityLog || [])
  ].slice(0, 180);
}

function appendAudit(state, level, message) {
  state.auditTrail = [
    {
      id: createDeskId("AUD"),
      time: new Date().toISOString(),
      level,
      message
    },
    ...(state.auditTrail || [])
  ].slice(0, 260);
}

function resetExecutionState(state) {
  const startingBalance = numeric(state.account.startingBalance, 100000);
  state.orders = [];
  state.positions = [];
  state.fills = [];
  state.account = {
    ...state.account,
    balance: startingBalance,
    equity: startingBalance,
    freeMargin: startingBalance,
    usedMargin: 0,
    sessionPnl: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    wins: 0,
    losses: 0,
    exposureBySymbol: {}
  };
  state.system.executionHealth = "Ready";
  state.system.lastExecutionSyncAt = new Date().toISOString();
}

async function collectQuotes(state, symbols) {
  const requestedKey = state.providerKey || getConfiguredMarketProviderKey();
  const runtime = await resolveProviderRuntime({ requestedKey });
  const primaryQuotes = await fetchProviderQuotes(runtime.resolved.key, symbols);
  const quoteMap = Object.fromEntries(primaryQuotes.map((quote) => [quote.symbol, quote]));
  const missingSymbols = symbols.filter((symbol) => !quoteMap[symbol]);

  if (missingSymbols.length) {
    const fallbackQuotes = await fetchProviderQuotes("demo", missingSymbols);
    fallbackQuotes.forEach((quote) => {
      quoteMap[quote.symbol] = quote;
    });
  }

  const latestTimestamp = Object.values(quoteMap)
    .map((quote) => quote.timestamp)
    .filter(Boolean)
    .sort()
    .pop();
  const fallbackActive = runtime.fallbackActive || missingSymbols.length > 0;
  const provider = {
    key: runtime.resolved.key,
    label: runtime.resolved.label,
    requestedKey: runtime.requested.key,
    requestedLabel: runtime.requested.label,
    state: fallbackActive ? "Fallback Active" : "Streaming",
    feedHealth:
      runtime.resolvedHealth.state === "ready" && !missingSymbols.length
        ? "Healthy"
        : runtime.resolvedHealth.state === "ready"
          ? "Stable"
          : "Fallback",
    freshness: runtime.resolvedHealth.freshness || "Fresh",
    fallbackActive,
    partialCoverage: missingSymbols.length > 0,
    blockedReason: runtime.fallbackReason,
    lastUpdate: latestTimestamp || runtime.resolvedHealth.updatedAt || new Date().toISOString(),
    readOnly: true,
    configPath: runtime.requestedHealth.path || getDeskStatePath(),
    providerCatalog: getMarketProviderCatalog(),
    latencyMs:
      runtime.resolved.key === "demo"
        ? 28
        : runtime.resolvedHealth.freshness === "Fresh"
          ? 45
          : runtime.resolvedHealth.freshness === "Warm"
            ? 72
            : 110
  };

  return {
    quoteMap,
    provider,
    runtime
  };
}

async function collectCandles(symbol, timeframeKey, runtime, limit) {
  const digits = getInstrumentMeta(symbol).digits;
  let candleBundle = await fetchProviderCandles(runtime.resolved.key, symbol, timeframeKey, limit);
  let fallbackUsed = false;

  if (!candleBundle?.candles?.length) {
    candleBundle = await fetchProviderCandles("demo", symbol, timeframeKey, limit);
    fallbackUsed = runtime.resolved.key !== "demo";
  }

  const candles = candleBundle?.candles || [];
  const closes = candles.map((item) => item.close);
  const highs = candles.map((item) => item.high);
  const lows = candles.map((item) => item.low);
  const volumes = candles.map((item) => item.volume || 0);
  const last = closes[closes.length - 1] ?? 0;
  const previous = closes[Math.max(0, closes.length - 2)] ?? last;
  const highMax = highs.length ? Math.max(...highs) : last;
  const lowMin = lows.length ? Math.min(...lows) : last;
  const range = highMax - lowMin;
  const vwap =
    volumes.reduce((sum, value, index) => sum + value * (closes[index] || 0), 0) /
    Math.max(volumes.reduce((sum, value) => sum + value, 0), 1);
  const atr = candles.length
    ? average(
        candles.slice(1).map((item, index) => {
          const previousClose = candles[index]?.close ?? item.close;
          return Math.max(
            item.high - item.low,
            Math.abs(item.high - previousClose),
            Math.abs(item.low - previousClose)
          );
        })
      )
    : 0;

  return {
    symbol,
    timeframe: timeframeKey,
    sourceLabel: fallbackUsed ? "Demo Feed" : runtime.resolved.label,
    fallbackUsed,
    updatedAt: candleBundle?.updatedAt || null,
    freshness: chartFreshness(timeframeKey, candleBundle?.updatedAt),
    readinessState: candles.length ? "Ready" : "Unavailable",
    candles,
    spark: candles.slice(-18).map((item) => round(item.close, digits)),
    rawLast: round(last, digits),
    rawChange: round(previous ? ((last - previous) / previous) * 100 : 0, 2),
    last: formatPrice(last, digits),
    change: formatSignedPercent(previous ? ((last - previous) / previous) * 100 : 0),
    sessionHigh: formatPrice(highMax, digits),
    sessionLow: formatPrice(lowMin, digits),
    vwap: formatPrice(vwap, digits),
    atr: formatPrice(atr, digits),
    volume: `${Math.round(volumes.reduce((sum, value) => sum + value, 0) / 1000)}k`,
    range: formatPrice(range, digits),
    imbalance:
      previous <= last
        ? `${52 + Math.min(18, Math.round(Math.abs(((last - previous) / Math.max(previous, 1)) * 1000)))} / ${48 - Math.min(12, Math.round(Math.abs(((last - previous) / Math.max(previous, 1)) * 400)))} bid skew`
        : `${47 - Math.min(11, Math.round(Math.abs(((last - previous) / Math.max(previous, 1)) * 400)))} / ${53 + Math.min(18, Math.round(Math.abs(((last - previous) / Math.max(previous, 1)) * 1000)))} offer skew`
  };
}

function buildMarketHeat(watchlist) {
  const groupMap = new Map();

  watchlist.forEach((item) => {
    const key =
      item.category === "FX Major"
        ? "FX"
        : item.category === "Equity Index" || item.category === "Single Stock"
          ? "Equities"
          : item.category === "Digital Asset"
            ? "Crypto"
            : item.category === "Macro Index"
              ? "Macro"
              : item.category === "Energy"
                ? "Energy"
                : "Defensive";
    const bucket = groupMap.get(key) || [];
    bucket.push(item.rawChange);
    groupMap.set(key, bucket);
  });

  return Array.from(groupMap.entries())
    .slice(0, 6)
    .map(([label, values]) => {
      const averageChange = average(values);
      return {
        label,
        value: formatSignedPercent(averageChange),
        state:
          averageChange > 0.45
            ? "Expansion"
            : averageChange < -0.45
              ? "Pressure"
              : "Balanced",
        tone: averageChange >= 0 ? "positive" : "negative"
      };
    });
}

function buildWatchlistEntry(symbol, quote, sparkBundle) {
  const meta = getInstrumentMeta(symbol);
  const freshness = quoteFreshness(meta.category, quote?.timestamp);
  const rawChange = numeric(quote?.changePct, 0);
  const confidence = clamp(
    meta.confidenceBase +
      Math.round(Math.abs(rawChange) * 4) +
      (freshness === "Fresh" ? 6 : freshness === "Warm" ? 2 : -6),
    54,
    95
  );
  const bias = rawChange > 0.25 ? "Bullish" : rawChange < -0.25 ? "Bearish" : "Balanced";

  return {
    symbol,
    name: meta.name,
    venue: meta.venue,
    category: meta.category,
    route: meta.route,
    pointValue: meta.pointValue,
    digits: meta.digits,
    tickSize: meta.tickSize,
    note: meta.note,
    catalyst: meta.catalyst,
    nextEvent: meta.nextEvent,
    liquidity: meta.liquidity,
    correlation: meta.correlation,
    bias,
    confidence,
    bid: formatPrice(numeric(quote?.bid, 0), meta.digits),
    ask: formatPrice(numeric(quote?.ask, 0), meta.digits),
    spread: formatPrice(numeric(quote?.spread, 0), Math.max(meta.digits, 2)),
    timestamp: quote?.timestamp || null,
    lastUpdate: formatTimestamp(quote?.timestamp),
    freshness,
    freshnessDetail: formatRelativeAge(quote?.timestamp),
    feedHealth:
      freshness === "Fresh"
        ? "Healthy"
        : freshness === "Warm"
          ? "Stable"
          : freshness === "Session Closed"
            ? "Session Closed"
            : "Degraded",
    rawChange,
    watchlist: {
      last: formatPrice(numeric(quote?.last, 0), meta.digits),
      rawLast: round(numeric(quote?.last, 0), meta.digits),
      change: formatSignedPercent(rawChange),
      rawChange,
      spark: sparkBundle?.spark?.length ? sparkBundle.spark : [],
      confidence: `${confidence}%`
    }
  };
}

function buildOrderDraft(selectedMarket, chart, state, decisionSnapshot) {
  const entry = chart.rawLast || selectedMarket.watchlist.rawLast;
  const atrValue = numeric(chart.atr, 0) || entry * 0.004;
  const defaultSide = decisionSnapshot.bias === "Bearish" ? "Sell" : "Buy";
  const stopDistance = Math.max(selectedMarket.tickSize * 3, atrValue * 0.9 || entry * 0.003);
  const targetDistance = stopDistance * 1.9;

  return {
    side: defaultSide,
    type: "Limit",
    tif: "DAY",
    quantity: "1.00",
    entry: formatPrice(entry, selectedMarket.digits),
    stopLoss: formatPrice(defaultSide === "Buy" ? entry - stopDistance : entry + stopDistance, selectedMarket.digits),
    takeProfit: formatPrice(defaultSide === "Buy" ? entry + targetDistance : entry - targetDistance, selectedMarket.digits),
    leverage: "4",
    riskAmount: formatPrice(stopDistance * selectedMarket.pointValue, 0),
    riskPolicy: state.risk.stopLossPolicy
  };
}

function buildPositionsSnapshot(positions) {
  return positions.map((position) => {
    const meta = getInstrumentMeta(position.symbol);
    return {
      id: position.id,
      symbol: position.symbol,
      side: position.side === "Long" ? "Buy" : "Sell",
      route: meta.route,
      quantity: position.quantity,
      entry: formatPrice(position.entryPrice, meta.digits),
      mark: formatPrice(position.marketPrice, meta.digits),
      pnl: position.unrealizedPnl,
      pnlText: formatCurrency(position.unrealizedPnl),
      status: position.status,
      openedAt: formatTimestamp(position.createdTime),
      stopLoss: formatPrice(position.stopLoss, meta.digits),
      takeProfit: formatPrice(position.takeProfit, meta.digits),
      notional: formatCurrency(position.notional),
      usedCapital: formatCurrency(position.usedCapital)
    };
  });
}

function buildPendingOrdersSnapshot(orders) {
  return orders
    .filter((order) => order.status === "Pending")
    .map((order) => {
      const meta = getInstrumentMeta(order.symbol);
      return {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        entry: formatPrice(order.entryPrice, meta.digits),
        rawEntry: order.entryPrice,
        status: order.status,
        timestamp: formatTimestamp(order.createdTime),
        stopLoss: formatPrice(order.stopLoss, meta.digits),
        takeProfit: formatPrice(order.takeProfit, meta.digits),
        accountMode: "Paper",
        warnings: order.warningFlags || []
      };
    });
}

function buildFillsSnapshot(fills) {
  return fills.map((fill) => {
    const meta = getInstrumentMeta(fill.symbol);
    return {
      id: fill.id,
      symbol: fill.symbol,
      side: fill.side,
      type: fill.type,
      quantity: fill.quantity,
      entry: formatPrice(fill.price, meta.digits),
      status: fill.status,
      timestamp: formatTimestamp(fill.createdTime),
      accountMode: "Paper",
      realizedPnl: fill.realizedPnl
    };
  });
}

function buildControlCenter(state, provider, recovery) {
  const refreshPolicy = getRefreshPolicy(state.controls.refreshPolicyKey);

  return {
    modeState: {
      current: state.accountMode,
      summary:
        state.accountMode === "Paper"
          ? "Paper mode is armed. Execution remains local-safe and deterministic."
          : "Live-ready preview remains visible but execution-locked."
    },
    providerSelection: {
      currentKey: state.providerKey,
      currentLabel: provider.requestedLabel,
      options: provider.providerCatalog.map((item) => ({
        key: item.key,
        label: item.label,
        mode: item.mode,
        description: item.description,
        selected: item.key === state.providerKey
      }))
    },
    refreshPolicy,
    session: {
      sessionId: state.controls.sessionId,
      recoveryAvailable: Boolean(recovery),
      recoveryCapturedAt: recovery?.capturedAt || null,
      recoveryReason: recovery?.reason || null,
      recoveryPath: recovery?.path || getDeskRecoveryPath(),
      lastAction: state.controls.lastAction,
      lastResetAt: state.controls.lastResetAt,
      lastRecoveredAt: state.controls.lastRecoveredAt,
      lastClearedAuditAt: state.controls.lastClearedAuditAt,
      lastClearedExecutionAt: state.controls.lastClearedExecutionAt,
      lastRestoredDefaultsAt: state.controls.lastRestoredDefaultsAt
    },
    actions: [
      {
        id: "safe-reset",
        label: "Safe reset",
        danger: "warning",
        detail: "Cancels staged orders and returns the desk to paper-safe defaults without erasing history."
      },
      {
        id: "recover-session",
        label: "Session recovery",
        danger: "neutral",
        detail: "Restores the last saved destructive-action checkpoint."
      },
      {
        id: "clear-audit",
        label: "Clear audit history",
        danger: "warning",
        detail: "Clears activity, audit, and recommendation history while keeping the desk live."
      },
      {
        id: "clear-execution",
        label: "Clear fills/orders/positions",
        danger: "danger",
        detail: "Resets the local book, fills, positions, and account metrics."
      },
      {
        id: "restore-defaults",
        label: "Restore defaults",
        danger: "danger",
        detail: "Returns the entire local desk to default terminal settings."
      }
    ]
  };
}

function buildDiagnostics(state, provider, chart, decisionSnapshot, assistant, recovery) {
  const exposure = Object.values(state.account.exposureBySymbol || {}).reduce((sum, value) => sum + numeric(value, 0), 0);
  const openRisk = (state.positions || []).reduce((sum, position) => {
    const meta = getInstrumentMeta(position.symbol);
    const stopDistance = Math.abs(numeric(position.entryPrice, 0) - numeric(position.stopLoss, 0));
    return sum + stopDistance * numeric(position.quantity, 0) * numeric(meta.pointValue, 1);
  }, 0);
  const pendingRisk = (state.orders || [])
    .filter((order) => order.status === "Pending")
    .reduce((sum, order) => sum + numeric(order.riskAmount, 0), 0);
  const drawdown =
    (Math.max(0, numeric(state.account.startingBalance, 100000) - numeric(state.account.equity, 100000)) /
      Math.max(1, numeric(state.account.startingBalance, 100000))) *
    100;
  const issues = [];

  if (provider.fallbackActive) {
    issues.push({
      label: "Provider fallback active",
      severity: "warning",
      detail: provider.blockedReason || "Requested provider is unavailable and the desk is running on demo fallback.",
      action: "Inspect provider configuration or keep routing reduced until the primary lane returns."
    });
  }

  if (chart.freshness === "Stale") {
    issues.push({
      label: "Candle sync stale",
      severity: "danger",
      detail: "Selected chart feed is stale and should not drive fresh routing decisions.",
      action: "Wait for candle freshness to recover before adding risk."
    });
  } else if (chart.freshness === "Warm") {
    issues.push({
      label: "Candle sync warm",
      severity: "warning",
      detail: "Chart freshness is warming and operator trust should be reduced.",
      action: "Cross-check the quote lane before routing."
    });
  }

  if (numeric(state.account.freeMargin, 0) < 0) {
    issues.push({
      label: "Free margin negative",
      severity: "danger",
      detail: "Free margin is negative and the desk should not add new paper exposure.",
      action: "Reduce open risk or clear execution state."
    });
  }

  if (numeric(state.account.sessionPnl, 0) <= -numeric(state.risk.maxSessionLoss, 0)) {
    issues.push({
      label: "Session loss threshold breached",
      severity: "danger",
      detail: "The local session loss threshold has been reached.",
      action: "Block fresh routing and reduce exposure or recover the session."
    });
  }

  if (exposure > numeric(state.risk.maxSessionExposure, 0) * 0.9) {
    issues.push({
      label: "Exposure ceiling near",
      severity: "warning",
      detail: "Total session exposure is near the configured ceiling.",
      action: "Avoid adding size or flatten selected lanes."
    });
  }

  if ((state.orders || []).some((order) => order.status === "Rejected")) {
    issues.push({
      label: "Rejected orders present",
      severity: "warning",
      detail: "The guardrail engine has rejected at least one order in this session.",
      action: "Review policy settings before routing again."
    });
  }

  if (recovery && state.controls.lastClearedExecutionAt) {
    issues.push({
      label: "Recovery checkpoint available",
      severity: "info",
      detail: `A recovery checkpoint exists from ${formatRelativeAge(recovery.capturedAt)}.`,
      action: "Use session recovery if the desk needs to be restored."
    });
  }

  assistant.recommendations
    .filter((item) => item.severity === "danger" || item.severity === "warning")
    .forEach((item) => {
      issues.push({
        label: item.title,
        severity: item.severity,
        detail: item.detail,
        action: item.action
      });
    });

  const sessionIntegrity =
    issues.some((issue) => issue.severity === "danger")
      ? "Recoverable"
      : issues.some((issue) => issue.severity === "warning")
        ? "Guarded"
        : "Nominal";
  const alertState =
    issues.some((issue) => issue.severity === "danger")
      ? "Action Required"
      : issues.some((issue) => issue.severity === "warning")
        ? "Attention"
        : "Nominal";
  const sessionRiskState =
    alertState === "Action Required"
      ? "Blocked"
      : alertState === "Attention" || exposure > numeric(state.risk.maxSessionExposure, 0) * 0.82
        ? "Elevated"
        : "Armed";
  const healthScore = clamp(
    95 -
      (provider.fallbackActive ? 15 : 0) -
      (chart.freshness === "Stale" ? 18 : chart.freshness === "Warm" ? 8 : 0) -
      (state.system.executionHealth === "Attention" ? 12 : state.system.executionHealth === "Active" ? 5 : 0) -
      issues.filter((issue) => issue.severity === "warning").length * 2 -
      issues.filter((issue) => issue.severity === "danger").length * 6,
    32,
    99
  );
  const uiHealthy = Boolean(
    state.selectedSymbol &&
      state.selectedTimeframe &&
      (state.watchlistSymbols || []).length &&
      chart.symbol &&
      chart.key &&
      chart.readinessState !== "Unavailable"
  );
  const dataPipelineHealthy = !provider.fallbackActive && provider.feedHealth === "Healthy" && chart.freshness === "Fresh";
  const executionHealthy =
    state.accountMode === "Paper" &&
    state.system.executionHealth === "Ready" &&
    numeric(state.account.freeMargin, 0) >= 0 &&
    !(state.orders || []).some((order) => order.status === "Rejected");
  const persistenceHealthy = state.persistence.status === "Persisted" && Boolean(state.persistence.path);
  const guardrailLabel =
    sessionRiskState === "Blocked" ? "Block" : sessionRiskState === "Elevated" ? "Warning" : "Healthy";
  const overallReadinessLabel = !uiHealthy || !dataPipelineHealthy || !executionHealthy || !persistenceHealthy
    ? "Warning"
    : guardrailLabel === "Block"
      ? "Blocked"
      : guardrailLabel === "Warning"
        ? "Warning"
        : "Ready";
  const platformReadiness = {
    uiState: {
      label: uiHealthy ? "Healthy" : "Unhealthy",
      tone: uiHealthy ? "positive" : "danger",
      detail: uiHealthy
        ? `${state.selectedSymbol} ${state.selectedTimeframe} workspace is fully mounted.`
        : "Selected symbol, timeframe, or chart state is incomplete."
    },
    dataPipeline: {
      label: dataPipelineHealthy ? "Healthy" : "Unhealthy",
      tone: dataPipelineHealthy ? "positive" : provider.fallbackActive || chart.freshness === "Stale" ? "danger" : "warning",
      detail: `${provider.feedHealth} quote lane | ${chart.freshness} candle lane | ${provider.label}`
    },
    executionEngine: {
      label: executionHealthy ? "Healthy" : "Unhealthy",
      tone: executionHealthy ? "positive" : "danger",
      detail: `${state.accountMode} mode | ${state.system.executionHealth} execution lane`
    },
    persistence: {
      label: persistenceHealthy ? "Healthy" : "Unhealthy",
      tone: persistenceHealthy ? "positive" : "danger",
      detail: `${state.persistence.status} | ${state.persistence.path || "No desk path"}`
    },
    guardrails: {
      label: guardrailLabel,
      tone: guardrailLabel === "Healthy" ? "positive" : guardrailLabel === "Warning" ? "warning" : "danger",
      detail: `${sessionRiskState} guardrail posture | ${alertState}`
    },
    overall: {
      label: overallReadinessLabel,
      tone: overallReadinessLabel === "Ready" ? "positive" : overallReadinessLabel === "Blocked" ? "danger" : "warning",
      detail:
        overallReadinessLabel === "Ready"
          ? "Local paper-trading runtime is ready for operator use."
          : overallReadinessLabel === "Blocked"
            ? "Local runtime is blocked until guardrails or runtime health recover."
            : "Local runtime is available but needs operator attention."
    }
  };
  platformReadiness.signature = stableJoin([
    platformReadiness.uiState.label,
    platformReadiness.dataPipeline.label,
    platformReadiness.executionEngine.label,
    platformReadiness.persistence.label,
    platformReadiness.guardrails.label,
    platformReadiness.overall.label,
    platformReadiness.dataPipeline.detail,
    platformReadiness.executionEngine.detail,
    platformReadiness.persistence.detail
  ]);

  return {
    exposure: formatCurrency(exposure, 0),
    rawExposure: round(exposure, 2),
    drawdown: `${drawdown.toFixed(2)}%`,
    sessionRisk: `${round((openRisk + pendingRisk) / 1000, 2)}R`,
    feedFreshness: provider.freshness,
    providerHealth: provider.state,
    quoteSyncState: `${provider.feedHealth} | ${formatRelativeAge(provider.lastUpdate)}`,
    candleSyncState: `${chart.freshness} | ${chart.sourceLabel}`,
    chartFeed: `${chart.freshness} | ${chart.sourceLabel}`,
    executionEngine: state.system.executionHealth,
    persistenceStatus: state.persistence.status,
    sessionIntegrity,
    alertState,
    runtimeHealth: `${healthScore.toFixed(0)}%`,
    pnl: formatCurrency(state.account.sessionPnl),
    guardrail: sessionRiskState,
    sessionRiskState,
    issues,
    alerts: issues.length ? issues.map((issue) => `${issue.label}: ${issue.detail}`) : ["System state is inside the local paper-trading guardrails."],
    recommendedActions: dedupe(issues.map((issue) => issue.action)).slice(0, 5),
    explainability: `${decisionSnapshot.confidence}% confidence | ${decisionSnapshot.opportunityScore} opp / ${decisionSnapshot.riskScore} risk`,
    platformReadiness,
    signature: stableJoin([
      provider.state,
      provider.feedHealth,
      provider.freshness,
      chart.freshness,
      state.system.executionHealth,
      state.persistence.status,
      sessionIntegrity,
      alertState,
      sessionRiskState,
      `${healthScore.toFixed(0)}%`,
      platformReadiness.signature,
      issues.map((issue) => stableJoin([issue.label, issue.severity, issue.detail, issue.action]))
    ])
  };
}

function buildNotifications(provider, diagnostics, decisionSnapshot, chart, assistant, state) {
  return [
    {
      id: "provider-health",
      title: `${provider.requestedLabel} ${provider.fallbackActive ? "fallback" : "streaming"} | ${provider.feedHealth}`,
      tone: provider.fallbackActive ? "warning" : "positive",
      time: formatTimestamp(provider.lastUpdate)
    },
    {
      id: "chart-lane",
      title: `${chart.symbol} ${chart.label} lane is ${chart.freshness.toLowerCase()} with ${decisionSnapshot.confidence}% confidence.`,
      tone: chart.freshness === "Fresh" ? "positive" : "warning",
      time: formatTimestamp(chart.updatedAt)
    },
    {
      id: "assistant-priority",
      title: `${assistant.recommendations[0].title} | ${assistant.recommendations[0].severity}`,
      tone: assistant.recommendations[0].severity === "danger" ? "danger" : assistant.recommendations[0].severity === "warning" ? "warning" : "positive",
      time: formatTimestamp(state.recommendationHistory?.[0]?.time || chart.updatedAt || provider.lastUpdate)
    },
    {
      id: "runtime-health",
      title: `Runtime ${diagnostics.runtimeHealth} | ${diagnostics.alertState}`,
      tone: diagnostics.alertState === "Nominal" ? "positive" : diagnostics.alertState === "Attention" ? "warning" : "danger",
      time: formatTimestamp(state.system.lastOverviewSyncAt || chart.updatedAt || provider.lastUpdate)
    }
  ];
}

async function buildDeskSnapshot({ selectedSymbol, selectedTimeframe, persistMode = "changed" } = {}) {
  let state = readDeskState();
  const persistedState = structuredClone(state);
  state.providerKey = state.providerKey || getConfiguredMarketProviderKey();
  if (selectedSymbol) state.selectedSymbol = selectedSymbol;
  if (selectedTimeframe) state.selectedTimeframe = selectedTimeframe;

  const symbols = dedupe([
    ...(state.watchlistSymbols || []),
    state.selectedSymbol,
    ...(state.positions || []).map((position) => position.symbol),
    ...(state.orders || []).map((order) => order.symbol)
  ]);
  const quoteCollection = await collectQuotes(state, symbols);
  state.system.lastQuoteSyncAt = quoteCollection.provider.lastUpdate;
  state = synchronizePaperState(state, quoteCollection.quoteMap);

  const sparkBundles = await Promise.all(
    (state.watchlistSymbols || []).map((symbol) => collectCandles(symbol, "5m", quoteCollection.runtime, 18))
  );
  const sparkMap = Object.fromEntries(sparkBundles.map((bundle) => [bundle.symbol, bundle]));
  const watchlist = (state.watchlistSymbols || []).map((symbol) =>
    buildWatchlistEntry(symbol, quoteCollection.quoteMap[symbol], sparkMap[symbol])
  );
  const selectedMarket = watchlist.find((item) => item.symbol === state.selectedSymbol) || watchlist[0];
  const chartBundle = await collectCandles(
    selectedMarket.symbol,
    state.selectedTimeframe,
    quoteCollection.runtime,
    getTimeframeConfig(state.selectedTimeframe).bars
  );
  state.system.lastCandleSyncAt = chartBundle.updatedAt || state.system.lastCandleSyncAt;

  const chart = {
    key: chartBundle.timeframe,
    label: getTimeframeConfig(chartBundle.timeframe).label,
    symbol: selectedMarket.symbol,
    candles: chartBundle.candles,
    rawLast: chartBundle.rawLast,
    last: chartBundle.last,
    rawChange: chartBundle.rawChange,
    change: chartBundle.change,
    freshness: chartBundle.freshness,
    updatedAt: chartBundle.updatedAt,
    sourceLabel: chartBundle.sourceLabel,
    readinessState: chartBundle.readinessState,
    atr: chartBundle.atr,
    volume: chartBundle.volume,
    imbalance: chartBundle.imbalance,
    syncState: chartBundle.freshness === "Fresh" ? "Synchronized" : chartBundle.freshness === "Warm" ? "Watching" : "Attention",
    statsStrip: [
      { label: "Session High", value: chartBundle.sessionHigh },
      { label: "Session Low", value: chartBundle.sessionLow },
      { label: "VWAP", value: chartBundle.vwap },
      { label: "ATR", value: chartBundle.atr },
      { label: "Volume", value: chartBundle.volume },
      { label: "Last Update", value: formatTimestamp(chartBundle.updatedAt) }
    ]
  };
  const decisionSnapshot = buildDecisionSnapshot({
    selectedMarket,
    chart,
    state,
    provider: quoteCollection.provider
  });
  recordDecisionSnapshot(state, decisionSnapshot);

  const recovery = readDeskRecovery();
  const operatorAssistant = buildOperatorAssistant({
    state,
    provider: quoteCollection.provider,
    chart,
    decisionSnapshot,
    recoveryAvailable: Boolean(recovery)
  });
  recordOperatorRecommendations(state, operatorAssistant, selectedMarket.symbol, chart.key);

  const connectorReadiness = buildConnectorReadiness({
    state,
    provider: quoteCollection.provider,
    providerCatalog: getMarketProviderCatalog()
  });
  const controlCenter = buildControlCenter(state, quoteCollection.provider, recovery);
  const diagnostics = buildDiagnostics(
    state,
    quoteCollection.provider,
    chart,
    decisionSnapshot,
    operatorAssistant,
    recovery
  );
  state.system.sessionIntegrity = diagnostics.sessionIntegrity;
  state.system.lastMarketSyncAt = new Date().toISOString();
  state.system.lastOverviewSyncAt = new Date().toISOString();
  const notifications = buildNotifications(
    quoteCollection.provider,
    diagnostics,
    decisionSnapshot,
    chart,
    operatorAssistant,
    state
  );
  state.persistence = {
    ...state.persistence,
    status: persistedState.persistence?.status || "Persisted",
    path: getDeskStatePath(),
    lastSavedAt: persistedState.persistence?.lastSavedAt || state.persistence.lastSavedAt
  };

  if (persistMode === "always" || (persistMode === "changed" && shouldPersistDeskState(persistedState, state))) {
    state = writeDeskState(state);
  }

  const provider = {
    ...quoteCollection.provider,
    connectionState: quoteCollection.provider.fallbackActive ? "Fallback" : "Connected",
    sequence: buildSequence(quoteCollection.provider.key, quoteCollection.provider.lastUpdate)
  };
  provider.signature = buildProviderSignature(provider);

  const overview = {
    desk: {
      selectedSymbol: state.selectedSymbol,
      selectedTimeframe: state.selectedTimeframe,
      accountMode: state.accountMode,
      providerKey: state.providerKey,
      favorites: state.favorites,
      watchlistSymbols: state.watchlistSymbols,
      risk: state.risk,
      controls: state.controls
    },
    provider,
    session: {
      state:
        selectedMarket.category === "Digital Asset"
          ? "24/7 crypto session"
          : chart.key === "1D"
            ? "Multi-session swing lane"
            : "Local paper desk active",
      bias: decisionSnapshot.bias,
      notifications
    },
    watchlist,
    marketHeat: buildMarketHeat(watchlist),
    selectedMarket: {
      ...selectedMarket,
      intelligence: decisionSnapshot
    },
    chart,
    account: {
      ...state.account,
      balanceText: formatCurrency(state.account.balance),
      equityText: formatCurrency(state.account.equity),
      freeMarginText: formatCurrency(state.account.freeMargin),
      usedMarginText: formatCurrency(state.account.usedMargin),
      sessionPnlText: formatCurrency(state.account.sessionPnl)
    },
    positions: buildPositionsSnapshot(state.positions),
    pendingOrders: buildPendingOrdersSnapshot(state.orders),
    fills: buildFillsSnapshot(state.fills),
    activityLog: state.activityLog.map((entry) => ({
      ...entry,
      time: formatTimestamp(entry.time)
    })),
    auditTrail: state.auditTrail.map((entry) => ({
      ...entry,
      time: formatTimestamp(entry.time)
    })),
    decisionJournal: state.decisionJournal.map((entry) => ({
      ...entry,
      timeText: formatTimestamp(entry.time)
    })),
    recommendationHistory: state.recommendationHistory.map((entry) => ({
      ...entry,
      timeText: formatTimestamp(entry.time)
    })),
    diagnostics,
    operatorAssistant: {
      ...operatorAssistant,
      history: state.recommendationHistory.slice(0, 5).map((entry) => ({
        ...entry,
        timeText: formatTimestamp(entry.time)
      }))
    },
    connectorReadiness,
    controlCenter,
    orderTemplate: buildOrderDraft(selectedMarket, chart, state, decisionSnapshot),
    generatedAt: new Date().toISOString()
  };

  overview.chart.signature = buildChartSignature(overview.chart);
  overview.overviewSignature = stableJoin([
    buildPersistenceFingerprint(state),
    overview.provider.signature,
    overview.chart.signature,
    diagnostics.signature,
    connectorReadiness.map((item) =>
      stableJoin([item.id, item.validationState, item.configured ? 1 : 0, item.blockedReason || "", item.unsupportedReason || ""])
    ),
    stableJoin([
      selectedMarket.symbol,
      selectedMarket.bias,
      selectedMarket.confidence,
      decisionSnapshot.bias,
      decisionSnapshot.confidence,
      decisionSnapshot.opportunityScore,
      decisionSnapshot.riskScore
    ])
  ]);

  return overview;
}

function mergeDeskRisk(currentRisk, patchRisk = {}) {
  return {
    ...currentRisk,
    ...patchRisk,
    requireStopLoss:
      patchRisk.stopLossPolicy === "warn-only"
        ? false
        : patchRisk.stopLossPolicy === "required"
          ? true
          : currentRisk.requireStopLoss
  };
}

export async function getTradingTerminalOverview(options) {
  return buildDeskSnapshot(options);
}

export async function getTradingTerminalBootstrap() {
  const overview = await buildDeskSnapshot({ persistMode: "changed" });

  return {
    brand: {
      name: "Trading Pro Max",
      mark: "TPM",
      desk: "Institutional Terminal"
    },
    sections: TERMINAL_SECTIONS,
    chart: CHART_CONFIG,
    execution: EXECUTION_CONFIG,
    initialOverview: overview
  };
}

export async function getTradingTerminalQuotes(symbols = []) {
  const state = readDeskState();
  const requestedSymbols = dedupe(symbols.length ? symbols : state.watchlistSymbols || []);
  const quoteCollection = await collectQuotes(state, requestedSymbols);
  const provider = {
    ...quoteCollection.provider,
    connectionState: quoteCollection.provider.fallbackActive ? "Fallback" : "Connected",
    sequence: buildSequence(quoteCollection.provider.key, quoteCollection.provider.lastUpdate)
  };
  provider.signature = buildProviderSignature(provider);

  return {
    provider,
    quotes: requestedSymbols.map((symbol) =>
      buildWatchlistEntry(symbol, quoteCollection.quoteMap[symbol], { symbol, spark: [] })
    ),
    generatedAt: new Date().toISOString()
  };
}

export async function getTradingTerminalCandles({ symbol, timeframe }) {
  const state = readDeskState();
  const quoteCollection = await collectQuotes(state, [symbol]);
  const bundle = await collectCandles(symbol, timeframe, quoteCollection.runtime, getTimeframeConfig(timeframe).bars);
  const provider = {
    ...quoteCollection.provider,
    connectionState: quoteCollection.provider.fallbackActive ? "Fallback" : "Connected",
    sequence: buildSequence(quoteCollection.provider.key, quoteCollection.provider.lastUpdate)
  };
  provider.signature = buildProviderSignature(provider);
  const chart = {
    key: bundle.timeframe,
    label: getTimeframeConfig(bundle.timeframe).label,
    symbol,
    candles: bundle.candles,
    rawLast: bundle.rawLast,
    last: bundle.last,
    rawChange: bundle.rawChange,
    change: bundle.change,
    freshness: bundle.freshness,
    updatedAt: bundle.updatedAt,
    sourceLabel: bundle.sourceLabel,
    readinessState: bundle.readinessState,
    atr: bundle.atr,
    volume: bundle.volume,
    imbalance: bundle.imbalance,
    syncState: bundle.freshness === "Fresh" ? "Synchronized" : bundle.freshness === "Warm" ? "Watching" : "Attention",
    statsStrip: [
      { label: "Session High", value: bundle.sessionHigh },
      { label: "Session Low", value: bundle.sessionLow },
      { label: "VWAP", value: bundle.vwap },
      { label: "ATR", value: bundle.atr },
      { label: "Volume", value: bundle.volume },
      { label: "Last Update", value: formatTimestamp(bundle.updatedAt) }
    ]
  };
  chart.signature = buildChartSignature(chart);

  return {
    provider,
    chart,
    generatedAt: new Date().toISOString()
  };
}

export async function getTradingTerminalProviderStatus() {
  const state = readDeskState();
  const quoteCollection = await collectQuotes(state, state.watchlistSymbols || []);
  const provider = {
    ...quoteCollection.provider,
    connectionState: quoteCollection.provider.fallbackActive ? "Fallback" : "Connected",
    sequence: buildSequence(quoteCollection.provider.key, quoteCollection.provider.lastUpdate),
    generatedAt: new Date().toISOString()
  };
  provider.signature = buildProviderSignature(provider);
  return provider;
}

export async function updateTradingTerminalDesk(payload = {}) {
  let state = readDeskState();
  state = normalizeDeskState({
    ...state,
    selectedSymbol: payload.selectedSymbol || state.selectedSymbol,
    selectedTimeframe: payload.selectedTimeframe || state.selectedTimeframe,
    accountMode:
      payload.accountMode === "Preview"
        ? "Preview"
        : payload.accountMode === "Paper"
          ? "Paper"
          : state.accountMode,
    providerKey: payload.providerKey || state.providerKey,
    favorites:
      payload.favorites && typeof payload.favorites === "object" && !Array.isArray(payload.favorites)
        ? { ...state.favorites, ...payload.favorites }
        : state.favorites,
    risk:
      payload.risk && typeof payload.risk === "object" && !Array.isArray(payload.risk)
        ? mergeDeskRisk(state.risk, payload.risk)
        : state.risk,
    controls: {
      ...state.controls,
      refreshPolicyKey: payload.refreshPolicyKey || state.controls.refreshPolicyKey
    }
  });

  writeDeskState(state);
  return buildDeskSnapshot({
    persistMode: "changed",
    selectedSymbol: state.selectedSymbol,
    selectedTimeframe: state.selectedTimeframe
  });
}

export async function submitTradingTerminalOrder(payload = {}) {
  let state = readDeskState();
  const quoteCollection = await collectQuotes(
    state,
    dedupe([
      payload.symbol,
      ...(state.watchlistSymbols || []),
      ...(state.positions || []).map((position) => position.symbol),
      ...(state.orders || []).map((order) => order.symbol)
    ])
  );
  state = synchronizePaperState(state, quoteCollection.quoteMap);
  const submission = submitPaperOrder(
    state,
    {
      symbol: payload.symbol,
      side: payload.side,
      quantity: payload.quantity,
      type: payload.type,
      entryPrice: payload.entryPrice ?? payload.entry,
      stopLoss: payload.stopLoss,
      takeProfit: payload.takeProfit,
      leverage: payload.leverage
    },
    quoteCollection.quoteMap
  );

  writeDeskState(submission.state);

  return {
    ...submission.result,
    validation: submission.validation,
    overview: await buildDeskSnapshot({ persistMode: "changed" })
  };
}

export async function cancelTradingTerminalOrder(orderId) {
  let state = readDeskState();
  const quoteCollection = await collectQuotes(
    state,
    dedupe([
      ...(state.watchlistSymbols || []),
      ...(state.positions || []).map((position) => position.symbol),
      ...(state.orders || []).map((order) => order.symbol)
    ])
  );
  state = synchronizePaperState(state, quoteCollection.quoteMap);
  const result = cancelPaperOrder(state, orderId, quoteCollection.quoteMap);
  writeDeskState(result.state);
  return {
    ok: result.ok,
    overview: await buildDeskSnapshot({ persistMode: "changed" })
  };
}

export async function closeTradingTerminalPosition(positionId) {
  let state = readDeskState();
  const quoteCollection = await collectQuotes(
    state,
    dedupe([
      ...(state.watchlistSymbols || []),
      ...(state.positions || []).map((position) => position.symbol),
      ...(state.orders || []).map((order) => order.symbol)
    ])
  );
  state = synchronizePaperState(state, quoteCollection.quoteMap);
  const result = closePaperPosition(state, positionId, quoteCollection.quoteMap, "Manual Close");
  writeDeskState(result.state);
  return {
    ok: result.ok,
    overview: await buildDeskSnapshot({ persistMode: "changed" })
  };
}

export async function runTradingTerminalControlAction(payload = {}) {
  let state = readDeskState();
  const action = String(payload.action || "").trim();
  const now = new Date().toISOString();

  if (action === "update-settings") {
    return updateTradingTerminalDesk(payload);
  }

  if (action === "safe-reset") {
    writeDeskRecovery(state, "Safe reset");
    state.orders = (state.orders || []).map((order) => (order.status === "Pending" ? { ...order, status: "Cancelled" } : order));
    state.accountMode = "Paper";
    state.controls.refreshPolicyKey = "Balanced";
    state.controls.lastAction = "Safe reset";
    state.controls.lastResetAt = now;
    appendActivity(state, "Safe reset", "Operator Control Center", "Reset", "Pending orders cancelled and paper mode restored.");
    appendAudit(state, "WARN", "Operator safe reset executed.");
    writeDeskState(state);
    return {
      ok: true,
      notice: "Safe reset completed. Pending orders were cancelled and paper-safe defaults were restored.",
      overview: await buildDeskSnapshot({ persistMode: "changed" })
    };
  }

  if (action === "recover-session") {
    const recovery = readDeskRecovery();
    if (!recovery?.state) {
      return {
        ok: false,
        notice: "No recovery checkpoint is available.",
        overview: await buildDeskSnapshot({ persistMode: "changed" })
      };
    }

    state = normalizeDeskState(recovery.state);
    state.controls.lastAction = "Session recovery";
    state.controls.lastRecoveredAt = now;
    appendActivity(state, "Session recovery", "Operator Control Center", "Recovered", recovery.reason || "Recovery checkpoint restored.");
    appendAudit(state, "WARN", "Operator session recovery restored the last checkpoint.");
    writeDeskState(state);
    return {
      ok: true,
      notice: "Recovery checkpoint restored into the local desk.",
      overview: await buildDeskSnapshot({ persistMode: "changed" })
    };
  }

  if (action === "clear-audit") {
    writeDeskRecovery(state, "Clear audit history");
    state.activityLog = [];
    state.auditTrail = [];
    state.recommendationHistory = [];
    state.controls.lastAction = "Clear audit history";
    state.controls.lastClearedAuditAt = now;
    appendActivity(state, "Audit cleared", "Operator Control Center", "Cleared", "Activity, audit, and recommendation history were cleared.");
    appendAudit(state, "WARN", "Operator cleared audit and recommendation history.");
    writeDeskState(state);
    return {
      ok: true,
      notice: "Audit, activity, and recommendation history were cleared.",
      overview: await buildDeskSnapshot({ persistMode: "changed" })
    };
  }

  if (action === "clear-execution") {
    writeDeskRecovery(state, "Clear execution state");
    resetExecutionState(state);
    state.controls.lastAction = "Clear execution state";
    state.controls.lastClearedExecutionAt = now;
    appendActivity(state, "Execution cleared", "Operator Control Center", "Cleared", "Local fills, orders, positions, and account metrics reset.");
    appendAudit(state, "WARN", "Operator cleared execution state.");
    writeDeskState(state);
    return {
      ok: true,
      notice: "Local fills, positions, orders, and account metrics were reset.",
      overview: await buildDeskSnapshot({ persistMode: "changed" })
    };
  }

  if (action === "restore-defaults") {
    writeDeskRecovery(state, "Restore defaults");
    state = createDefaultDeskState();
    state.controls.lastAction = "Restore defaults";
    state.controls.lastRestoredDefaultsAt = now;
    appendActivity(state, "Defaults restored", "Operator Control Center", "Restored", "Terminal returned to default local desk state.");
    appendAudit(state, "WARN", "Operator restored default terminal state.");
    writeDeskState(state);
    return {
      ok: true,
      notice: "Local desk defaults were restored.",
      overview: await buildDeskSnapshot({ persistMode: "changed" })
    };
  }

  return {
    ok: false,
    notice: "Unknown control action.",
    overview: await buildDeskSnapshot({ persistMode: "changed" })
  };
}
