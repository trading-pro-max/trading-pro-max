import {
  describeCryptoCoreSymbolSupport,
  getCryptoCoreContract,
  getCryptoCoreGroupDefinitions,
  getCryptoCoreSymbolCatalog,
  resolveCryptoCoreSymbol
} from "../../lib/tpm-crypto-core-contract.mjs";

const standardInstrumentCatalog = [
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

const standardInstrumentGroupCatalog = [
  {
    key: "fx",
    label: "FX",
    aliases: ["FOREX", "FX", "MAJORS", "LONDON"],
    assetClasses: ["Forex"]
  },
  {
    key: "index-proxy",
    label: "Index Proxies",
    aliases: ["INDEX", "INDICES", "PROXY", "NASDAQ", "QQQ"],
    assetClasses: ["Index Proxy"]
  },
  {
    key: "us-equities",
    label: "US Equities",
    aliases: ["EQUITY", "EQUITIES", "ETF", "STOCKS", "US"],
    assetClasses: ["Equity", "Equity ETF"]
  },
  {
    key: "metals",
    label: "Metals",
    aliases: ["METALS", "GOLD", "SAFEHAVEN"],
    assetClasses: ["Metals"]
  }
];

const cryptoGroupCatalog = getCryptoCoreGroupDefinitions();
const standardGroupByAssetClass = new Map(
  standardInstrumentGroupCatalog.flatMap((group) =>
    group.assetClasses.map((assetClass) => [assetClass, group])
  )
);
const cryptoGroupByKey = new Map(cryptoGroupCatalog.map((group) => [group.key, group]));

function normalizeLookup(value = "") {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function uniqueStrings(values = [], normalizer = (value) => String(value || "").trim()) {
  const seen = new Set();
  const source = Array.isArray(values) ? values : [values];

  return source.reduce((result, value) => {
    const label = String(value || "").trim();
    if (!label) return result;

    const key = normalizer(label);
    if (!key || seen.has(key)) return result;

    seen.add(key);
    result.push(label);
    return result;
  }, []);
}

function parseConfidence(value, fallback = 72) {
  const parsed = Number.parseFloat(String(value || fallback).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(50, Math.min(97, Math.round(parsed))) : fallback;
}

function buildStandardGrouping(entry = {}) {
  const group = standardGroupByAssetClass.get(entry.assetClass) || {
    key: "cross-asset",
    label: "Cross Asset",
    aliases: ["CROSSASSET", "MIXED"],
    assetClasses: []
  };

  return {
    marketKey: group.key,
    marketLabel: group.label,
    groupKeys: [group.key],
    groupLabels: [group.label],
    groupAliases: uniqueStrings(group.aliases || [], normalizeLookup)
  };
}

function buildResolvedInstrumentEntry(entry = {}) {
  const isCrypto = entry.marketKey === getCryptoCoreContract().marketKey;
  const grouping = isCrypto
    ? {
        marketKey: entry.marketKey,
        marketLabel: "Crypto Core",
        groupKeys: entry.groupKeys || [],
        groupLabels: entry.groupLabels || [],
        groupAliases: uniqueStrings(
          (entry.groupKeys || []).flatMap((groupKey) => cryptoGroupByKey.get(groupKey)?.aliases || []),
          normalizeLookup
        )
      }
    : buildStandardGrouping(entry);

  const lookupAliases = uniqueStrings(
    [
      entry.symbol,
      entry.providerSymbol,
      entry.label,
      entry.baseAsset,
      ...(entry.aliases || [])
    ],
    normalizeLookup
  );
  const searchAliases = uniqueStrings(
    [
      ...lookupAliases,
      entry.assetClass,
      grouping.marketLabel,
      entry.quoteConventionLabel,
      ...(grouping.groupLabels || []),
      ...(grouping.groupAliases || []),
      ...(entry.watchlistTags || [])
    ],
    normalizeLookup
  );

  return {
    ...entry,
    ...grouping,
    aliases: uniqueStrings(entry.aliases || [], normalizeLookup),
    lookupAliases,
    searchAliases,
    watchlistTags: uniqueStrings(entry.watchlistTags || [], normalizeLookup),
    providerMode: entry.providerMode || "optional-read-only",
    paperSafeExecution:
      entry.paperSafeExecution === undefined ? true : Boolean(entry.paperSafeExecution),
    liveExchangeConnectivityEnabled: Boolean(entry.liveExchangeConnectivityEnabled),
    realMoneyExecutionEnabled: Boolean(entry.realMoneyExecutionEnabled)
  };
}

const resolvedInstrumentCatalog = [...standardInstrumentCatalog, ...getCryptoCoreSymbolCatalog()].map(
  buildResolvedInstrumentEntry
);

function buildSearchBuckets(entry = {}) {
  return [
    {
      source: "symbol",
      terms: uniqueStrings([entry.symbol, entry.providerSymbol], normalizeLookup),
      exact: 128,
      prefix: 112,
      contains: 92
    },
    {
      source: "alias",
      terms: uniqueStrings(
        entry.lookupAliases.filter(
          (alias) =>
            normalizeLookup(alias) !== normalizeLookup(entry.symbol) &&
            normalizeLookup(alias) !== normalizeLookup(entry.providerSymbol)
        ),
        normalizeLookup
      ),
      exact: 118,
      prefix: 102,
      contains: 84
    },
    {
      source: "label",
      terms: uniqueStrings([entry.label], normalizeLookup),
      exact: 96,
      prefix: 84,
      contains: 72
    },
    {
      source: "group",
      terms: uniqueStrings([...(entry.groupLabels || []), ...(entry.groupAliases || [])], normalizeLookup),
      exact: 92,
      prefix: 80,
      contains: 68
    },
    {
      source: "tag",
      terms: uniqueStrings(entry.watchlistTags || [], normalizeLookup),
      exact: 88,
      prefix: 76,
      contains: 64
    },
    {
      source: "category",
      terms: uniqueStrings([entry.assetClass, entry.marketLabel, entry.quoteConventionLabel], normalizeLookup),
      exact: 82,
      prefix: 70,
      contains: 58
    }
  ];
}

function findBestSearchMatch(entry, normalizedQuery = "", prioritySymbols = []) {
  const priorityHit = prioritySymbols.some(
    (symbol) => normalizeLookup(symbol) === normalizeLookup(entry.symbol)
  );

  if (!normalizedQuery) {
    return {
      score: priorityHit ? 100 : 12,
      matchSource: priorityHit ? "priority" : "catalog",
      matchType: priorityHit ? "priority" : "default",
      matchLabel: entry.symbol
    };
  }

  let bestMatch = {
    score: 0,
    matchSource: "",
    matchType: "",
    matchLabel: ""
  };

  buildSearchBuckets(entry).forEach((bucket) => {
    bucket.terms.forEach((term) => {
      const normalizedTerm = normalizeLookup(term);
      if (!normalizedTerm) return;

      if (normalizedTerm === normalizedQuery && bucket.exact > bestMatch.score) {
        bestMatch = {
          score: bucket.exact,
          matchSource: bucket.source,
          matchType: "exact",
          matchLabel: term
        };
        return;
      }

      if (normalizedTerm.startsWith(normalizedQuery) && bucket.prefix > bestMatch.score) {
        bestMatch = {
          score: bucket.prefix,
          matchSource: bucket.source,
          matchType: "prefix",
          matchLabel: term
        };
        return;
      }

      if (normalizedTerm.includes(normalizedQuery) && bucket.contains > bestMatch.score) {
        bestMatch = {
          score: bucket.contains,
          matchSource: bucket.source,
          matchType: "contains",
          matchLabel: term
        };
      }
    });
  });

  if (!bestMatch.score) return bestMatch;

  return {
    ...bestMatch,
    score: bestMatch.score + (priorityHit ? 4 : 0)
  };
}

function isCryptoLikeUnsupportedQuery(symbol = "") {
  const value = String(symbol || "").trim().toUpperCase();
  if (!value) return false;

  return /\/USD$/.test(value) || /USD$/.test(normalizeLookup(value));
}

function buildUnsupportedMapping(symbol = "") {
  return {
    providerKey: "twelve-data",
    symbol,
    providerSymbol: symbol,
    label: symbol,
    assetClass: "Unsupported",
    aliases: [],
    routeName: "Ad Hoc Route",
    defaultBias: "Monitoring",
    defaultNote: `${symbol} is not yet registered in the current product symbol catalog.`,
    defaultConfidence: "60%",
    demoLast: 100,
    marketKey: "unsupported",
    marketLabel: "Unsupported",
    groupKeys: [],
    groupLabels: [],
    watchlistTags: [],
    quoteConventionKey: "",
    quoteConventionLabel: "",
    providerMode: "unsupported",
    paperSafeExecution: false,
    liveExchangeConnectivityEnabled: false,
    realMoneyExecutionEnabled: false,
    supported: false,
    mappingState: "Unsupported"
  };
}

function resolveSupportedInstrumentEntry(symbol = "") {
  const cryptoEntry = resolveCryptoCoreSymbol(symbol);
  if (cryptoEntry) {
    return resolvedInstrumentCatalog.find(
      (entry) => normalizeLookup(entry.symbol) === normalizeLookup(cryptoEntry.symbol)
    ) || null;
  }

  const lookup = normalizeLookup(symbol);
  if (!lookup) return null;

  return (
    resolvedInstrumentCatalog.find((entry) =>
      entry.lookupAliases.some((alias) => normalizeLookup(alias) === lookup)
    ) || null
  );
}

function buildSelectionGrouping(mappings = []) {
  const marketMap = new Map();
  const assetClassMap = new Map();
  const cryptoGroupMap = new Map();
  const cryptoWatchlistTagMap = new Map();

  mappings.forEach((mapping) => {
    const marketKey = mapping.marketKey || "cross-asset";
    const marketLabel = mapping.marketLabel || mapping.assetClass || "Cross Asset";
    const existingMarket = marketMap.get(marketKey) || {
      key: marketKey,
      label: marketLabel,
      symbols: []
    };

    existingMarket.symbols = uniqueStrings(
      [...existingMarket.symbols, mapping.symbol],
      normalizeLookup
    );
    marketMap.set(marketKey, existingMarket);

    if (mapping.assetClass) {
      assetClassMap.set(mapping.assetClass, mapping.assetClass);
    }

    if (mapping.marketKey === getCryptoCoreContract().marketKey) {
      (mapping.groupKeys || []).forEach((groupKey, index) => {
        const label = mapping.groupLabels?.[index] || cryptoGroupByKey.get(groupKey)?.label || groupKey;
        const existingGroup = cryptoGroupMap.get(groupKey) || {
          key: groupKey,
          label,
          symbols: []
        };
        existingGroup.symbols = uniqueStrings(
          [...existingGroup.symbols, mapping.symbol],
          normalizeLookup
        );
        cryptoGroupMap.set(groupKey, existingGroup);
      });

      (mapping.watchlistTags || []).forEach((tag) => {
        cryptoWatchlistTagMap.set(tag, tag);
      });
    }
  });

  const markets = Array.from(marketMap.values()).sort((left, right) => {
    if (right.symbols.length !== left.symbols.length) return right.symbols.length - left.symbols.length;
    return left.label.localeCompare(right.label);
  });
  const cryptoGroups = Array.from(cryptoGroupMap.values()).sort((left, right) => {
    if (right.symbols.length !== left.symbols.length) return right.symbols.length - left.symbols.length;
    return left.label.localeCompare(right.label);
  });

  return {
    markets,
    marketKeys: markets.map((market) => market.key),
    marketLabels: markets.map((market) => market.label),
    assetClasses: Array.from(assetClassMap.values()).sort((left, right) => left.localeCompare(right)),
    cryptoGroups,
    cryptoGroupKeys: cryptoGroups.map((group) => group.key),
    cryptoGroupLabels: cryptoGroups.map((group) => group.label),
    cryptoWatchlistTags: Array.from(cryptoWatchlistTagMap.values()).sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

export function getLiveMarketCatalog() {
  return resolvedInstrumentCatalog.map((entry) => ({ ...entry }));
}

export function getCryptoCoreMarketContract() {
  return getCryptoCoreContract();
}

export function getCryptoInstrumentCatalog() {
  return resolvedInstrumentCatalog
    .filter((entry) => entry.marketKey === getCryptoCoreContract().marketKey)
    .map((entry) => ({ ...entry }));
}

export function getCryptoInstrumentGroups() {
  return cryptoGroupCatalog.map((group) => ({ ...group }));
}

export function getSupportedInstrumentGroupCatalog() {
  return [
    ...standardInstrumentGroupCatalog.map((group) => ({
      key: group.key,
      label: group.label,
      aliases: [...group.aliases],
      marketKey: group.key,
      assetClasses: [...group.assetClasses]
    })),
    ...cryptoGroupCatalog.map((group) => ({
      key: group.key,
      label: group.label,
      aliases: [...(group.aliases || [])],
      marketKey: getCryptoCoreContract().marketKey,
      assetClasses: ["Crypto"]
    }))
  ];
}

export function getDefaultLiveTimeframe() {
  return "15m";
}

export function getLiveTimeframeCatalog() {
  return timeframeCatalog;
}

export function resolveLiveTimeframe(timeframeKey = getDefaultLiveTimeframe()) {
  return (
    timeframeCatalog.find((item) => item.key === timeframeKey || item.label === timeframeKey) ||
    timeframeCatalog[2]
  );
}

export function resolveProviderMapping(symbol, providerKey = "twelve-data") {
  const found = resolveSupportedInstrumentEntry(symbol);
  const entry = found || buildUnsupportedMapping(symbol);

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
    marketKey: entry.marketKey || "cross-asset",
    marketLabel: entry.marketLabel || entry.assetClass || "Cross Asset",
    groupKeys: entry.groupKeys || [],
    groupLabels: entry.groupLabels || [],
    watchlistTags: entry.watchlistTags || [],
    quoteConventionKey: entry.quoteConventionKey || "",
    quoteConventionLabel: entry.quoteConventionLabel || "",
    providerMode: entry.providerMode || "optional-read-only",
    paperSafeExecution: Boolean(entry.paperSafeExecution),
    liveExchangeConnectivityEnabled: Boolean(entry.liveExchangeConnectivityEnabled),
    realMoneyExecutionEnabled: Boolean(entry.realMoneyExecutionEnabled),
    supported: Boolean(found),
    mappingState: !found ? "Unsupported" : entry.providerSymbol === entry.symbol ? "Native" : "Mapped"
  };
}

export function describeProviderCoverage(symbol, providerKey = "twelve-data") {
  const mapping = resolveProviderMapping(symbol, providerKey);

  if (!mapping.supported) {
    if (isCryptoLikeUnsupportedQuery(symbol)) {
      const cryptoSupport = describeCryptoCoreSymbolSupport(symbol);

      return {
        ...mapping,
        assetClass: cryptoSupport.assetClass,
        marketKey: cryptoSupport.marketKey,
        marketLabel: "Crypto Core",
        supportState: cryptoSupport.supportState,
        tone: "danger",
        capabilitySummary: cryptoSupport.capabilitySummary,
        coverageLimit: cryptoSupport.coverageLimit
      };
    }

    return {
      ...mapping,
      supportState: "Unsupported",
      tone: "danger",
      capabilitySummary: "This symbol is not registered in the current Trading Pro Max live catalog.",
      coverageLimit:
        "Search is limited to supported FX, crypto, stocks, ETFs, metals, and mapped index-style instruments."
    };
  }

  if (mapping.assetClass === "Crypto") {
    return {
      ...mapping,
      supportState: "Supported",
      tone: "success",
      capabilitySummary: `Optional read-only quotes and candles are supported through ${mapping.providerSymbol}.`,
      coverageLimit:
        "Crypto Core stays local-first: demo data remains the default, Twelve Data stays optional read-only only, and execution stays paper-only."
    };
  }

  if (mapping.assetClass === "Index Proxy" || mapping.mappingState === "Mapped") {
    return {
      ...mapping,
      supportState: "Partially Supported",
      tone: "warning",
      capabilitySummary: `Read-only provider coverage is available via ${mapping.providerSymbol}.`,
      coverageLimit:
        "Direct native index connectivity is not enabled in the current commercial bridge; proxy quotes and candles are used instead."
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

export function searchSupportedInstruments(
  query = "",
  { limit = 8, prioritySymbols = [], marketKey = "", groupKey = "" } = {}
) {
  const normalizedQuery = normalizeLookup(query);
  const ranked = resolvedInstrumentCatalog
    .filter((entry) => (!marketKey ? true : entry.marketKey === marketKey))
    .filter((entry) => (!groupKey ? true : (entry.groupKeys || []).includes(groupKey)))
    .map((entry) => {
      const match = findBestSearchMatch(entry, normalizedQuery, prioritySymbols);

      return {
        ...resolveProviderMapping(entry.symbol),
        searchScore: match.score,
        matchSource: match.matchSource,
        matchType: match.matchType,
        matchLabel: match.matchLabel
      };
    })
    .filter((item) => item.searchScore > 0)
    .sort((left, right) => {
      if (right.searchScore !== left.searchScore) return right.searchScore - left.searchScore;
      return parseConfidence(right.defaultConfidence) - parseConfidence(left.defaultConfidence);
    });

  return ranked.slice(0, limit);
}

export function searchCryptoSupportedInstruments(query = "", options = {}) {
  return searchSupportedInstruments(query, {
    ...options,
    marketKey: getCryptoCoreContract().marketKey
  });
}

export function groupSupportedInstruments(symbols = []) {
  const supportedMappings = uniqueStrings(symbols, normalizeLookup)
    .map((symbol) => resolveProviderMapping(symbol))
    .filter((mapping) => mapping.supported);
  const grouping = buildSelectionGrouping(supportedMappings);

  return {
    supportedSymbols: supportedMappings.map((mapping) => mapping.symbol),
    supportedCount: supportedMappings.length,
    ...grouping
  };
}

export function analyzeInstrumentSelection(symbols = [], { fallbackSymbols = [] } = {}) {
  const requestedSymbols = uniqueStrings(
    Array.isArray(symbols) && symbols.length ? symbols : fallbackSymbols,
    normalizeLookup
  );
  const requestedMappings = requestedSymbols.map((symbol) => ({
    requestedSymbol: symbol,
    mapping: resolveProviderMapping(symbol)
  }));
  const supportedMappings = uniqueStrings(
    requestedMappings
      .filter((item) => item.mapping.supported)
      .map((item) => item.mapping.symbol),
    normalizeLookup
  ).map((symbol) => resolveProviderMapping(symbol));
  const unsupportedSymbols = requestedMappings
    .filter((item) => !item.mapping.supported)
    .map((item) => item.requestedSymbol);
  const grouping = buildSelectionGrouping(supportedMappings);
  const cryptoSymbolCount = supportedMappings.filter(
    (item) => item.marketKey === getCryptoCoreContract().marketKey
  ).length;

  let boardType = "standard";
  if (!supportedMappings.length) {
    boardType = "unsupported";
  } else if (cryptoSymbolCount && cryptoSymbolCount === supportedMappings.length) {
    boardType = "crypto-first";
  } else if (cryptoSymbolCount || grouping.assetClasses.length > 1 || grouping.marketKeys.length > 1) {
    boardType = "mixed-cross-asset";
  } else if (supportedMappings.length === 1) {
    boardType = "single-market";
  }

  const supportState = unsupportedSymbols.length
    ? supportedMappings.length
      ? "Partially Supported"
      : "Unsupported"
    : "Supported";
  const primaryMarket = grouping.markets[0] || null;

  return {
    requestedSymbols,
    supportedSymbols: supportedMappings.map((mapping) => mapping.symbol),
    unsupportedSymbols,
    supportedCount: supportedMappings.length,
    unsupportedCount: unsupportedSymbols.length,
    supportState,
    boardType,
    primarySymbol: supportedMappings[0]?.symbol || "",
    primaryMarketKey: primaryMarket?.key || "",
    primaryMarketLabel: primaryMarket?.label || "",
    marketKeys: grouping.marketKeys,
    marketLabels: grouping.marketLabels,
    assetClasses: grouping.assetClasses,
    cryptoSymbolCount,
    cryptoGroupKeys: grouping.cryptoGroupKeys,
    cryptoGroupLabels: grouping.cryptoGroupLabels,
    cryptoWatchlistTags: grouping.cryptoWatchlistTags,
    markets: grouping.markets,
    cryptoGroups: grouping.cryptoGroups,
    summary: supportState === "Unsupported"
      ? "No supported symbols remain in the current Trading Pro Max catalog."
      : unsupportedSymbols.length
        ? `${supportedMappings.length} supported and ${unsupportedSymbols.length} unsupported symbol requests were detected.`
        : `${supportedMappings.length} supported symbols aligned into ${grouping.marketLabels.join(", ") || "the current desk"}.`
  };
}
