const TPM_CRYPTO_CORE_MARKET_KEY = "crypto-core";
const TPM_CRYPTO_CORE_VERSION = "v1";

const CRYPTO_CORE_QUOTE_CONVENTIONS_V1 = [
  {
    key: "usd-spot",
    label: "USD Spot Quote",
    quoteAsset: "USD",
    providerFormat: "BASE/USD",
    providerMode: "optional-read-only",
    description: "Crypto Core quotes are normalized to BASE/USD for local demo data and optional read-only provider polling.",
    liveExchangeConnectivityEnabled: false,
    realMoneyExecutionEnabled: false,
    paperSafeExecution: true
  }
];

const CRYPTO_CORE_WATCHLIST_TAGS_V1 = [
  {
    key: "crypto",
    label: "Crypto",
    summary: "General Crypto Core coverage inside the local product desk."
  },
  {
    key: "crypto-majors",
    label: "Crypto Majors",
    summary: "Primary liquidity lanes for Crypto Core scanning and paper execution review."
  },
  {
    key: "layer-1",
    label: "Layer 1",
    summary: "Layer-1 market structure and relative-strength tracking."
  },
  {
    key: "rotation",
    label: "Crypto Rotation",
    summary: "Rotation-focused crypto market sets for structure and momentum handoff."
  },
  {
    key: "weekend-liquidity",
    label: "Weekend Liquidity",
    summary: "Liquidity-aware crypto monitoring for off-hours and weekend desk flow."
  },
  {
    key: "paper-safe",
    label: "Paper Safe",
    summary: "Confirms the desk stays in local paper-only execution mode."
  }
];

const CRYPTO_CORE_GROUP_DEFINITIONS_V1 = [
  {
    key: "crypto-core",
    label: "Crypto Core",
    aliases: ["CRYPTOCORE", "CRYPTO"],
    watchlistTagKeys: ["crypto", "paper-safe"],
    summary: "First-class crypto market intake for the local Trading Pro Max desk."
  },
  {
    key: "majors",
    label: "Crypto Majors",
    aliases: ["MAJORS", "BTCETH"],
    watchlistTagKeys: ["crypto-majors", "rotation"],
    summary: "High-liquidity crypto leaders used for the primary desk context."
  },
  {
    key: "rotation",
    label: "Crypto Rotation",
    aliases: ["ROTATION", "ROTATE", "MOMENTUM"],
    watchlistTagKeys: ["rotation"],
    summary: "Relative-strength and rotational crypto group coverage for majors and higher-beta follow-through."
  },
  {
    key: "layer-1",
    label: "Layer 1",
    aliases: ["LAYER1", "L1"],
    watchlistTagKeys: ["layer-1", "rotation"],
    summary: "Layer-1 smart-contract platforms used for rotation and structural follow-through."
  },
  {
    key: "payments",
    label: "Payments",
    aliases: ["PAYMENTS", "TRANSFER"],
    watchlistTagKeys: ["crypto", "rotation"],
    summary: "Payment-network crypto symbols used for alternate relative-strength tracking."
  },
  {
    key: "weekend-liquidity",
    label: "Weekend Liquidity",
    aliases: ["WEEKEND", "LIQUIDITY"],
    watchlistTagKeys: ["weekend-liquidity", "paper-safe"],
    summary: "Weekend and off-hours liquidity coverage for the crypto desk."
  }
];

const CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1 = {
  executionProviderKey: "paper",
  mode: "paper-only",
  venue: "local-paper-engine",
  liveExchangeConnectivityEnabled: false,
  realMoneyExecutionEnabled: false,
  paperSafeExecution: true,
  description:
    "Crypto Core routes may be staged and reviewed through the local paper execution engine only. No live exchange connectivity or real-money execution is enabled."
};

const CRYPTO_CORE_SYMBOL_UNIVERSE_V1 = [
  {
    key: "btc-usd",
    symbol: "BTC/USD",
    providerSymbol: "BTC/USD",
    label: "Bitcoin / US Dollar",
    assetClass: "Crypto",
    baseAsset: "BTC",
    quoteAsset: "USD",
    quoteConventionKey: "usd-spot",
    aliases: ["BTCUSD", "BTC", "XBT", "XBTUSD"],
    groupKeys: ["crypto-core", "majors", "rotation", "weekend-liquidity"],
    routeName: "Crypto Breakout",
    defaultBias: "Breakout compression",
    defaultNote: "Bitcoin remains the lead Crypto Core liquidity lane for breakout structure and paper-safe route staging.",
    defaultConfidence: "73%",
    demoLast: 68240
  },
  {
    key: "eth-usd",
    symbol: "ETH/USD",
    providerSymbol: "ETH/USD",
    label: "Ethereum / US Dollar",
    assetClass: "Crypto",
    baseAsset: "ETH",
    quoteAsset: "USD",
    quoteConventionKey: "usd-spot",
    aliases: ["ETHUSD", "ETH"],
    groupKeys: ["crypto-core", "majors", "layer-1", "rotation", "weekend-liquidity"],
    routeName: "Crypto Rotation",
    defaultBias: "Relative-strength rotation",
    defaultNote: "Ethereum anchors Crypto Core rotation and layer-1 follow-through inside the local desk.",
    defaultConfidence: "72%",
    demoLast: 3524
  },
  {
    key: "sol-usd",
    symbol: "SOL/USD",
    providerSymbol: "SOL/USD",
    label: "Solana / US Dollar",
    assetClass: "Crypto",
    baseAsset: "SOL",
    quoteAsset: "USD",
    quoteConventionKey: "usd-spot",
    aliases: ["SOLUSD", "SOL"],
    groupKeys: ["crypto-core", "layer-1", "rotation", "weekend-liquidity"],
    routeName: "Layer-1 Acceleration",
    defaultBias: "Momentum expansion",
    defaultNote: "Solana provides the faster-beta layer-1 lane for Crypto Core structure and liquidity rotation.",
    defaultConfidence: "70%",
    demoLast: 154.28
  },
  {
    key: "avax-usd",
    symbol: "AVAX/USD",
    providerSymbol: "AVAX/USD",
    label: "Avalanche / US Dollar",
    assetClass: "Crypto",
    baseAsset: "AVAX",
    quoteAsset: "USD",
    quoteConventionKey: "usd-spot",
    aliases: ["AVAXUSD", "AVAX"],
    groupKeys: ["crypto-core", "layer-1", "rotation"],
    routeName: "Layer-1 Rotation",
    defaultBias: "Rotation squeeze",
    defaultNote: "Avalanche adds a second layer-1 momentum lane for Crypto Core rotation scanning.",
    defaultConfidence: "67%",
    demoLast: 38.64
  },
  {
    key: "ada-usd",
    symbol: "ADA/USD",
    providerSymbol: "ADA/USD",
    label: "Cardano / US Dollar",
    assetClass: "Crypto",
    baseAsset: "ADA",
    quoteAsset: "USD",
    quoteConventionKey: "usd-spot",
    aliases: ["ADAUSD", "ADA"],
    groupKeys: ["crypto-core", "layer-1", "rotation"],
    routeName: "Layer-1 Compression",
    defaultBias: "Compression build",
    defaultNote: "Cardano is tracked as a slower layer-1 structure lane for Crypto Core comparison and review.",
    defaultConfidence: "64%",
    demoLast: 0.72
  },
  {
    key: "xrp-usd",
    symbol: "XRP/USD",
    providerSymbol: "XRP/USD",
    label: "XRP / US Dollar",
    assetClass: "Crypto",
    baseAsset: "XRP",
    quoteAsset: "USD",
    quoteConventionKey: "usd-spot",
    aliases: ["XRPUSD", "XRP"],
    groupKeys: ["crypto-core", "payments", "rotation"],
    routeName: "Payments Rotation",
    defaultBias: "Relative-strength watch",
    defaultNote: "XRP extends Crypto Core into a payments-style lane for relative-strength review and handoff.",
    defaultConfidence: "65%",
    demoLast: 0.64
  }
];

function normalizeCryptoLookup(value = "") {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function uniqueValues(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function parseConfidence(value, fallback = 70) {
  const parsed = Number.parseFloat(String(value || fallback).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(50, Math.min(97, Math.round(parsed))) : fallback;
}

const quoteConventionMap = new Map(CRYPTO_CORE_QUOTE_CONVENTIONS_V1.map((item) => [item.key, item]));
const watchlistTagMap = new Map(CRYPTO_CORE_WATCHLIST_TAGS_V1.map((item) => [item.key, item]));
const groupDefinitionMap = new Map(CRYPTO_CORE_GROUP_DEFINITIONS_V1.map((item) => [item.key, item]));

function buildWatchlistTags(groupKeys = [], preferredTagKeys = []) {
  const tagKeys = new Set(["crypto", "paper-safe"]);

  groupKeys.forEach((groupKey) => {
    const group = groupDefinitionMap.get(groupKey);
    (group?.watchlistTagKeys || []).forEach((tagKey) => tagKeys.add(tagKey));
  });

  preferredTagKeys.forEach((tagKey) => {
    if (watchlistTagMap.has(tagKey)) tagKeys.add(tagKey);
  });

  return CRYPTO_CORE_WATCHLIST_TAGS_V1.filter((tag) => tagKeys.has(tag.key)).map((tag) => tag.label);
}

const resolvedCryptoSymbolCatalog = CRYPTO_CORE_SYMBOL_UNIVERSE_V1.map((entry) => {
  const quoteConvention = quoteConventionMap.get(entry.quoteConventionKey) || CRYPTO_CORE_QUOTE_CONVENTIONS_V1[0];
  const groups = (entry.groupKeys || []).map((groupKey) => groupDefinitionMap.get(groupKey)).filter(Boolean);
  const watchlistTags = buildWatchlistTags(entry.groupKeys);
  const lookupAliases = uniqueValues([
    entry.symbol,
    entry.providerSymbol,
    entry.label,
    entry.baseAsset,
    entry.quoteAsset,
    ...(entry.aliases || [])
  ]);
  const searchAliases = uniqueValues([
    ...lookupAliases,
    entry.assetClass,
    quoteConvention.label,
    ...groups.map((group) => group.label),
    ...groups.flatMap((group) => group.aliases || []),
    ...watchlistTags
  ]);

  return {
    ...entry,
    marketKey: TPM_CRYPTO_CORE_MARKET_KEY,
    version: TPM_CRYPTO_CORE_VERSION,
    groupLabels: groups.map((group) => group.label),
    quoteConvention,
    quoteConventionLabel: quoteConvention.label,
    providerMode: quoteConvention.providerMode,
    watchlistTags,
    paperSafeExecution: CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1.paperSafeExecution,
    liveExchangeConnectivityEnabled: CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1.liveExchangeConnectivityEnabled,
    realMoneyExecutionEnabled: CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1.realMoneyExecutionEnabled,
    executionProviderKey: CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1.executionProviderKey,
    executionMode: CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1.mode,
    lookupAliases,
    searchAliases
  };
});

function scoreSearchAlias(searchAliases = [], normalizedQuery = "") {
  if (!normalizedQuery) return 10;

  return searchAliases.reduce((best, alias) => {
    const normalizedAlias = normalizeCryptoLookup(alias);
    if (normalizedAlias === normalizedQuery) return Math.max(best, 100);
    if (normalizedAlias.startsWith(normalizedQuery)) return Math.max(best, 88);
    if (normalizedAlias.includes(normalizedQuery)) return Math.max(best, 74);
    return best;
  }, 0);
}

export function getCryptoCorePaperExecutionFlags() {
  return {
    ...CRYPTO_CORE_PAPER_EXECUTION_FLAGS_V1
  };
}

export function getCryptoCoreGroupDefinitions() {
  return CRYPTO_CORE_GROUP_DEFINITIONS_V1.map((group) => ({
    ...group,
    watchlistTags: (group.watchlistTagKeys || [])
      .map((tagKey) => watchlistTagMap.get(tagKey)?.label)
      .filter(Boolean)
  }));
}

export function getCryptoCoreWatchlistTagCatalog() {
  return CRYPTO_CORE_WATCHLIST_TAGS_V1.map((tag) => ({ ...tag }));
}

export function getCryptoCoreSymbolCatalog() {
  return resolvedCryptoSymbolCatalog.map((entry) => ({ ...entry }));
}

export function getCryptoCorePrimarySymbols() {
  return resolvedCryptoSymbolCatalog
    .filter((entry) => entry.groupKeys.includes("majors"))
    .map((entry) => entry.symbol);
}

export function getCryptoCoreContract() {
  return {
    marketKey: TPM_CRYPTO_CORE_MARKET_KEY,
    version: TPM_CRYPTO_CORE_VERSION,
    localOnly: true,
    zeroCostFirst: true,
    paperSafe: true,
    liveExchangeConnectivityEnabled: false,
    realMoneyExecutionEnabled: false,
    quoteConventions: CRYPTO_CORE_QUOTE_CONVENTIONS_V1.map((item) => ({ ...item })),
    groups: getCryptoCoreGroupDefinitions(),
    watchlistTags: getCryptoCoreWatchlistTagCatalog(),
    paperExecution: getCryptoCorePaperExecutionFlags(),
    symbols: getCryptoCoreSymbolCatalog()
  };
}

export function resolveCryptoCoreSymbol(value = "") {
  const lookup = normalizeCryptoLookup(value);
  if (!lookup) return null;

  return resolvedCryptoSymbolCatalog.find((entry) =>
    entry.lookupAliases.some((alias) => normalizeCryptoLookup(alias) === lookup)
  ) || null;
}

export function isCryptoCoreSymbol(value = "") {
  return Boolean(resolveCryptoCoreSymbol(value));
}

export function searchCryptoCoreSymbols(query = "", { limit = 8, groupKey = "" } = {}) {
  const normalizedQuery = normalizeCryptoLookup(query);
  const ranked = resolvedCryptoSymbolCatalog
    .filter((entry) => !groupKey || entry.groupKeys.includes(groupKey))
    .map((entry) => ({
      ...entry,
      searchScore: scoreSearchAlias(entry.searchAliases, normalizedQuery)
    }))
    .filter((entry) => entry.searchScore > 0)
    .sort((left, right) => {
      if (right.searchScore !== left.searchScore) return right.searchScore - left.searchScore;
      return parseConfidence(right.defaultConfidence) - parseConfidence(left.defaultConfidence);
    });

  return ranked.slice(0, limit).map((entry) => ({ ...entry }));
}

export function getCryptoCoreWatchlistTagsForSymbols(symbols = [], preferredTagKeys = []) {
  const matched = uniqueValues(symbols)
    .map((symbol) => resolveCryptoCoreSymbol(symbol))
    .filter(Boolean);

  if (!matched.length) return [];

  const groupKeys = Array.from(new Set(matched.flatMap((entry) => entry.groupKeys || [])));
  return buildWatchlistTags(groupKeys, preferredTagKeys);
}

export function describeCryptoCoreSymbolSupport(symbol = "") {
  const entry = resolveCryptoCoreSymbol(symbol);

  if (!entry) {
    return {
      marketKey: TPM_CRYPTO_CORE_MARKET_KEY,
      version: TPM_CRYPTO_CORE_VERSION,
      symbol,
      assetClass: "Crypto",
      supported: false,
      supportState: "Unsupported",
      providerMode: "unsupported",
      liveExchangeConnectivityEnabled: false,
      realMoneyExecutionEnabled: false,
      paperSafeExecution: true,
      capabilitySummary: "This symbol is not registered in the local Crypto Core v1 symbol universe.",
      coverageLimit: "Crypto Core only exposes supported local demo symbols and optional read-only provider mappings."
    };
  }

  return {
    ...entry,
    supported: true,
    supportState: "Supported",
    capabilitySummary: `Optional read-only quotes and candles are supported through ${entry.providerSymbol}.`,
    coverageLimit:
      "Crypto Core stays local-first: demo data remains the default, optional read-only provider polling is allowed, and execution stays paper-only."
  };
}
