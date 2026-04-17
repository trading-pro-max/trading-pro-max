import {
  getAiCopilotData,
  getExecutionCenterData,
  getJournalVaultData,
  getMarketIntelligenceData,
  getProductRuntime,
  getProductWorkspaceData,
  getRiskControlData,
  getStrategyLabData
} from "./product-data";
import { marketIntelligenceLibrary } from "./trading-terminal-intelligence";
import { formatSigned, round, toNumber } from "./trading-terminal-utils";

const timeframeDefinitions = [
  { key: "1m", bars: 42, label: "1 Minute", driftFactor: 0.24, volatilityFactor: 1.28, volumeFactor: 0.42, atrFactor: 0.36, intervalMinutes: 1 },
  { key: "5m", bars: 52, label: "5 Minute", driftFactor: 0.48, volatilityFactor: 1.08, volumeFactor: 0.58, atrFactor: 0.58, intervalMinutes: 5 },
  { key: "15m", bars: 56, label: "15 Minute", driftFactor: 0.72, volatilityFactor: 0.92, volumeFactor: 0.74, atrFactor: 0.88, intervalMinutes: 15 },
  { key: "1H", bars: 58, label: "1 Hour", driftFactor: 1.08, volatilityFactor: 0.78, volumeFactor: 0.96, atrFactor: 1.2, intervalMinutes: 60 },
  { key: "4H", bars: 48, label: "4 Hour", driftFactor: 1.38, volatilityFactor: 0.62, volumeFactor: 1.18, atrFactor: 1.7, intervalMinutes: 240 },
  { key: "1D", bars: 44, label: "1 Day", driftFactor: 1.86, volatilityFactor: 0.56, volumeFactor: 1.42, atrFactor: 2.4, intervalMinutes: 1440 }
];

const extraSymbols = [
  { symbol: "ETH/USD", strategy: "Expansion Ladder", last: 3156, change: "+1.42%", confidence: "74%", bias: "Breakout retest", note: "ETH is following BTC beta but with cleaner post-break structure." },
  { symbol: "NVDA", strategy: "Single Name Momentum", last: 948.2, change: "+0.86%", confidence: "71%", bias: "Continuation", note: "Semiconductor leadership remains intact on relative strength." },
  { symbol: "DXY", strategy: "Macro Hedge", last: 104.36, change: "-0.24%", confidence: "68%", bias: "Softening", note: "Dollar pressure is easing and helping cyclical risk assets." },
  { symbol: "BRENT", strategy: "Inflation Watch", last: 88.64, change: "+0.31%", confidence: "66%", bias: "Firm", note: "Energy is bid enough to keep inflation-sensitive positioning active." }
];

function parsePercent(value, fallback = 0) {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPrice(symbol, value) {
  const digits = /BTC|ETH/i.test(symbol) ? 0 : /NASDAQ|NVDA|DXY|BRENT/i.test(symbol) ? 2 : 4;
  return Number(value).toFixed(digits);
}

function getInstrumentMeta(symbol) {
  if (symbol === "EUR/USD") {
    return { name: "Euro / US Dollar", venue: "EBS FX", category: "FX Major", pointValue: 100000, baseline: 1.0826, digits: 4, tickSize: 0.0001 };
  }
  if (symbol === "NASDAQ") {
    return { name: "Nasdaq 100 Index", venue: "CME Globex", category: "Equity Index", pointValue: 20, baseline: 18276, digits: 2, tickSize: 0.25 };
  }
  if (symbol === "BTC/USD") {
    return { name: "Bitcoin Spot", venue: "CME / Composite", category: "Digital Asset", pointValue: 1, baseline: 64320, digits: 0, tickSize: 1 };
  }
  if (symbol === "XAU/USD") {
    return { name: "Gold Spot", venue: "LBMA", category: "Metal", pointValue: 100, baseline: 2348.2, digits: 2, tickSize: 0.1 };
  }
  if (symbol === "ETH/USD") {
    return { name: "Ethereum Spot", venue: "CME / Composite", category: "Digital Asset", pointValue: 1, baseline: 3156, digits: 0, tickSize: 1 };
  }
  if (symbol === "NVDA") {
    return { name: "NVIDIA Corp", venue: "NASDAQ", category: "Single Stock", pointValue: 100, baseline: 948.2, digits: 2, tickSize: 0.01 };
  }
  if (symbol === "DXY") {
    return { name: "US Dollar Index", venue: "ICE", category: "Macro Index", pointValue: 1000, baseline: 104.36, digits: 2, tickSize: 0.005 };
  }
  if (symbol === "BRENT") {
    return { name: "Brent Crude", venue: "ICE Futures", category: "Energy", pointValue: 1000, baseline: 88.64, digits: 2, tickSize: 0.01 };
  }

  return { name: symbol, venue: "Global Composite", category: "Cross Asset", pointValue: 100, baseline: 100, digits: 2, tickSize: 0.01 };
}

function generateWaveSeries(length, seed, drift, amplitude) {
  const values = [];
  let current = seed;

  for (let index = 0; index < length; index += 1) {
    const wave = Math.sin(index * 0.74 + seed * 0.16) * amplitude;
    const pulse = Math.cos(index * 0.31 + seed * 0.08) * amplitude * 0.65;
    const bias = Math.sin(index * 0.09 + drift) * amplitude * 0.22;
    current = Math.max(8, current + drift + wave * 0.42 + pulse * 0.34 + bias);
    values.push(round(current, 2));
  }

  return values;
}

function scaleFactorForPrice(basePrice) {
  if (basePrice < 5) return 0.0002;
  if (basePrice < 50) return 0.022;
  if (basePrice < 1000) return basePrice * 0.003;
  return basePrice * 0.0022;
}

function buildCandleSeries(meta, targetLast, changePct, config, seedIndex) {
  const amplitude = config.volatilityFactor * (Math.abs(changePct) > 1 ? 2.2 : 1.7);
  const drift = Math.sign(changePct || 1) * config.driftFactor * 0.45;
  const points = generateWaveSeries(config.bars, 18 + seedIndex * 3 + config.intervalMinutes * 0.01, drift, amplitude);
  const scale = scaleFactorForPrice(meta.baseline) * config.volatilityFactor;
  const candles = [];
  let previousClose = meta.baseline * (1 - changePct * 0.0006);

  for (let index = 0; index < points.length; index += 1) {
    const impulse = ((points[index] - (points[index - 1] ?? points[index])) / 10) * scale;
    const open = previousClose;
    const close = round(open + impulse, 4);
    const high = round(Math.max(open, close) + scale * 0.58 + (index % 3) * scale * 0.14, 4);
    const low = round(Math.min(open, close) - scale * 0.47 - (index % 4) * scale * 0.1, 4);
    candles.push({
      open,
      high,
      low,
      close,
      volume: Math.round((72 + index * 6 + (index % 5) * 9) * config.volumeFactor)
    });
    previousClose = close;
  }

  const offset = targetLast - candles[candles.length - 1].close;

  return candles.map((candle, index) => ({
    ...candle,
    open: round(candle.open + offset, 4),
    high: round(candle.high + offset, 4),
    low: round(candle.low + offset, 4),
    close: round(candle.close + offset, 4),
    label: createTimeLabel(config.intervalMinutes, candles.length - index - 1)
  }));
}

function createTimeLabel(intervalMinutes, distance) {
  const now = new Date();
  const time = new Date(now.getTime() - distance * intervalMinutes * 60 * 1000);

  if (intervalMinutes >= 1440) {
    return time.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildSparklineFromCandles(candles) {
  return candles.slice(-18).map((item) => round(item.close, 2));
}

function buildTimeframes(market, index, meta) {
  const timeframes = {};

  timeframeDefinitions.forEach((config, configIndex) => {
    const changePct = parsePercent(market.change, 0.32) * (0.58 + config.driftFactor * 0.26);
    const targetLast = market.last + market.last * (configIndex - 2) * 0.0006;
    const candles = buildCandleSeries(meta, targetLast, changePct, config, index + configIndex);
    const highs = candles.map((item) => item.high);
    const lows = candles.map((item) => item.low);
    const closes = candles.map((item) => item.close);
    const lastClose = closes[closes.length - 1];
    const vwap = closes.reduce((sum, value, candleIndex) => sum + value * candles[candleIndex].volume, 0) /
      candles.reduce((sum, candle) => sum + candle.volume, 0);
    const atrValue = (Math.max(...highs) - Math.min(...lows)) * config.atrFactor;
    const imbalance = changePct >= 0 ? `${58 + configIndex} / ${42 - configIndex} bid skew` : `${46 - configIndex} / ${54 + configIndex} offer skew`;
    const priceDigits = meta.digits;

    timeframes[config.key] = {
      key: config.key,
      label: config.label,
      intervalMinutes: config.intervalMinutes,
      candles,
      spark: buildSparklineFromCandles(candles),
      last: formatPrice(market.symbol, lastClose),
      rawLast: lastClose,
      change: formatSigned(changePct, 2, "%"),
      rawChange: round(changePct, 2),
      sessionHigh: formatPrice(market.symbol, Math.max(...highs)),
      sessionLow: formatPrice(market.symbol, Math.min(...lows)),
      vwap: formatPrice(market.symbol, vwap),
      atr: meta.category === "FX Major" ? `${Math.round(atrValue * 10000)} pips` : meta.category === "Equity Index" ? `${Math.round(atrValue)} pts` : `$${Math.round(atrValue)}`,
      imbalance,
      volume: `${(candles.reduce((sum, candle) => sum + candle.volume, 0) / 1000).toFixed(priceDigits === 0 ? 0 : 1)}k`,
      range: formatPrice(market.symbol, Math.max(...highs) - Math.min(...lows)),
      statsStrip: [
        { label: "Session High", value: formatPrice(market.symbol, Math.max(...highs)) },
        { label: "Session Low", value: formatPrice(market.symbol, Math.min(...lows)) },
        { label: "VWAP", value: formatPrice(market.symbol, vwap) },
        { label: "ATR", value: meta.category === "FX Major" ? `${Math.round(atrValue * 10000)} pips` : meta.category === "Equity Index" ? `${Math.round(atrValue)} pts` : `$${Math.round(atrValue)}` },
        { label: "Volume", value: `${(candles.reduce((sum, candle) => sum + candle.volume, 0) / 1000).toFixed(1)}k` },
        { label: "Imbalance", value: imbalance }
      ]
    };
  });

  return timeframes;
}

function createFallbackIntelligence(symbol, route, bias) {
  return {
    bias: bias || "Balanced",
    confidence: 70,
    regime: "Cross-asset rotation",
    volatilityState: "Balanced",
    warnings: [
      `${symbol} remains under active monitoring for correlation drift.`,
      "Protect against spread and latency deterioration before routing live.",
      "Guardrails require explicit risk caps on this route."
    ],
    whyTrade: [
      `${route} is aligned with current price structure.`,
      "Liquidity remains usable for controlled execution.",
      "Signal quality is acceptable for paper simulation."
    ],
    whyNot: [
      "The route is not the highest-conviction setup on the desk.",
      "Cross-asset leadership is still mixed.",
      "Execution quality may degrade if volatility expands."
    ],
    whatChanged: [
      "Signal quality improved during the last observation window.",
      "Market structure stabilized around current value.",
      "Operator routing ranked the symbol back into the active list."
    ],
    operatorRecommendations: [
      "Keep the symbol tactical until higher-priority routes are complete.",
      "Use conservative sizing on live escalation.",
      "Monitor correlation and liquidity before adding."
    ]
  };
}

function enrichMarket(item, index, routeNotes = []) {
  const meta = getInstrumentMeta(item.symbol);
  const last = Number.isFinite(item.last) ? item.last : meta.baseline;
  const intelligence = marketIntelligenceLibrary[item.symbol] || createFallbackIntelligence(item.symbol, item.strategy || "Manual Desk", item.bias);
  const timeframes = buildTimeframes({ ...item, last }, index, meta);
  const activeTimeframe = timeframes["15m"] || Object.values(timeframes)[0];

  return {
    symbol: item.symbol,
    name: meta.name,
    venue: meta.venue,
    category: meta.category,
    route: item.strategy || "Manual Desk",
    pointValue: meta.pointValue,
    digits: meta.digits,
    tickSize: meta.tickSize,
    defaultTimeframe: "15m",
    favorite: index < 4,
    note: item.note || routeNotes[0] || "Monitoring active market structure and order-book balance.",
    catalyst: routeNotes[1] || `${item.strategy || "Manual Desk"} remains the lead routing logic for this symbol.`,
    nextEvent:
      item.symbol === "EUR/USD"
        ? "ECB speaker 14:00 CET"
        : item.symbol === "NASDAQ"
          ? "US cash open +17m"
          : item.symbol === "BTC/USD"
            ? "ETF flow snapshot 15m"
            : "Macro tape sync 11m",
    liquidity: meta.category === "Digital Asset" ? "Fragmented but improving" : meta.category === "FX Major" ? "Deep primary book" : "Institutional depth",
    correlation: meta.category === "FX Major" ? "DXY inverse intact" : meta.category === "Digital Asset" ? "Risk beta aligned" : "Cross-asset positive",
    intelligence,
    timeframes,
    watchlist: {
      last: activeTimeframe.last,
      rawLast: activeTimeframe.rawLast,
      change: activeTimeframe.change,
      rawChange: activeTimeframe.rawChange,
      spark: activeTimeframe.spark,
      confidence: `${intelligence.confidence}%`
    }
  };
}

function createId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

export function getTradingTerminalData() {
  const runtime = getProductRuntime();
  const workspace = getProductWorkspaceData();
  const market = getMarketIntelligenceData();
  const execution = getExecutionCenterData();
  const risk = getRiskControlData();
  const strategy = getStrategyLabData();
  const ai = getAiCopilotData();
  const journal = getJournalVaultData();

  const baseMarkets = [...(execution.watchlist || []), ...extraSymbols]
    .filter((item, index, collection) => collection.findIndex((candidate) => candidate.symbol === item.symbol) === index)
    .slice(0, 8);

  const routeNotes = execution.routeNotes || {};
  const markets = baseMarkets.map((item, index) => enrichMarket(item, index, routeNotes[item.symbol] || []));
  const defaultMarket = markets.find((item) => item.symbol === (execution.primaryRoute?.asset || "EUR/USD")) || markets[0];
  const liveFeed = execution.liveOps?.streams?.[0]?.name || execution.liveOps?.streams?.[0]?.provider || "Hybrid Direct Feed";

  const initialPositions = (execution.positions || []).map((position, index) => {
    const marketEntry = markets.find((item) => item.symbol === position.symbol);

    return {
      id: createId("POS", index),
      symbol: position.symbol,
      side: position.side,
      route: execution.routeLibrary?.[index]?.name || position.status,
      quantity: toNumber(position.size, 1),
      entry: toNumber(position.entry, marketEntry?.timeframes?.["15m"]?.rawLast || 0),
      stopLoss: marketEntry ? toNumber(position.entry, 0) * 0.998 : 0,
      takeProfit: marketEntry ? toNumber(position.entry, 0) * 1.004 : 0,
      riskAmount: Math.abs(toNumber(position.pnl, 0)) * 0.72 || 320,
      status: position.status || "Open",
      accountMode: "Paper",
      openedAt: `09:${String(31 + index * 4).padStart(2, "0")}`
    };
  });

  const pendingOrders = (execution.history || [])
    .filter((item) => item.status === "Working" || item.status === "Queued")
    .map((order, index) => {
      const marketEntry = markets.find((item) => item.symbol === order.symbol);
      const reference = marketEntry?.timeframes?.["15m"]?.rawLast || marketEntry?.timeframes?.["5m"]?.rawLast || 0;

      return {
        id: order.id || createId("ORD", index),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        tif: "DAY",
        quantity: 1 + index * 0.5,
        entry: reference,
        stopLoss: reference * (order.side === "Buy" ? 0.996 : 1.004),
        takeProfit: reference * (order.side === "Buy" ? 1.008 : 0.992),
        riskAmount: 260 + index * 40,
        status: "Pending",
        timestamp: order.time || `09:${String(40 - index * 3).padStart(2, "0")}`,
        accountMode: "Paper"
      };
    });

  const fills = (execution.history || [])
    .filter((item) => item.status === "Filled")
    .map((fill, index) => ({
      id: fill.id || createId("FIL", index),
      symbol: fill.symbol,
      side: fill.side,
      type: fill.type,
      quantity: 1 + index * 0.5,
      entry: markets.find((item) => item.symbol === fill.symbol)?.timeframes?.["15m"]?.rawLast || 0,
      status: "Filled",
      timestamp: fill.time || `09:${String(22 + index * 6).padStart(2, "0")}`,
      accountMode: "Paper"
    }));

  return {
    brand: {
      name: "Trading Pro Max",
      mark: "TPM",
      desk: "Institutional Terminal"
    },
    sections: [
      { id: "Dashboard", short: "DB", badge: "Core", detail: "Macro desk overview with live execution context." },
      { id: "Markets", short: "MK", badge: "08", detail: "Cross-asset tape, regime, and venue posture." },
      { id: "Watchlist", short: "WL", badge: "18", detail: "Focused symbols and favorites ready for handoff." },
      { id: "Execution", short: "EX", badge: "Hot", detail: "Ticketing, routing, and confirmation controls." },
      { id: "Portfolio", short: "PF", badge: "AUM", detail: "Capital, concentration, and pnl map." },
      { id: "Positions", short: "PS", badge: String(initialPositions.length), detail: "Open risk, protected lanes, and active trades." },
      { id: "Orders", short: "OR", badge: String(pendingOrders.length), detail: "Working, filled, canceled, and routed orders." },
      { id: "Journal", short: "JR", badge: "Log", detail: "Operator review and session archive." },
      { id: "Strategy Lab", short: "SL", badge: "Lab", detail: "Route design, validation, and scenario prep." },
      { id: "Risk Control", short: "RC", badge: "Armed", detail: "Guardrails, drawdown, and runtime lock state." },
      { id: "AI Copilot", short: "AI", badge: "Assist", detail: "Decision support and operator explanations." },
      { id: "Market Intelligence", short: "MI", badge: "Intel", detail: "Catalysts, tape context, and change detection." },
      { id: "Settings", short: "ST", badge: "Desk", detail: "Connectivity, routing, density, and account controls." }
    ],
    topbar: {
      marketStatus: "Open",
      sessionState: "EU / US overlap",
      sessionBias: "Risk-on rotation",
      connection: {
        state: "Connected",
        feed: liveFeed,
        latencyMs: 18,
        throughput: "99.98%",
        sequence: "SYNC-884.19"
      },
      accountModes: ["Paper", "Live"],
      notifications: [
        { id: "NOT-001", title: "Latency widened briefly on NASDAQ futures", tone: "warning", time: "09:44" },
        { id: "NOT-002", title: "Risk guard tightened BTC sizing by 10%", tone: "neutral", time: "09:39" },
        { id: "NOT-003", title: "AI route score upgraded EUR/USD back to primary", tone: "positive", time: "09:34" }
      ]
    },
    chart: {
      defaultTimeframe: defaultMarket.defaultTimeframe,
      timeframes: timeframeDefinitions.map((item) => item.key),
      indicators: ["VWAP", "EMA 20", "EMA 50", "Volume", "Auction Levels"],
      tools: ["Crosshair", "Trendline", "Measure", "Alert", "Notes"],
      panelTabs: ["Price", "Volume", "Order Flow", "Correlation"]
    },
    execution: {
      orderTypes: ["Market", "Limit", "Stop", "Stop Limit"],
      tif: ["DAY", "IOC", "GTC"],
      defaults: {
        side: execution.orderTicket?.side || "Buy",
        type: execution.orderTicket?.type || "Limit",
        quantity: execution.orderTicket?.size || "1.50",
        entry: execution.orderTicket?.entry || defaultMarket.timeframes[defaultMarket.defaultTimeframe].last,
        stopLoss: execution.orderTicket?.stop || "1.0809",
        takeProfit: execution.orderTicket?.target || "1.0868",
        leverage: "4.0",
        riskAmount: "450",
        tif: "DAY"
      }
    },
    heatCards: [
      { label: "FX", value: "+0.42%", state: "Bid", tone: "positive" },
      { label: "Equities", value: "+0.88%", state: "Momentum", tone: "positive" },
      { label: "Crypto", value: "+1.73%", state: "Expansion", tone: "positive" },
      { label: "Rates", value: "-0.16%", state: "Soft USD", tone: "neutral" },
      { label: "Metals", value: "-0.21%", state: "Defensive fade", tone: "negative" },
      { label: "Energy", value: "+0.31%", state: "Inflation bid", tone: "warning" }
    ],
    markets,
    defaultSymbol: defaultMarket.symbol,
    initialState: {
      positions: initialPositions,
      pendingOrders,
      fills,
      activityLog: (execution.queue || []).map((item, index) => ({
        id: createId("ACT", index),
        time: `09:${String(44 - index * 3).padStart(2, "0")}`,
        event: item.task,
        owner: item.owner,
        status: item.status
      })),
      auditTrail: [
        { id: "AUD-001", time: "09:46:18", level: "INFO", message: "Primary feed heartbeat confirmed across direct and backup lanes." },
        { id: "AUD-002", time: "09:45:42", level: "WARN", message: "NASDAQ depth widened above normal during opening auction staging." },
        { id: "AUD-003", time: "09:44:55", level: "INFO", message: "AI confidence model promoted EUR/USD back to primary execution slot." },
        { id: "AUD-004", time: "09:42:31", level: "INFO", message: "Paper execution bridge reconciled working orders without exceptions." }
      ]
    },
    diagnostics: {
      baseExposure: execution.portfolio?.totals?.grossExposure || 4800000,
      feedHealth: execution.liveOps?.watches?.guardedRoutes ? 99.94 : 98.72,
      runtimeHealth: runtime.metrics?.desktopReadiness ?? 84,
      baseDrawdown: parsePercent(execution.riskBar?.[0]?.value, 0.62),
      baseSessionRisk: toNumber(execution.riskBar?.[1]?.value, 1.38),
      guardrail: "Armed",
      alerts: [
        "Correlated tech and crypto longs are nearing the concentration threshold.",
        "Broker bridge remains paper-locked until live checklist completion.",
        `${risk.lanes?.length || 6} risk lanes are active across the current session.`
      ]
    },
    overview: {
      workspaceTitle: "Professional operator shell for discretionary and systematic execution.",
      releaseGate: runtime.releaseGate || "LOCAL_PRODUCT_BUILD",
      runtimeMetrics: runtime.metrics || {},
      strategyHighlights: strategy.recommendations || [],
      journalTitle: journal.journal?.title || "Operator Journal",
      reviewCoverage: `${journal.tracks?.length || 4} review tracks`,
      activeRoutes: `${workspace.routes?.length || 6} active routes`,
      feeds: `${market.feeds?.length || 4} monitored feeds`,
      prompts: ai.prompts || []
    }
  };
}
