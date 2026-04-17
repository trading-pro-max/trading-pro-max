"use client";

import {
  getDefaultLiveTimeframe,
  getLiveTimeframeCatalog,
  mergeRuntimeSymbols,
  resolveLiveTimeframe,
  resolveProviderMapping,
  searchSupportedInstruments
} from "./product-live-market";

const liveDataProviderCatalog = [
  {
    key: "demo",
    label: "Demo Feed",
    kind: "demo",
    state: "Streaming",
    tone: "success",
    refreshMs: 4500,
    description: "Local simulated market feed with connected quotes, route posture, and chart motion.",
    defaultSafe: true,
    zeroCost: true,
    operatorMode: "Default-safe local mode"
  },
  {
    key: "twelve-data",
    label: "Twelve Data",
    kind: "live",
    state: "Awaiting API Key",
    tone: "warning",
    refreshMs: 20000,
    description: "Read-only live market data via Twelve Data polling with automatic local demo fallback.",
    defaultSafe: false,
    zeroCost: true,
    operatorMode: "Optional read-only live enhancer"
  }
];

const LIVE_ADAPTER_TIMEOUT_MS = 6500;

function isLiveWeekend(assetClass) {
  if (assetClass === "Crypto") return false;
  const day = new Date().getUTCDay();
  return day === 0 || day === 6;
}

function freshnessThresholds(assetClass) {
  if (assetClass === "Crypto") return { fresh: 120, warm: 12 * 60, delayed: 90 * 60 };
  if (assetClass === "Equity" || assetClass === "Equity ETF" || assetClass === "Index Proxy") {
    return { fresh: 20 * 60, warm: 3 * 60 * 60, delayed: 24 * 60 * 60 };
  }
  return { fresh: 5 * 60, warm: 45 * 60, delayed: 8 * 60 * 60 };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function parseNumeric(value) {
  const parsed = Number.parseFloat(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferPrecision(value, symbol = "") {
  const raw = String(value ?? "");
  if (raw.includes(".")) return raw.split(".")[1].length;
  if (symbol.includes("/") || symbol.includes("XAU")) return 4;
  return 0;
}

function formatPrice(value, precision) {
  if (!Number.isFinite(value)) return "--";
  if (precision > 0) return value.toFixed(precision);
  return String(Math.round(value));
}

function formatPercent(value) {
  const sign = value < 0 ? "-" : "+";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatSpread(value, precision) {
  if (!Number.isFinite(value)) return "--";
  if (precision > 2) return value.toFixed(4);
  return value.toFixed(2);
}

function symbolSeed(symbol = "") {
  return Array.from(symbol).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function parseConfidence(value) {
  return clamp(Math.round(parseNumeric(value) || 70), 50, 97);
}

function isProtectedState(state) {
  return state === "Protected" || state === "Blocked";
}

function classifyFreshness(ageSeconds) {
  if (ageSeconds <= 5) return "Fresh";
  if (ageSeconds <= 20) return "Warm";
  return "Stale";
}

function normalizeLiveFreshness(freshness, assetClass = "Forex", ageSeconds = 0) {
  if (freshness && freshness !== "Pending") return freshness;

  const thresholds = freshnessThresholds(assetClass);
  if (isLiveWeekend(assetClass) && ageSeconds > thresholds.warm) return "Session Closed";
  if (ageSeconds <= thresholds.fresh) return "Fresh";
  if (ageSeconds <= thresholds.warm) return "Warm";
  if (ageSeconds <= thresholds.delayed) return "Delayed";
  return "Stale";
}

export function getLiveFreshnessTone(freshness) {
  if (freshness === "Fresh") return "success";
  if (freshness === "Warm" || freshness === "Delayed" || freshness === "Mixed" || freshness === "Stable") return "warning";
  if (freshness === "Session Closed" || freshness === "Pending") return "info";
  if (freshness === "Stale") return "danger";
  return "neutral";
}

export function getLiveHealthTone(health) {
  if (health === "Healthy" || health === "Ready") return "success";
  if (health === "Stable" || health === "Watch" || health === "Delayed") return "warning";
  if (health === "Session Closed" || health === "Monitoring") return "info";
  if (health === "Degraded" || health === "Awaiting Connector" || health === "Fallback") return "danger";
  return "neutral";
}

export function getLiveChartTone(readiness, freshness) {
  if (readiness === "Ready") return getLiveFreshnessTone(freshness);
  if (readiness === "Available") return "info";
  if (readiness === "Pending") return "warning";
  return "danger";
}

function classifySignalState(routeState, signalStrength) {
  if (isProtectedState(routeState)) return "Protected";
  if (routeState === "Ready" || signalStrength >= 84) return "Confirmed";
  if (routeState === "Watch" || signalStrength >= 70) return "Building";
  return "Weak";
}

function classifyFeedHealth(providerRuntime, freshness, signalStrength, routeState, chartReadiness = "Pending", chartFreshness = "Pending") {
  if (providerRuntime.kind === "live") {
    if (providerRuntime.fallbackActive && providerRuntime.validationState !== "Valid") return "Awaiting Connector";
    if (providerRuntime.fallbackActive) return "Fallback";
    if (chartReadiness === "Ready") {
      if (chartFreshness === "Fresh") return "Healthy";
      if (chartFreshness === "Warm") return "Stable";
      if (chartFreshness === "Delayed") return "Delayed";
      if (chartFreshness === "Session Closed") return "Session Closed";
    }
    if (freshness === "Session Closed") return "Session Closed";
    if (freshness === "Delayed") return "Delayed";
    if (freshness === "Stale") return "Degraded";
    if (freshness === "Warm" || freshness === "Mixed") return "Stable";
    return "Healthy";
  }

  if (freshness === "Stale") return "Degraded";
  if (isProtectedState(routeState) || signalStrength < 66) return "Watch";
  if (freshness === "Fresh" && signalStrength >= 82) return "Healthy";
  return "Stable";
}

function deriveRuntimeHealth(signalStrength, freshness, providerRuntime, feedHealth) {
  const freshnessOffset =
    freshness === "Fresh"
      ? 8
      : freshness === "Warm"
        ? 0
        : freshness === "Delayed"
          ? -3
          : freshness === "Session Closed"
            ? 0
            : -12;
  const providerOffset = providerRuntime.kind === "live" && !providerRuntime.fallbackActive ? 8 : providerRuntime.kind === "live" ? -6 : 4;
  const feedOffset =
    feedHealth === "Healthy"
      ? 7
      : feedHealth === "Stable"
        ? 2
        : feedHealth === "Delayed"
          ? -2
          : feedHealth === "Session Closed"
            ? 0
            : feedHealth === "Fallback"
              ? -4
              : feedHealth === "Watch"
                ? -6
                : -14;

  return `${clamp(signalStrength + freshnessOffset + providerOffset + feedOffset, 50, 99)}%`;
}

function buildBaseWatchlistMap(baseWatchlist = []) {
  const entries = baseWatchlist.map((item) => {
    const mapping = resolveProviderMapping(item.symbol);
    return [mapping.symbol, { ...item, symbol: mapping.symbol, providerSymbol: mapping.providerSymbol }];
  });

  return Object.fromEntries(entries);
}

function deriveStatus(signalStrength, explicitStatus) {
  if (explicitStatus) return explicitStatus;
  if (signalStrength >= 83) return "Ready";
  if (signalStrength >= 70) return "Watch";
  return "Protected";
}

function buildWatchlist(baseWatchlist = [], tick = 0, trackedSymbols = [], watchlistSymbols = []) {
  const baseMap = buildBaseWatchlistMap(baseWatchlist);
  const runtimeSymbols = watchlistSymbols.length
    ? mergeRuntimeSymbols(watchlistSymbols, trackedSymbols)
    : mergeRuntimeSymbols(baseWatchlist.map((item) => item.symbol), trackedSymbols);

  return runtimeSymbols.map((symbol, index) => {
    const mapping = resolveProviderMapping(symbol);
    const baseItem = baseMap[symbol] || {};
    const seed = symbolSeed(symbol) + index * 17;
    const precision = inferPrecision(baseItem.last || mapping.demoLast, symbol);
    const baseLast = parseNumeric(baseItem.last || mapping.demoLast);
    const drift = Math.sin((tick + seed) * 0.37) * 0.009;
    const momentum = Math.cos((tick + seed) * 0.21) * 0.005;
    const movementPct = clamp((drift + momentum) * 100, -2.45, 2.45);
    const nextLast = baseLast > 0 ? baseLast * (1 + movementPct / 100) : baseLast;
    const spreadBasis = symbol.includes("/") || symbol.includes("XAU") ? 0.00018 : 0.00045;
    const spreadValue = Math.max(baseLast * spreadBasis, precision > 0 ? 10 ** -precision : 0.02);
    const bid = nextLast - spreadValue / 2;
    const ask = nextLast + spreadValue / 2;
    const signalStrength = clamp(parseConfidence(baseItem.confidence || mapping.defaultConfidence) + Math.round(Math.sin((tick + seed) * 0.29) * 4), 52, 97);
    const impulse =
      movementPct >= 0.45 ? "Expansion" : movementPct <= -0.45 ? "Compression" : "Balanced";

    return {
      symbol,
      label: mapping.label,
      providerSymbol: mapping.providerSymbol,
      mappingState: mapping.mappingState,
      assetClass: mapping.assetClass,
      strategy: baseItem.strategy || mapping.routeName,
      status: deriveStatus(signalStrength, baseItem.status),
      confidence: `${signalStrength}%`,
      signalStrength: `${signalStrength}%`,
      bias: baseItem.bias || mapping.defaultBias,
      note: baseItem.note || mapping.defaultNote,
      movementPct,
      last: formatPrice(nextLast, precision),
      bid: formatPrice(bid, precision),
      ask: formatPrice(ask, precision),
      spread: formatSpread(spreadValue, precision),
      change: formatPercent(movementPct),
      volume: `${90 + ((tick * 7 + seed) % 140)}k`,
      impulse,
      providerState: "Streaming"
    };
  });
}

function overlayLiveQuotes(baseWatchlist = [], adapterSnapshot, providerRuntime) {
  const quoteMap = Object.fromEntries((adapterSnapshot?.quotes || []).map((item) => [item.symbol, item]));

  return baseWatchlist.map((item) => {
    const liveQuote = quoteMap[item.symbol];
    if (!liveQuote) return item;

    return {
      ...item,
      providerSymbol: liveQuote.providerSymbol || item.providerSymbol,
      mappingState: liveQuote.mappingState || item.mappingState,
      assetClass: liveQuote.assetClass || item.assetClass,
      last: liveQuote.last || item.last,
      bid: liveQuote.bid || item.bid,
      ask: liveQuote.ask || item.ask,
      spread: liveQuote.spread || item.spread,
      change: liveQuote.change || item.change,
      movementPct: Number.isFinite(liveQuote.movementPct) ? liveQuote.movementPct : item.movementPct,
      volume: liveQuote.volume || item.volume,
      note:
        liveQuote.note ||
        (providerRuntime.fallbackActive
          ? `${providerRuntime.label} is unavailable. Demo mirror remains active for ${item.symbol}.`
          : `${providerRuntime.label} read-only live quote is active for ${item.symbol}.`),
      freshness: liveQuote.freshness || item.freshness,
      providerState: providerRuntime.state
    };
  });
}

function buildRouteLibrary(baseRoutes = [], watchlist = []) {
  const routeMap = new Map();

  baseRoutes.forEach((route) => {
    const mapping = resolveProviderMapping(route.asset);
    routeMap.set(mapping.symbol, {
      ...route,
      asset: mapping.symbol,
      name: route.name || mapping.routeName
    });
  });

  watchlist.forEach((item) => {
    if (routeMap.has(item.symbol)) return;
    const mapping = resolveProviderMapping(item.symbol);
    routeMap.set(item.symbol, {
      name: mapping.routeName,
      asset: item.symbol,
      confidence: item.signalStrength || item.confidence,
      state: item.status,
      source: "Runtime Search"
    });
  });

  return Array.from(routeMap.values()).map((route) => {
    const linkedQuote = watchlist.find((item) => item.symbol === route.asset);
    const signalStrength = parseConfidence(linkedQuote?.signalStrength || route.confidence);
    const state = isProtectedState(route.state)
      ? route.state
      : signalStrength >= 83
        ? "Ready"
        : signalStrength >= 70
          ? "Watch"
          : "Protected";

    return {
      ...route,
      state,
      confidence: `${signalStrength}%`,
      qualificationState: state === "Ready" ? "Qualified" : state === "Watch" ? "Monitoring" : "Protected",
      executionReadiness: state === "Ready" ? "Paper-ready" : state === "Watch" ? "Staged only" : "Protection locked",
      routeNote:
        state === "Ready"
          ? `${route.name} is promotable into the execution terminal under the current feed posture.`
          : state === "Watch"
            ? `${route.name} remains in watch mode until the signal stack confirms continuation.`
            : `${route.name} is held behind protection handling while signal quality is below threshold.`
    };
  });
}

function buildProviderRuntime(provider, adapterSnapshot, heartbeat) {
  if (provider.key === "demo") {
    return {
      ...provider,
      mode: "Local demo feed",
      connectorState: "Connected",
      providerState: provider.state,
      lastUpdate: heartbeat,
      freshness: "Fresh",
      latency: "32ms",
      feedHealth: "Healthy",
      signalState: "Monitoring",
      runtimeHealth: "94%",
      validationState: "Valid",
      configPath: ".env.local",
      blockedReason: null,
      degradedReason: null,
      adapterSupported: true,
      fallbackActive: false,
      readOnly: true
    };
  }

  const runtime = adapterSnapshot?.provider || {};

  return {
    ...provider,
    label: runtime.label || provider.label,
    state: runtime.state || provider.state,
    tone: runtime.tone || provider.tone,
    mode: runtime.mode || "Read-only live polling",
    connectorState: runtime.connectorState || "Bootstrapping",
    providerState: runtime.providerState || runtime.state || provider.state,
    lastUpdate: runtime.lastUpdate || heartbeat,
    freshness: runtime.freshness || "Warm",
    latency: runtime.latency || "Waiting",
    feedHealth: runtime.feedHealth || "Awaiting Connector",
    signalState: runtime.signalState || "Monitoring",
    runtimeHealth: runtime.runtimeHealth || "--",
    validationState: runtime.validationState || "Pending",
    configPath: runtime.configPath || ".env.local",
    blockedReason:
      runtime.blockedReason ||
      ((runtime.validationState || "Pending") === "Valid"
        ? null
        : "Twelve Data is selected but not yet configured."),
    degradedReason: runtime.degradedReason || null,
    adapterSupported: runtime.adapterSupported !== false,
    fallbackActive: Boolean(runtime.fallbackActive),
    partialCoverage: Boolean(runtime.partialCoverage),
    readOnly: true,
    providerSymbolInUse: runtime.providerSymbolInUse || null,
    mappingState: runtime.mappingState || null,
    chartReadiness: runtime.chartReadiness || "Pending",
    lastCandleUpdate: runtime.lastCandleUpdate || null,
    chartFreshness: runtime.chartFreshness || "Pending"
  };
}

function buildSymbolRuntimeHealth(watchlist = [], routeLibrary = [], providerRuntime, tick = 0, heartbeat = "--:--:--", adapterSnapshot = null) {
  const quoteMap = Object.fromEntries((adapterSnapshot?.quotes || []).map((item) => [item.symbol, item]));
  const liveChart = adapterSnapshot?.chart;

  return watchlist.map((item, index) => {
    const routeState = routeLibrary.find((route) => route.asset === item.symbol)?.state || item.status || "Watch";
    const seed = symbolSeed(item.symbol) + index * 11;
    const liveQuote = quoteMap[item.symbol];
    const ageSeconds =
      Number.isFinite(liveQuote?.ageSeconds) ? liveQuote.ageSeconds : providerRuntime.kind === "demo" ? 1 + ((tick + seed) % 6) : 8 + ((tick + seed) % 9);
    const quoteFreshness = normalizeLiveFreshness(liveQuote?.freshness, item.assetClass, ageSeconds);
    const signalStrength = parseConfidence(item.signalStrength || item.confidence);
    const signalState = classifySignalState(routeState, signalStrength);
    const chartAttached = liveChart?.symbol === item.symbol;
    const chartReadiness = chartAttached ? liveChart.readinessState : providerRuntime.kind === "demo" ? "Available" : "Available";
    const chartFreshness = chartAttached
      ? normalizeLiveFreshness(liveChart.freshness, item.assetClass, ageSeconds)
      : providerRuntime.kind === "demo"
        ? "Fresh"
        : "Pending";
    const freshness = chartAttached && chartReadiness === "Ready" ? chartFreshness : quoteFreshness;
    const feedHealth =
      liveQuote?.feedHealth ||
      classifyFeedHealth(providerRuntime, quoteFreshness, signalStrength, routeState, chartReadiness, chartFreshness);

    return {
      symbol: item.symbol,
      providerSymbol: item.providerSymbol,
      mappingState: item.mappingState,
      providerState: providerRuntime.providerState,
      freshness,
      lastUpdate:
        chartAttached && liveChart?.lastCandleUpdate
          ? new Date(liveChart.lastCandleUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : liveQuote?.lastUpdate || providerRuntime.lastUpdate || heartbeat,
      lastUpdateAge: `${ageSeconds}s`,
      feedHealth,
      signalState,
      runtimeHealth: deriveRuntimeHealth(signalStrength, freshness, providerRuntime, feedHealth),
      latency: liveQuote?.latency || providerRuntime.latency || "Waiting",
      sequence: liveQuote?.sequence || `SEQ-${tick + seed}`,
      routeState,
      chartReadiness,
      chartFreshness,
      lastCandleUpdate: chartAttached ? liveChart.lastCandleUpdate : null,
      degradedReason:
        chartAttached && liveChart?.degradedReason
          ? liveChart.degradedReason
          : liveQuote?.degradedReason || providerRuntime.degradedReason || null
    };
  });
}

function buildMarketFeeds(baseFeeds = [], watchlist = [], tick = 0, providerRuntime, symbolHealthMap = {}) {
  return (baseFeeds.length
    ? baseFeeds
    : watchlist.slice(0, 4).map((item, index) => ({
        slug: `feed-${index + 1}`,
        title: `${item.symbol} Feed`,
        strength: parseConfidence(item.confidence),
        status: "Ready"
      }))).map((feed, index) => {
    const linkedItem = watchlist.find((item) => feed.title.includes(item.symbol)) || watchlist[index];
    const runtime = linkedItem ? symbolHealthMap[linkedItem.symbol] : null;
    const strength = clamp(Math.round(parseNumeric(feed.strength) + Math.sin((tick + index) * 0.41) * 4), 54, 98);
    const streamingStatus =
      providerRuntime.kind === "demo"
        ? "Streaming"
        : providerRuntime.fallbackActive
          ? "Fallback Mirror"
          : "Streaming";

    return {
      ...feed,
      strength,
      status: streamingStatus,
      feedHealth: runtime?.feedHealth || providerRuntime.feedHealth || "Stable",
      freshness: runtime?.freshness || providerRuntime.freshness || "Warm"
    };
  });
}

function buildMarketPosture(baseMarketPosture = {}, watchlist = [], routeLibrary = []) {
  return Object.fromEntries(
    watchlist.map((item) => {
      const linkedRoute = routeLibrary.find((route) => route.asset === item.symbol);
      const defaultPosture = isProtectedState(linkedRoute?.state || item.status)
        ? "Defensive"
        : (linkedRoute?.state || item.status) === "Watch"
          ? "Observational"
          : "Executable";

      return [
        item.symbol,
        {
          signalStrength: item.signalStrength || item.confidence,
          bias: item.bias,
          posture: baseMarketPosture[item.symbol]?.posture || defaultPosture,
          note:
            baseMarketPosture[item.symbol]?.note ||
            `${item.symbol} is running with ${item.signalStrength || item.confidence} signal strength and ${defaultPosture.toLowerCase()} posture.`
        }
      ];
    })
  );
}

function buildDemoCandles(baseChart = {}, activeQuote = {}, tick = 0, timeframe) {
  const basePoints = baseChart.points?.length ? baseChart.points : Array.from({ length: 24 }, (_, index) => 48 + index);
  const baseLast = parseNumeric(activeQuote.last || activeQuote.ask || activeQuote.bid || resolveProviderMapping(activeQuote.symbol).demoLast);
  const average = basePoints.reduce((total, point) => total + point, 0) / basePoints.length;
  const precision = inferPrecision(activeQuote.last || baseLast, activeQuote.symbol);
  const candleSpacingMs =
    timeframe.key === "1m"
      ? 60 * 1000
      : timeframe.key === "5m"
        ? 5 * 60 * 1000
        : timeframe.key === "1h"
          ? 60 * 60 * 1000
          : timeframe.key === "4h"
            ? 4 * 60 * 60 * 1000
            : timeframe.key === "1D"
              ? 24 * 60 * 60 * 1000
              : 15 * 60 * 1000;
  let previousClose = baseLast * (1 - 0.0025);

  return basePoints.map((point, index) => {
    const normalized = average ? (point - average) / average : 0;
    const drift = normalized * 0.14;
    const noise = Math.sin((tick + index + symbolSeed(activeQuote.symbol)) * 0.23) * 0.0024;
    const close = Number((baseLast * (1 + drift + noise)).toFixed(Math.max(precision, 2)));
    const open = index === 0 ? Number((close * (1 - 0.0018)).toFixed(Math.max(precision, 2))) : previousClose;
    const high = Math.max(open, close) + Math.abs(close - open) * 0.55 + baseLast * 0.0008;
    const low = Math.min(open, close) - Math.abs(close - open) * 0.55 - baseLast * 0.0008;
    const time = new Date(Date.now() - candleSpacingMs * (basePoints.length - index)).toISOString();

    previousClose = close;

    return {
      id: `${activeQuote.symbol || "DEMO"}-${timeframe.key}-${index}`,
      time,
      open: Number(open.toFixed(Math.max(precision, 2))),
      high: Number(high.toFixed(Math.max(precision, 2))),
      low: Number(low.toFixed(Math.max(precision, 2))),
      close,
      volume: 1000 + index * 120
    };
  });
}

function buildChart(baseChart = {}, activeQuote = {}, tick = 0, liveChart = null, providerRuntime = null, chartTimeframe = getDefaultLiveTimeframe()) {
  const timeframe = resolveLiveTimeframe(chartTimeframe);
  const candles = liveChart?.candles?.length ? liveChart.candles : buildDemoCandles(baseChart, activeQuote, tick, timeframe);
  const points = candles.map((item) => item.close);
  const latestCandle = candles[candles.length - 1] || null;
  const precision = inferPrecision(activeQuote.last || latestCandle?.close, activeQuote.symbol);

  return {
    ...baseChart,
    symbol: activeQuote.symbol || baseChart.symbol,
    providerSymbol: activeQuote.providerSymbol || resolveProviderMapping(activeQuote.symbol).providerSymbol,
    mappingState: activeQuote.mappingState || resolveProviderMapping(activeQuote.symbol).mappingState,
    timeframe: timeframe.key,
    timeframeLabel: timeframe.label,
    points,
    candles,
    readinessState: liveChart?.readinessState || "Ready",
    lastCandleUpdate: liveChart?.lastCandleUpdate || latestCandle?.time || null,
    freshness: liveChart?.freshness || "Fresh",
    degradedReason: liveChart?.degradedReason || null,
    sourceLabel:
      providerRuntime?.kind === "live" && !providerRuntime?.fallbackActive
        ? providerRuntime.label
        : "Demo Feed",
    levels: [
      { label: "Open", value: latestCandle ? formatPrice(latestCandle.open, precision) : "--", tone: "info" },
      { label: "High", value: latestCandle ? formatPrice(latestCandle.high, precision) : "--", tone: "success" },
      { label: "Low", value: latestCandle ? formatPrice(latestCandle.low, precision) : "--", tone: "danger" },
      { label: "Close", value: latestCandle ? formatPrice(latestCandle.close, precision) : "--", tone: "neutral" }
    ]
  };
}

function buildTradeTape(activeQuote = {}, chart = null, tick = 0, providerRuntime = null) {
  const sourceCandles = chart?.candles?.slice(-6) || [];
  const precision = inferPrecision(activeQuote.last, activeQuote.symbol);

  return (sourceCandles.length ? sourceCandles : Array.from({ length: 6 }, (_, index) => ({
    close: parseNumeric(activeQuote.last) * (1 + Math.sin((tick + index + symbolSeed(activeQuote.symbol)) * 0.34) * 0.0021),
    time: new Date(Date.now() - (5 - index) * 60 * 1000).toISOString()
  }))).map((item, index) => ({
    id: `${activeQuote.symbol || "TAPE"}-${tick}-${index}`,
    symbol: activeQuote.symbol,
    price: formatPrice(item.close, precision),
    size: `${0.25 + index * 0.25}`,
    side: index % 2 === 0 ? "Buy" : "Sell",
    time:
      providerRuntime?.kind === "live" && !providerRuntime.fallbackActive
        ? new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : `${5 - index}m`
  }));
}

function buildLiveDataDiagnostics(providerRuntime, symbolRuntimeHealth = [], activeSymbol, heartbeat, chart) {
  const activeHealth = symbolRuntimeHealth.find((item) => item.symbol === activeSymbol) || symbolRuntimeHealth[0];
  const averageHealth = symbolRuntimeHealth.length
    ? Math.round(
        symbolRuntimeHealth.reduce((total, item) => total + parseNumeric(item.runtimeHealth), 0) /
          symbolRuntimeHealth.length
      )
    : 0;
  const staleCount = symbolRuntimeHealth.filter((item) => item.freshness === "Stale").length;
  const degradedCount = symbolRuntimeHealth.filter(
    (item) => item.feedHealth === "Degraded" || item.feedHealth === "Awaiting Connector" || item.feedHealth === "Fallback"
  ).length;
  const chartReadiness = chart?.readinessState || providerRuntime.chartReadiness || "Pending";
  const chartFreshness = chart?.freshness || providerRuntime.chartFreshness || "Pending";
  const freshness =
    chartReadiness === "Ready"
      ? chartFreshness
      : activeHealth?.freshness || providerRuntime.freshness || (staleCount > 0 ? "Mixed" : "Warm");
  const feedHealth =
    activeHealth?.feedHealth ||
    providerRuntime.feedHealth ||
    (degradedCount > 0 ? "Attention" : symbolRuntimeHealth.some((item) => item.feedHealth === "Stable") ? "Stable" : "Healthy");

  return {
    providerState: providerRuntime.providerState,
    providerSymbol: chart?.providerSymbol || activeHealth?.providerSymbol || providerRuntime.providerSymbolInUse || null,
    mappingState: chart?.mappingState || activeHealth?.mappingState || providerRuntime.mappingState || null,
    freshness,
    lastUpdate: providerRuntime.lastUpdate || heartbeat,
    feedHealth,
    signalState: activeHealth?.signalState || providerRuntime.signalState || "Monitoring",
    runtimeHealth: providerRuntime.runtimeHealth !== "--" ? providerRuntime.runtimeHealth : averageHealth ? `${averageHealth}%` : "--",
    activeRuntimeHealth: activeHealth?.runtimeHealth || providerRuntime.runtimeHealth || "--",
    activeFreshness: activeHealth?.freshness || freshness,
    degradedSymbols: degradedCount,
    staleSymbols: staleCount,
    validationState: providerRuntime.validationState,
    configPath: providerRuntime.configPath,
    degradedReason:
      chartReadiness === "Ready"
        ? providerRuntime.partialCoverage
          ? providerRuntime.degradedReason || null
          : null
        : chart?.degradedReason || providerRuntime.degradedReason || providerRuntime.blockedReason || null,
    chartReadiness,
    chartFreshness,
    lastCandleUpdate: chart?.lastCandleUpdate || providerRuntime.lastCandleUpdate || null,
    note:
      providerRuntime.kind === "live"
        ? providerRuntime.fallbackActive
          ? providerRuntime.degradedReason || providerRuntime.blockedReason || `${providerRuntime.label} is unavailable. Demo fallback remains active.`
          : `${providerRuntime.label} is streaming in read-only live mode with ${chartReadiness.toLowerCase()} chart readiness, ${freshness.toLowerCase()} active-symbol freshness, and provider symbol ${chart?.providerSymbol || activeHealth?.providerSymbol || providerRuntime.providerSymbolInUse || "--"}.`
        : `${providerRuntime.label} is streaming with ${feedHealth.toLowerCase()} runtime health and ${freshness.toLowerCase()} quote freshness.`
  };
}

function makeAdapterRequestUrl({ symbols = [], selectedSymbol, timeframe = getDefaultLiveTimeframe(), outputsize }) {
  const normalizedSymbols = mergeRuntimeSymbols(symbols, [selectedSymbol]).slice(0, 4);
  const params = new URLSearchParams({
    source: "twelve-data",
    symbols: normalizedSymbols.join(","),
    selectedSymbol: selectedSymbol || normalizedSymbols[0] || "",
    timeframe
  });

  if (outputsize) {
    params.set("outputsize", String(outputsize));
  }

  return `/api/product/live-data?${params.toString()}`;
}

export function getDefaultLiveDataSource() {
  return "demo";
}

export function getLiveDataProviderCatalog() {
  return liveDataProviderCatalog;
}

export function getZeroCostLiveMode(providerKey = getDefaultLiveDataSource(), providerRuntime = null) {
  const resolvedKey = providerRuntime?.key || providerKey || getDefaultLiveDataSource();
  const provider = liveDataProviderCatalog.find((item) => item.key === resolvedKey) || liveDataProviderCatalog[0];
  const usingSafeLocalMode =
    resolvedKey === "demo" ||
    providerRuntime?.fallbackActive ||
    providerRuntime?.state === "Fallback to Demo";

  if (usingSafeLocalMode) {
    return {
      label: "Zero-Cost Safe",
      tone: "success",
      detail:
        "Local demo feed and paper execution remain the default-safe product path. Optional live polling can drop away without breaking the workspace."
    };
  }

  return {
    label: "Optional Live Read-Only",
    tone: "info",
    detail: `${provider.label} is operating as an optional read-only enhancer. Trading Pro Max stays usable on the local demo feed at any time.`
  };
}

export function getLiveDataRefreshInterval(providerKey = getDefaultLiveDataSource()) {
  return liveDataProviderCatalog.find((item) => item.key === providerKey)?.refreshMs || 4500;
}

export function getLiveChartTimeframes() {
  return getLiveTimeframeCatalog();
}

export function searchRuntimeSymbols(query, options) {
  return searchSupportedInstruments(query, options);
}

export async function fetchLiveDataAdapterSnapshot({
  liveDataSource = getDefaultLiveDataSource(),
  symbols = [],
  selectedSymbol,
  timeframe = getDefaultLiveTimeframe(),
  outputsize
}) {
  if (liveDataSource !== "twelve-data") return null;

  const requestUrl = makeAdapterRequestUrl({ symbols, selectedSymbol, timeframe, outputsize });
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LIVE_ADAPTER_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, { cache: "no-store", signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Live adapter request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Live adapter request timed out after ${LIVE_ADAPTER_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function buildLiveDataSnapshot({
  baseData,
  selectedSymbol,
  liveDataSource = getDefaultLiveDataSource(),
  liveTick = 0,
  liveAdapterRuntime = null,
  trackedSymbols = [],
  watchlistSymbols = [],
  chartTimeframe = getDefaultLiveTimeframe()
}) {
  const provider =
    liveDataProviderCatalog.find((item) => item.key === liveDataSource) ||
    liveDataProviderCatalog[0];
  const heartbeat = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const providerRuntime = buildProviderRuntime(provider, liveAdapterRuntime, heartbeat);
  const watchlistBase = buildWatchlist(baseData.watchlist || [], liveTick, trackedSymbols, watchlistSymbols);
  const watchlistSeed =
    providerRuntime.kind === "live"
      ? overlayLiveQuotes(watchlistBase, liveAdapterRuntime, providerRuntime)
      : watchlistBase;
  const routeLibrary = buildRouteLibrary(baseData.routeLibrary || [], watchlistSeed);
  const symbolRuntimeHealthSeed = buildSymbolRuntimeHealth(
    watchlistSeed,
    routeLibrary,
    providerRuntime,
    liveTick,
    heartbeat,
    liveAdapterRuntime
  );
  const healthMap = Object.fromEntries(symbolRuntimeHealthSeed.map((item) => [item.symbol, item]));
  const watchlist = watchlistSeed.map((item) => ({
    ...item,
    ...healthMap[item.symbol]
  }));
  const marketFeeds = buildMarketFeeds(baseData.marketFeeds || [], watchlist, liveTick, providerRuntime, healthMap);
  const marketPosture = buildMarketPosture(baseData.marketPosture || {}, watchlist, routeLibrary);
  const activeQuote = watchlist.find((item) => item.symbol === selectedSymbol) || watchlist[0] || {};
  const liveChart = liveAdapterRuntime?.chart?.symbol === activeQuote.symbol ? liveAdapterRuntime.chart : null;
  const chart = buildChart(baseData.chart || {}, activeQuote, liveTick, liveChart, providerRuntime, chartTimeframe);
  const symbolRuntimeHealth = symbolRuntimeHealthSeed.map((item) =>
    item.symbol === chart.symbol
      ? {
          ...item,
          chartReadiness: chart.readinessState,
          chartFreshness: chart.freshness,
          lastCandleUpdate: chart.lastCandleUpdate
        }
      : item
  );
  const tradeTape = buildTradeTape(activeQuote, chart, liveTick, providerRuntime);
  const quoteMap = Object.fromEntries(watchlist.map((item) => [item.symbol, item]));
  const strongestSignal = watchlist
    .slice()
    .sort(
      (left, right) =>
        parseConfidence(right.signalStrength || right.confidence) -
        parseConfidence(left.signalStrength || left.confidence)
    )
    .slice(0, 3)
    .map((item) => ({
      symbol: item.symbol,
      strength: item.signalStrength || item.confidence,
      impulse: item.impulse,
      posture: marketPosture[item.symbol]?.posture || "Monitoring",
      feedHealth: item.feedHealth,
      signalState: item.signalState
    }));
  const liveDataDiagnostics = buildLiveDataDiagnostics(
    providerRuntime,
    symbolRuntimeHealth,
    activeQuote.symbol || selectedSymbol,
    heartbeat,
    chart
  );
  const liveDataStatus = {
    key: providerRuntime.key,
    label: providerRuntime.label,
    state: providerRuntime.state,
    tone: providerRuntime.tone,
    mode: providerRuntime.mode,
    note: liveDataDiagnostics.note || providerRuntime.description || providerRuntime.note,
    heartbeat: providerRuntime.lastUpdate || heartbeat,
    lastUpdate: providerRuntime.lastUpdate || heartbeat,
    freshness: liveDataDiagnostics.freshness,
    latency: providerRuntime.latency || "Waiting",
    connectorState: providerRuntime.connectorState || "Not configured",
    providerState: providerRuntime.providerState,
    feedHealth: liveDataDiagnostics.feedHealth,
    signalState: liveDataDiagnostics.signalState,
    runtimeHealth: liveDataDiagnostics.runtimeHealth,
    blockedReason: providerRuntime.blockedReason,
    degradedReason: liveDataDiagnostics.degradedReason,
    validationState: providerRuntime.validationState,
    configPath: providerRuntime.configPath,
    adapterSupported: providerRuntime.adapterSupported,
    fallbackActive: providerRuntime.fallbackActive,
    readOnly: true,
    providerSymbol: liveDataDiagnostics.providerSymbol,
    mappingState: liveDataDiagnostics.mappingState,
    chartReadiness: liveDataDiagnostics.chartReadiness,
    chartFreshness: liveDataDiagnostics.chartFreshness,
    lastCandleUpdate: liveDataDiagnostics.lastCandleUpdate
  };

  return {
    watchlist,
    routeLibrary,
    marketFeeds,
    marketPosture,
    chart,
    quoteMap,
    tradeTape,
    signalBoard: strongestSignal,
    liveDataStatus,
    liveDataDiagnostics,
    symbolRuntimeHealth
  };
}
