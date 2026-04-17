const MARKET_CATALOG = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    venue: "EBS FX",
    category: "FX Major",
    pointValue: 100000,
    baseline: 1.0842,
    digits: 4,
    tickSize: 0.0001,
    baseSpread: 0.00012,
    dailyVolPct: 0.46,
    route: "Macro Rotation",
    note: "FX liquidity remains deep enough for deterministic paper fills and realistic spread-aware routing.",
    catalyst: "Macro rate divergence is still the dominant driver.",
    nextEvent: "ECB speaker 14:00 CET",
    liquidity: "Deep primary book",
    correlation: "Inverse DXY intact",
    confidenceBase: 78
  },
  {
    symbol: "NASDAQ",
    name: "Nasdaq 100 Index",
    venue: "CME Globex",
    category: "Equity Index",
    pointValue: 20,
    baseline: 18342,
    digits: 2,
    tickSize: 0.25,
    baseSpread: 0.85,
    dailyVolPct: 1.28,
    route: "Index Momentum",
    note: "Index leadership remains a clean read for broader risk-on and risk-off transitions.",
    catalyst: "Cash session order imbalance keeps driving intraday structure.",
    nextEvent: "US cash open +17m",
    liquidity: "Institutional depth",
    correlation: "Positive beta to growth",
    confidenceBase: 76
  },
  {
    symbol: "BTC/USD",
    name: "Bitcoin Spot",
    venue: "Composite Crypto",
    category: "Digital Asset",
    pointValue: 1,
    baseline: 68420,
    digits: 0,
    tickSize: 1,
    baseSpread: 9,
    dailyVolPct: 1.96,
    route: "Crypto Expansion",
    note: "Crypto beta is preserved, but the desk remains paper-only with deterministic fill discipline.",
    catalyst: "Flow and funding alignment continue to matter more than single prints.",
    nextEvent: "ETF flow snapshot 15m",
    liquidity: "Fragmented but improving",
    correlation: "Risk beta aligned",
    confidenceBase: 81
  },
  {
    symbol: "XAU/USD",
    name: "Gold Spot",
    venue: "LBMA",
    category: "Metal",
    pointValue: 100,
    baseline: 2362.4,
    digits: 2,
    tickSize: 0.1,
    baseSpread: 0.42,
    dailyVolPct: 0.88,
    route: "Defensive Rotation",
    note: "Gold remains a clean defensive lane for macro hedging and cross-asset regime checks.",
    catalyst: "Real-rate sensitivity is keeping the metal responsive.",
    nextEvent: "US yields check 11m",
    liquidity: "Global composite depth",
    correlation: "Inverse real yields",
    confidenceBase: 73
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum Spot",
    venue: "Composite Crypto",
    category: "Digital Asset",
    pointValue: 1,
    baseline: 3218,
    digits: 0,
    tickSize: 1,
    baseSpread: 1.9,
    dailyVolPct: 2.08,
    route: "Expansion Ladder",
    note: "ETH tracks crypto beta while still offering cleaner structure for paper execution rehearsals.",
    catalyst: "Relative strength versus BTC is back in play.",
    nextEvent: "Layer-2 flow scan 27m",
    liquidity: "Fragmented but improving",
    correlation: "Risk beta aligned",
    confidenceBase: 75
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp",
    venue: "NASDAQ",
    category: "Single Stock",
    pointValue: 100,
    baseline: 968.4,
    digits: 2,
    tickSize: 0.01,
    baseSpread: 0.18,
    dailyVolPct: 1.54,
    route: "Single Name Momentum",
    note: "Single-name momentum remains useful for concentrated route qualification inside paper mode.",
    catalyst: "Leadership in semis is still an active index driver.",
    nextEvent: "Analyst tape 42m",
    liquidity: "Institutional depth",
    correlation: "High beta to NASDAQ",
    confidenceBase: 72
  },
  {
    symbol: "DXY",
    name: "US Dollar Index",
    venue: "ICE",
    category: "Macro Index",
    pointValue: 1000,
    baseline: 103.94,
    digits: 2,
    tickSize: 0.005,
    baseSpread: 0.03,
    dailyVolPct: 0.34,
    route: "Dollar Hedge",
    note: "Dollar direction anchors broad macro posture and keeps the desk bias honest.",
    catalyst: "Macro liquidity keeps recycling through USD strength and weakness.",
    nextEvent: "Treasury check 21m",
    liquidity: "Macro benchmark depth",
    correlation: "Inverse risk assets",
    confidenceBase: 68
  },
  {
    symbol: "BRENT",
    name: "Brent Crude",
    venue: "ICE Futures",
    category: "Energy",
    pointValue: 1000,
    baseline: 87.62,
    digits: 2,
    tickSize: 0.01,
    baseSpread: 0.04,
    dailyVolPct: 0.92,
    route: "Inflation Watch",
    note: "Energy remains a useful inflation regime lane for desk-level context and rotation checks.",
    catalyst: "Supply narrative and macro demand shifts remain tightly linked.",
    nextEvent: "Energy inventory scan 33m",
    liquidity: "Institutional futures depth",
    correlation: "Inflation sensitive",
    confidenceBase: 67
  }
];

const TIMEFRAME_CONFIG = {
  "1m": { key: "1m", label: "1 Minute", intervalMs: 60 * 1000, bars: 72 },
  "5m": { key: "5m", label: "5 Minute", intervalMs: 5 * 60 * 1000, bars: 72 },
  "15m": { key: "15m", label: "15 Minute", intervalMs: 15 * 60 * 1000, bars: 72 },
  "1H": { key: "1H", label: "1 Hour", intervalMs: 60 * 60 * 1000, bars: 64 },
  "4H": { key: "4H", label: "4 Hour", intervalMs: 4 * 60 * 60 * 1000, bars: 56 },
  "1D": { key: "1D", label: "1 Day", intervalMs: 24 * 60 * 60 * 1000, bars: 48 }
};

const DEFAULT_WATCHLIST = MARKET_CATALOG.map((item) => item.symbol);

export const PAPER_ACCOUNT_MODES = ["Paper", "Preview"];

export function listSupportedInstruments() {
  return MARKET_CATALOG.slice();
}

export function listSupportedSymbols() {
  return MARKET_CATALOG.map((item) => item.symbol);
}

export function getDefaultWatchlistSymbols() {
  return DEFAULT_WATCHLIST.slice();
}

export function getInstrumentMeta(symbol) {
  return MARKET_CATALOG.find((item) => item.symbol === symbol) || {
    symbol,
    name: symbol,
    venue: "Local Composite",
    category: "Cross Asset",
    pointValue: 100,
    baseline: 100,
    digits: 2,
    tickSize: 0.01,
    baseSpread: 0.05,
    dailyVolPct: 0.8,
    route: "Manual Desk",
    note: "Instrument was not found in the supported catalog.",
    catalyst: "Awaiting market classification.",
    nextEvent: "Desk review",
    liquidity: "Composite depth",
    correlation: "Unclassified",
    confidenceBase: 64
  };
}

export function getTimeframeConfig(timeframeKey = "15m") {
  return TIMEFRAME_CONFIG[timeframeKey] || TIMEFRAME_CONFIG["15m"];
}

export function listTimeframeKeys() {
  return Object.keys(TIMEFRAME_CONFIG);
}

export function listTimeframes() {
  return Object.values(TIMEFRAME_CONFIG);
}

export function createInstrumentSeed(symbol = "") {
  return Array.from(symbol).reduce((total, char) => total + char.charCodeAt(0), 0);
}
