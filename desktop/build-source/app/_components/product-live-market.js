const instrumentCatalog = [
  {
    symbol: "EUR/USD",
    providerSymbol: "EUR/USD",
    label: "Euro / US Dollar",
    assetClass: "Forex",
    aliases: ["EURUSD", "EUROUSD", "FX"],
    routeName: "FX Continuation",
    defaultBias: "Bullish structure",
    defaultNote: "Macro trend remains constructive while intraday pullbacks stay contained.",
    defaultConfidence: "82%",
    demoLast: 1.1726
  },
  {
    symbol: "GBP/USD",
    providerSymbol: "GBP/USD",
    label: "British Pound / US Dollar",
    assetClass: "Forex",
    aliases: ["GBPUSD", "CABLE"],
    routeName: "Cable Momentum",
    defaultBias: "Session continuation",
    defaultNote: "Cable remains responsive to London momentum and clean breakout pulls.",
    defaultConfidence: "78%",
    demoLast: 1.2864
  },
  {
    symbol: "USD/JPY",
    providerSymbol: "USD/JPY",
    label: "US Dollar / Japanese Yen",
    assetClass: "Forex",
    aliases: ["USDJPY", "UJ"],
    routeName: "Yen Rotation",
    defaultBias: "Trend compression",
    defaultNote: "Dollar-yen is rotating through a compression range with controlled breakout risk.",
    defaultConfidence: "74%",
    demoLast: 151.42
  },
  {
    symbol: "NASDAQ",
    providerSymbol: "QQQ",
    label: "Nasdaq 100 Proxy",
    assetClass: "Index Proxy",
    aliases: ["NASDAQ100", "NDX", "QQQ"],
    routeName: "Index Momentum Proxy",
    defaultBias: "Momentum continuation",
    defaultNote: "Nasdaq runtime is tracked through the QQQ proxy for lawful read-only equity index context.",
    defaultConfidence: "79%",
    demoLast: 482.18
  },
  {
    symbol: "SPY",
    providerSymbol: "SPY",
    label: "S&P 500 ETF",
    assetClass: "Equity ETF",
    aliases: ["SPX", "SP500", "SPDR"],
    routeName: "Broad Index Rotation",
    defaultBias: "Balanced trend",
    defaultNote: "Broad index flow is available through SPY for clean ETF-based market context.",
    defaultConfidence: "76%",
    demoLast: 521.42
  },
  {
    symbol: "AAPL",
    providerSymbol: "AAPL",
    label: "Apple Inc.",
    assetClass: "Equity",
    aliases: ["APPLE"],
    routeName: "Mega-Cap Continuation",
    defaultBias: "Leadership continuation",
    defaultNote: "AAPL remains a clean single-name leadership proxy for route development and execution staging.",
    defaultConfidence: "77%",
    demoLast: 214.76
  },
  {
    symbol: "TSLA",
    providerSymbol: "TSLA",
    label: "Tesla Inc.",
    assetClass: "Equity",
    aliases: ["TESLA"],
    routeName: "High Beta Expansion",
    defaultBias: "Expansion risk",
    defaultNote: "TSLA offers higher-beta single-name movement for route qualification and paper-only testing.",
    defaultConfidence: "71%",
    demoLast: 186.52
  },
  {
    symbol: "BTC/USD",
    providerSymbol: "BTC/USD",
    label: "Bitcoin / US Dollar",
    assetClass: "Crypto",
    aliases: ["BTCUSD", "BTC"],
    routeName: "Crypto Breakout",
    defaultBias: "Breakout compression",
    defaultNote: "Bitcoin remains a high-liquidity crypto route with strong live-candle utility.",
    defaultConfidence: "73%",
    demoLast: 68240
  },
  {
    symbol: "ETH/USD",
    providerSymbol: "ETH/USD",
    label: "Ethereum / US Dollar",
    assetClass: "Crypto",
    aliases: ["ETHUSD", "ETH"],
    routeName: "Crypto Rotation",
    defaultBias: "Relative-strength rotation",
    defaultNote: "Ethereum provides a second crypto lane with smoother rotation behavior than BTC.",
    defaultConfidence: "72%",
    demoLast: 3524
  },
  {
    symbol: "XAU/USD",
    providerSymbol: "XAU/USD",
    label: "Gold / US Dollar",
    assetClass: "Metals",
    aliases: ["XAUUSD", "GOLD"],
    routeName: "Metal Reversion",
    defaultBias: "Protected reversion",
    defaultNote: "Gold remains a tactical metals lane with lower conviction than core FX and index flow.",
    defaultConfidence: "68%",
    demoLast: 2348.6
  }
];

const timeframeCatalog = [
  {
    key: "1m",
    label: "1m",
    providerInterval: "1min",
    defaultOutputsize: 42,
    candleFreshMs: 3 * 60 * 1000
  },
  {
    key: "5m",
    label: "5m",
    providerInterval: "5min",
    defaultOutputsize: 48,
    candleFreshMs: 12 * 60 * 1000
  },
  {
    key: "15m",
    label: "15m",
    providerInterval: "15min",
    defaultOutputsize: 56,
    candleFreshMs: 35 * 60 * 1000
  },
  {
    key: "1h",
    label: "1h",
    providerInterval: "1h",
    defaultOutputsize: 48,
    candleFreshMs: 2.5 * 60 * 60 * 1000
  },
  {
    key: "4h",
    label: "4h",
    providerInterval: "4h",
    defaultOutputsize: 40,
    candleFreshMs: 7 * 60 * 60 * 1000
  },
  {
    key: "1D",
    label: "1D",
    providerInterval: "1day",
    defaultOutputsize: 32,
    candleFreshMs: 36 * 60 * 60 * 1000
  }
];

function normalizeLookup(value = "") {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseConfidence(value, fallback = 72) {
  const parsed = Number.parseFloat(String(value || fallback).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(50, Math.min(97, Math.round(parsed))) : fallback;
}

function buildAliases(entry) {
  return [
    entry.symbol,
    entry.providerSymbol,
    entry.label,
    entry.assetClass,
    ...(entry.aliases || [])
  ];
}

export function getLiveMarketCatalog() {
  return instrumentCatalog;
}

export function getDefaultLiveTimeframe() {
  return "15m";
}

export function getLiveTimeframeCatalog() {
  return timeframeCatalog;
}

export function resolveLiveTimeframe(timeframeKey = getDefaultLiveTimeframe()) {
  return timeframeCatalog.find((item) => item.key === timeframeKey || item.label === timeframeKey) || timeframeCatalog[2];
}

export function resolveProviderMapping(symbol, providerKey = "twelve-data") {
  const lookup = normalizeLookup(symbol);
  const found = instrumentCatalog.find((entry) =>
    buildAliases(entry).some((alias) => normalizeLookup(alias) === lookup)
  );

  const entry = found || {
    symbol,
    providerSymbol: symbol,
    label: symbol,
    assetClass: "Unsupported",
    aliases: [],
    routeName: "Ad Hoc Route",
    defaultBias: "Monitoring",
    defaultNote: `${symbol} is not yet registered in the current product symbol catalog.`,
    defaultConfidence: "60%",
    demoLast: 100
  };

  return {
    providerKey,
    symbol: entry.symbol,
    providerSymbol: entry.providerSymbol,
    label: entry.label,
    assetClass: entry.assetClass,
    aliases: entry.aliases || [],
    routeName: entry.routeName,
    defaultBias: entry.defaultBias,
    defaultNote: entry.defaultNote,
    defaultConfidence: entry.defaultConfidence,
    demoLast: entry.demoLast,
    supported: Boolean(found),
    mappingState: entry.providerSymbol === entry.symbol ? "Native" : "Mapped"
  };
}

export function describeProviderCoverage(symbol, providerKey = "twelve-data") {
  const mapping = resolveProviderMapping(symbol, providerKey);

  if (!mapping.supported) {
    return {
      ...mapping,
      supportState: "Unsupported",
      tone: "danger",
      capabilitySummary: "This symbol is not registered in the current Trading Pro Max live catalog.",
      coverageLimit: "Search is limited to supported FX, crypto, stocks, ETFs, metals, and mapped index-style instruments."
    };
  }

  if (mapping.assetClass === "Index Proxy" || mapping.mappingState === "Mapped") {
    return {
      ...mapping,
      supportState: "Partially Supported",
      tone: "warning",
      capabilitySummary: `Read-only provider coverage is available via ${mapping.providerSymbol}.`,
      coverageLimit: "Direct native index connectivity is not enabled in the current commercial bridge; proxy quotes and candles are used instead."
    };
  }

  return {
    ...mapping,
    supportState: "Supported",
    tone: "success",
    capabilitySummary: `Read-only quotes and candles are supported through ${mapping.providerSymbol}.`,
    coverageLimit: "Coverage is limited to supported read-only symbol polling inside the current live-data layer."
  };
}

export function mergeRuntimeSymbols(baseSymbols = [], trackedSymbols = []) {
  const ordered = [...baseSymbols, ...trackedSymbols];
  const seen = new Set();

  return ordered
    .map((item) => resolveProviderMapping(item).symbol)
    .filter(Boolean)
    .filter((symbol) => {
      const key = normalizeLookup(symbol);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function searchSupportedInstruments(query = "", { limit = 8, prioritySymbols = [] } = {}) {
  const normalizedQuery = normalizeLookup(query);
  const ranked = instrumentCatalog
    .map((entry) => {
      const aliases = buildAliases(entry);
      const score = !normalizedQuery
        ? prioritySymbols.includes(entry.symbol)
          ? 100
          : 10
        : aliases.reduce((best, alias) => {
            const normalizedAlias = normalizeLookup(alias);
            if (normalizedAlias === normalizedQuery) return Math.max(best, 100);
            if (normalizedAlias.startsWith(normalizedQuery)) return Math.max(best, 88);
            if (normalizedAlias.includes(normalizedQuery)) return Math.max(best, 74);
            return best;
          }, 0);

      return {
        ...resolveProviderMapping(entry.symbol),
        score
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return parseConfidence(right.defaultConfidence) - parseConfidence(left.defaultConfidence);
    });

  return ranked.slice(0, limit);
}
