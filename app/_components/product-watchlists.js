"use client";

import {
  getCryptoCorePrimarySymbols,
  getCryptoCoreWatchlistTagsForSymbols
} from "../../lib/tpm-crypto-core-contract.mjs";
import { analyzeInstrumentSelection, resolveProviderMapping } from "./product-live-market";

function sanitizeName(name, fallback = "New Watchlist") {
  const value = String(name || "").trim();
  return value || fallback;
}

function normalizeTagValue(tag = "") {
  return String(tag || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTagKey(tag = "") {
  return normalizeTagValue(tag).toLowerCase();
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

function nowStamp() {
  return new Date().toISOString();
}

function normalizeDensityMode(value, fallback = "Comfortable") {
  return ["Compact", "Comfortable", "Spacious"].includes(value) ? value : fallback;
}

function normalizeRequestedSymbols(symbols = [], fallbackSymbols = []) {
  const preferredSource = Array.isArray(symbols) && symbols.length ? symbols : fallbackSymbols;
  return uniqueStrings(preferredSource, (value) =>
    String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  );
}

function analyzeWatchlistSymbols(symbols = [], fallbackSymbols = []) {
  const requestedSymbols = normalizeRequestedSymbols(symbols, fallbackSymbols);
  const analysis = analyzeInstrumentSelection(requestedSymbols, { fallbackSymbols });
  const preferredCryptoTagKeys = analysis.boardType === "crypto-first" ? ["rotation"] : [];
  const derivedCryptoTags = analysis.cryptoSymbolCount
    ? getCryptoCoreWatchlistTagsForSymbols(analysis.supportedSymbols, preferredCryptoTagKeys)
    : [];

  return {
    ...analysis,
    requestedSymbols,
    supportedSymbols: analysis.supportedSymbols,
    derivedCryptoTags
  };
}

function getWatchlistDefaultTimeframe(board = {}) {
  if (board.boardType === "crypto-first") return "1h";
  if (board.cryptoSymbolCount) return "1h";
  return "15m";
}

function getWatchlistDefaultRoute(symbol = "") {
  return String(resolveProviderMapping(symbol).routeName || "").trim();
}

function buildWatchlistMarketProfile(board = {}) {
  return {
    boardType: board.boardType || "standard",
    supportState: board.supportState || "Supported",
    primaryMarketKey: board.primaryMarketKey || "",
    primaryMarketLabel: board.primaryMarketLabel || "",
    marketKeys: board.marketKeys || [],
    marketLabels: board.marketLabels || [],
    assetClasses: board.assetClasses || [],
    cryptoSymbolCount: board.cryptoSymbolCount || 0,
    cryptoGroupKeys: board.cryptoGroupKeys || [],
    cryptoGroupLabels: board.cryptoGroupLabels || [],
    requestedSymbols: board.requestedSymbols || [],
    unsupportedSymbols: board.unsupportedSymbols || [],
    summary: board.summary || ""
  };
}

export function normalizeWatchlistTags(tags = []) {
  const source = Array.isArray(tags) ? tags : String(tags || "").split(",");
  const seen = new Set();

  return source
    .map((tag) => normalizeTagValue(tag))
    .filter((tag) => {
      if (!tag) return false;
      const key = normalizeTagKey(tag);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function normalizeWatchlistNotes(notes = "") {
  return String(notes || "").trim().slice(0, 480);
}

export function normalizeSessionIntent(intent = "") {
  return String(intent || "").trim().slice(0, 120);
}

export function buildWatchlistPresetFromRuntime(runtime = {}, symbols = [], options = {}) {
  const board = analyzeWatchlistSymbols(symbols, options.fallbackSymbols || []);
  const scopedSymbols = board.supportedSymbols;
  const mappedPreferredSymbol = runtime.preferredSymbol ? resolveProviderMapping(runtime.preferredSymbol).symbol : "";
  const selectedSymbol = runtime.selectedSymbol ? resolveProviderMapping(runtime.selectedSymbol).symbol : "";
  const preferredSymbol =
    scopedSymbols.includes(mappedPreferredSymbol)
      ? mappedPreferredSymbol
      : scopedSymbols.includes(selectedSymbol)
        ? selectedSymbol
        : scopedSymbols[0] || "";
  const defaultTimeframe = options.defaultTimeframe || getWatchlistDefaultTimeframe(board);

  return {
    preferredSymbol,
    preferredRoute:
      String(runtime.preferredRoute || runtime.selectedRouteName || "").trim() ||
      getWatchlistDefaultRoute(preferredSymbol),
    preferredTimeframe:
      String(runtime.chartTimeframe || runtime.preferredTimeframe || defaultTimeframe).trim() ||
      defaultTimeframe,
    preferredDensityMode: normalizeDensityMode(
      runtime.densityMode || runtime.preferredDensityMode || options.defaultDensityMode
    )
  };
}

function normalizeWatchlistPreset(preset = {}, symbols = [], options = {}) {
  const board = analyzeWatchlistSymbols(symbols, options.fallbackSymbols || []);
  const scopedSymbols = board.supportedSymbols;
  const defaultTimeframe = options.defaultTimeframe || getWatchlistDefaultTimeframe(board);
  const defaultDensityMode = options.defaultDensityMode || "Comfortable";
  const normalized = buildWatchlistPresetFromRuntime(
    {
      preferredSymbol: preset.preferredSymbol,
      preferredRoute: preset.preferredRoute,
      chartTimeframe: preset.preferredTimeframe || defaultTimeframe,
      densityMode: preset.preferredDensityMode || defaultDensityMode
    },
    scopedSymbols,
    {
      defaultTimeframe,
      defaultDensityMode
    }
  );
  const preferredSymbol = scopedSymbols.includes(normalized.preferredSymbol)
    ? normalized.preferredSymbol
    : scopedSymbols[0] || "";

  return {
    ...normalized,
    preferredSymbol,
    preferredRoute:
      String(normalized.preferredRoute || options.defaultRoute || "").trim() ||
      getWatchlistDefaultRoute(preferredSymbol),
    preferredTimeframe: normalized.preferredTimeframe || defaultTimeframe
  };
}

function watchlistComparisonKey(name = "") {
  return sanitizeName(name, "").toLowerCase();
}

function presetSignature(preset = {}, symbols = []) {
  return JSON.stringify(normalizeWatchlistPreset(preset, symbols));
}

function comparableWatchlistSignature(watchlist = {}) {
  const board = analyzeWatchlistSymbols(
    watchlist.requestedSymbols || watchlist.symbols || [],
    watchlist.symbols || []
  );

  return JSON.stringify({
    name: watchlistComparisonKey(watchlist.name),
    requestedSymbols: board.requestedSymbols,
    symbols: board.supportedSymbols,
    unsupportedSymbols: board.unsupportedSymbols,
    boardType: board.boardType,
    preset: normalizeWatchlistPreset(watchlist.preset, board.supportedSymbols),
    notes: normalizeWatchlistNotes(watchlist.notes),
    sessionTags: normalizeWatchlistTags(watchlist.sessionTags),
    sessionIntent: normalizeSessionIntent(watchlist.sessionIntent)
  });
}

export function summarizeWatchlistPreset(watchlist = {}) {
  const preset = watchlist?.preset || {};
  return [
    preset.preferredSymbol ? `Symbol ${preset.preferredSymbol}` : "No symbol preset",
    preset.preferredRoute ? `Route ${preset.preferredRoute}` : "No route preset",
    preset.preferredTimeframe ? `TF ${preset.preferredTimeframe}` : "No timeframe preset",
    preset.preferredDensityMode ? preset.preferredDensityMode : "No density preset"
  ];
}

export function summarizeWatchlistContext(watchlist = {}) {
  const notes = normalizeWatchlistNotes(watchlist?.notes);
  const sessionTags = normalizeWatchlistTags(watchlist?.sessionTags);
  const sessionIntent = normalizeSessionIntent(watchlist?.sessionIntent);

  return {
    notes,
    notesPreview: notes ? `${notes.slice(0, 120)}${notes.length > 120 ? "..." : ""}` : "No local watchlist note saved yet.",
    sessionTags,
    sessionIntent,
    intentPreview: sessionIntent || "No session intent saved yet.",
    hasContext: Boolean(notes || sessionTags.length || sessionIntent)
  };
}

export function buildSavedWatchlistRecord(name, symbols = [], options = {}) {
  const board = analyzeWatchlistSymbols(symbols, options.fallbackSymbols || []);
  const normalizedSymbols = board.supportedSymbols;
  const manualTags = normalizeWatchlistTags(options.sessionTags || options.tags);
  const mergedSessionTags = normalizeWatchlistTags([...manualTags, ...(board.derivedCryptoTags || [])]);
  const id =
    options.id ||
    `watch-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

  return {
    id,
    name: sanitizeName(name, options.fallbackName || "New Watchlist"),
    symbols: normalizedSymbols,
    requestedSymbols: board.requestedSymbols,
    unsupportedSymbols: board.unsupportedSymbols,
    supportState: board.supportState,
    boardType: board.boardType,
    primaryMarketKey: board.primaryMarketKey,
    primaryMarketLabel: board.primaryMarketLabel,
    marketProfile: buildWatchlistMarketProfile(board),
    pinned: Boolean(options.pinned),
    preset: normalizeWatchlistPreset(options.preset, normalizedSymbols, options),
    notes: normalizeWatchlistNotes(options.notes),
    sessionTags: mergedSessionTags,
    sessionIntent: normalizeSessionIntent(options.sessionIntent || options.intent),
    createdAt: options.createdAt || nowStamp(),
    updatedAt: options.updatedAt || nowStamp()
  };
}

function buildWatchlistTemplate(template = {}) {
  const watchlist = buildSavedWatchlistRecord(template.name, template.requestedSymbols || template.symbols, {
    fallbackName: template.name || "Template",
    preset: template.preset,
    notes: template.notes,
    sessionTags: template.sessionTags,
    sessionIntent: template.sessionIntent
  });

  return {
    key: template.key,
    name: watchlist.name,
    symbols: watchlist.symbols,
    requestedSymbols: watchlist.requestedSymbols,
    unsupportedSymbols: watchlist.unsupportedSymbols,
    supportState: watchlist.supportState,
    boardType: watchlist.boardType,
    marketProfile: watchlist.marketProfile,
    preset: watchlist.preset,
    notes: watchlist.notes,
    sessionTags: watchlist.sessionTags,
    sessionIntent: watchlist.sessionIntent,
    summary: template.summary || "Reusable local operator template.",
    pinned: Boolean(template.pinned)
  };
}

export function getSavedWatchlistTemplates() {
  const cryptoRotationSymbols = ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"];
  const cryptoMajorsSymbols = ["BTC/USD", "ETH/USD", "SOL/USD"];
  const mixedCryptoBoardSymbols = ["BTC/USD", "ETH/USD", "NASDAQ", "SPY", "EUR/USD", "XAU/USD"];

  return [
    buildWatchlistTemplate({
      key: "fx-session-handshake",
      name: "FX Session Handshake",
      symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
      preset: {
        preferredSymbol: "EUR/USD",
        preferredRoute: "FX Focus",
        preferredTimeframe: "15m",
        preferredDensityMode: "Compact"
      },
      sessionTags: ["FX", "London", "Trend"],
      sessionIntent: "Session Bias Check",
      notes: "Quick FX read for London and crossover structure before deeper route qualification.",
      summary: "Fast FX market set for session-bias confirmation and short-cycle paper execution review."
    }),
    buildWatchlistTemplate({
      key: "us-momentum-board",
      name: "US Momentum Board",
      requestedSymbols: ["NASDAQ", "SPY", "QQQ", "AAPL", "TSLA"],
      preset: {
        preferredSymbol: "NASDAQ",
        preferredRoute: "Growth Tape",
        preferredTimeframe: "1h",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: ["US Session", "Momentum"],
      sessionIntent: "Open Drive Review",
      notes: "Track index leadership, large-cap rotation, and open-drive participation in one local set.",
      summary: "High-focus US session template for momentum and index leadership review."
    }),
    buildWatchlistTemplate({
      key: "crypto-rotation-desk",
      name: "Crypto Rotation Desk",
      symbols: cryptoRotationSymbols,
      preset: {
        preferredSymbol: "BTC/USD",
        preferredRoute: "Breakout Compression",
        preferredTimeframe: "1h",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: getCryptoCoreWatchlistTagsForSymbols(cryptoRotationSymbols, ["rotation", "weekend-liquidity"]),
      sessionIntent: "Weekend Liquidity Scan",
      notes: "Local crypto rotation board for structure, volatility compression, and replay review.",
      summary: "Compact crypto template for rotation and liquidity-driven structure checks."
    }),
    buildWatchlistTemplate({
      key: "crypto-majors-handshake",
      name: "Crypto Majors Handshake",
      symbols: cryptoMajorsSymbols,
      preset: {
        preferredSymbol: "BTC/USD",
        preferredRoute: "Crypto Breakout",
        preferredTimeframe: "1h",
        preferredDensityMode: "Compact"
      },
      sessionTags: getCryptoCoreWatchlistTagsForSymbols(cryptoMajorsSymbols, ["rotation"]),
      sessionIntent: "Majors Structure Check",
      notes: "Crypto-first majors board for fast lead-lag structure confirmation before deeper route work.",
      summary: "Lean crypto majors template for quick structure and alias-safe symbol switching."
    }),
    buildWatchlistTemplate({
      key: "cross-asset-crypto-bridge",
      name: "Cross-Asset Crypto Bridge",
      symbols: mixedCryptoBoardSymbols,
      preset: {
        preferredSymbol: "BTC/USD",
        preferredRoute: "Cross-Asset Bridge",
        preferredTimeframe: "1h",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: ["Cross-Asset", ...getCryptoCoreWatchlistTagsForSymbols(["BTC/USD", "ETH/USD"], ["rotation"])],
      sessionIntent: "Bridge Risk Scan",
      notes: "Mixed board for tracking crypto leadership alongside index, FX, and metals posture.",
      summary: "Mixed cross-asset board linking Crypto Core to the broader daily desk."
    }),
    buildWatchlistTemplate({
      key: "defense-and-metals",
      name: "Defense And Metals",
      symbols: ["XAU/USD", "SPY", "EUR/USD"],
      preset: {
        preferredSymbol: "XAU/USD",
        preferredRoute: "Reversion Filter",
        preferredTimeframe: "15m",
        preferredDensityMode: "Spacious"
      },
      sessionTags: ["Defense", "Risk-Off"],
      sessionIntent: "Protection Sweep",
      notes: "Use when protection posture matters more than expansion and the desk needs defensive replay context.",
      summary: "Defensive market-set template aligned with protection-first review."
    })
  ];
}

export function resolveWatchlistTemplate(templateKey) {
  return getSavedWatchlistTemplates().find((template) => template.key === templateKey) || null;
}

export function createSeedSavedWatchlists(fallbackSymbols = []) {
  const [leadCryptoSymbol = "BTC/USD"] = getCryptoCorePrimarySymbols();
  const fallbackAnalysis = analyzeWatchlistSymbols(
    fallbackSymbols,
    ["EUR/USD", "NASDAQ", leadCryptoSymbol, "XAU/USD"]
  );
  const fallback = fallbackAnalysis.supportedSymbols;

  return [
    buildSavedWatchlistRecord("Core Live Board", fallback, {
      id: "watch-core-live-board",
      pinned: true,
      preset: {
        preferredSymbol: fallback[0] || "EUR/USD",
        preferredRoute: "Core Live Board",
        preferredTimeframe: fallbackAnalysis.cryptoSymbolCount ? "1h" : "15m",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: ["Core", "Cross-Asset"],
      sessionIntent: "Primary Desk Sweep",
      notes: "Primary local watchlist for the main live-safe cross-asset rotation."
    }),
    buildSavedWatchlistRecord("FX Focus", ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"], {
      id: "watch-fx-focus",
      preset: {
        preferredSymbol: "EUR/USD",
        preferredRoute: "FX Focus",
        preferredTimeframe: "15m",
        preferredDensityMode: "Compact"
      },
      sessionTags: ["FX", "London"],
      sessionIntent: "Session Bias Check",
      notes: "Lean FX rotation board for fast session bias checks and paper execution review."
    }),
    buildSavedWatchlistRecord("Growth Tape", ["NASDAQ", "SPY", "AAPL", "TSLA", leadCryptoSymbol], {
      id: "watch-growth-tape",
      preset: {
        preferredSymbol: "NASDAQ",
        preferredRoute: "Growth Tape",
        preferredTimeframe: "1h",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: ["Momentum", "US Session"],
      sessionIntent: "Leadership Scan",
      notes: "Higher-beta market set for growth, index, and crypto momentum monitoring."
    }),
    buildSavedWatchlistRecord("Crypto Core Majors", ["BTC/USD", "ETH/USD", "SOL/USD"], {
      id: "watch-crypto-core-majors",
      preset: {
        preferredSymbol: "BTC/USD",
        preferredRoute: "Crypto Breakout",
        preferredTimeframe: "1h",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: ["Crypto Core", "Rotation"],
      sessionIntent: "Majors Liquidity Sweep",
      notes: "Crypto-first majors board for daily structure, liquidity, and paper-safe route review."
    })
  ];
}

export function normalizeSavedWatchlists(savedWatchlists = [], fallbackSymbols = []) {
  const seeded = createSeedSavedWatchlists(fallbackSymbols);
  const source = Array.isArray(savedWatchlists) && savedWatchlists.length ? savedWatchlists : seeded;
  const seenIds = new Set();

  const normalized = source
    .map((item, index) =>
      buildSavedWatchlistRecord(
        item?.name,
        item?.requestedSymbols || item?.symbols || fallbackSymbols,
        {
          id: item?.id || `watch-seeded-${index + 1}`,
          pinned: item?.pinned,
          preset: item?.preset,
          notes: item?.notes,
          sessionTags: item?.sessionTags,
          sessionIntent: item?.sessionIntent,
          createdAt: item?.createdAt,
          updatedAt: item?.updatedAt,
          fallbackName: `Watchlist ${index + 1}`,
          fallbackSymbols
        }
      )
    )
    .filter((item) => {
      if (!item.symbols.length) return false;
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

  const withFallback = normalized.length ? normalized : seeded;

  return withFallback.sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    if (left.boardType !== right.boardType) {
      if (left.boardType === "crypto-first") return -1;
      if (right.boardType === "crypto-first") return 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export function deriveActiveSavedWatchlist(savedWatchlists = [], activeWatchlistId, fallbackSymbols = []) {
  const normalized = normalizeSavedWatchlists(savedWatchlists, fallbackSymbols);
  const active =
    normalized.find((item) => item.id === activeWatchlistId) ||
    normalized.find((item) => item.pinned) ||
    normalized[0];

  return {
    savedWatchlists: normalized,
    activeWatchlist: active,
    activeWatchlistId: active?.id || "",
    activeMarketProfile: active?.marketProfile || null
  };
}

export function exportSavedWatchlistsPayload(savedWatchlists = []) {
  return {
    product: "Trading Pro Max",
    kind: "saved-watchlists",
    version: "local-watchlists-v4",
    exportedAt: nowStamp(),
    watchlists: (savedWatchlists || []).map((item) => {
      const record = buildSavedWatchlistRecord(
        item?.name,
        item?.requestedSymbols || item?.symbols || [],
        {
          id: item?.id,
          pinned: item?.pinned,
          preset: item?.preset,
          notes: item?.notes,
          sessionTags: item?.sessionTags,
          sessionIntent: item?.sessionIntent,
          createdAt: item?.createdAt,
          updatedAt: item?.updatedAt
        }
      );

      return {
        id: record.id,
        name: record.name,
        requestedSymbols: record.requestedSymbols,
        symbols: record.symbols,
        unsupportedSymbols: record.unsupportedSymbols,
        supportState: record.supportState,
        boardType: record.boardType,
        marketProfile: record.marketProfile,
        pinned: Boolean(record.pinned),
        preset: normalizeWatchlistPreset(record.preset, record.symbols),
        notes: normalizeWatchlistNotes(record.notes),
        sessionTags: normalizeWatchlistTags(record.sessionTags),
        sessionIntent: normalizeSessionIntent(record.sessionIntent),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };
    })
  };
}

export function importSavedWatchlistsPayload(payload, fallbackSymbols = []) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.watchlists)
      ? payload.watchlists
      : [];
  const seenIds = new Set();

  return source
    .map((item, index) =>
      buildSavedWatchlistRecord(
        item?.name,
        item?.requestedSymbols || item?.symbols || fallbackSymbols,
        {
          id: item?.id || `watch-imported-${index + 1}`,
          pinned: item?.pinned,
          preset: item?.preset,
          notes: item?.notes,
          sessionTags: item?.sessionTags,
          sessionIntent: item?.sessionIntent,
          createdAt: item?.createdAt,
          updatedAt: item?.updatedAt,
          fallbackName: `Imported Watchlist ${index + 1}`,
          fallbackSymbols
        }
      )
    )
    .filter((item) => {
      if (!item.symbols.length) return false;
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
}

function mergeRequestedSymbols(existing = [], incoming = []) {
  return uniqueStrings(
    [...(existing || []), ...(incoming || [])],
    (value) => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  );
}

function buildMergedWatchlist(existing, incoming) {
  return buildSavedWatchlistRecord(
    existing.name || incoming.name,
    mergeRequestedSymbols(
      existing.requestedSymbols || existing.symbols || [],
      incoming.requestedSymbols || incoming.symbols || []
    ),
    {
      id: existing.id,
      pinned: existing.pinned || incoming.pinned,
      preset: {
        ...existing.preset,
        ...incoming.preset
      },
      notes: normalizeWatchlistNotes(incoming.notes || existing.notes),
      sessionTags: normalizeWatchlistTags([...(existing.sessionTags || []), ...(incoming.sessionTags || [])]),
      sessionIntent: normalizeSessionIntent(incoming.sessionIntent || existing.sessionIntent),
      createdAt: existing.createdAt,
      updatedAt: nowStamp()
    }
  );
}

export function previewSavedWatchlistImport(currentSavedWatchlists = [], importedPayload, fallbackSymbols = []) {
  const rawEntries = Array.isArray(importedPayload)
    ? importedPayload
    : Array.isArray(importedPayload?.watchlists)
      ? importedPayload.watchlists
      : [];
  const existing = normalizeSavedWatchlists(currentSavedWatchlists, fallbackSymbols);
  const incoming = importSavedWatchlistsPayload(importedPayload, fallbackSymbols);
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const existingByName = new Map(existing.map((item) => [watchlistComparisonKey(item.name), item]));
  const entries = incoming.map((item) => {
    const byId = existingById.get(item.id);
    const byName = existingByName.get(watchlistComparisonKey(item.name));
    const existingMatch = byId || byName || null;
    const duplicateName = Boolean(byName && byName.id !== item.id);
    const conflictingPreset = existingMatch
      ? presetSignature(existingMatch.preset, existingMatch.symbols) !==
        presetSignature(item.preset, item.symbols)
      : false;
    const conflictingContext = existingMatch
      ? normalizeWatchlistNotes(existingMatch.notes) !== normalizeWatchlistNotes(item.notes) ||
        JSON.stringify(normalizeWatchlistTags(existingMatch.sessionTags)) !==
          JSON.stringify(normalizeWatchlistTags(item.sessionTags)) ||
        normalizeSessionIntent(existingMatch.sessionIntent) !== normalizeSessionIntent(item.sessionIntent)
      : false;
    const sameAsExisting = existingMatch
      ? comparableWatchlistSignature(existingMatch) === comparableWatchlistSignature(item) &&
        Boolean(existingMatch.pinned) === Boolean(item.pinned)
      : false;
    const action = !existingMatch ? "add" : sameAsExisting ? "skip" : "merge";
    const summary =
      item.unsupportedSymbols.length
        ? `${item.unsupportedSymbols.length} unsupported symbol request${
            item.unsupportedSymbols.length === 1 ? "" : "s"
          } will stay excluded from runtime execution.`
        : action === "add"
          ? "New local watchlist will be added."
          : action === "skip"
            ? "Exact local duplicate will be skipped."
            : conflictingPreset
              ? "Existing watchlist will be merged and its preset refreshed."
              : conflictingContext
                ? "Existing watchlist will be merged and its local context updated."
                : "Existing watchlist will be merged with any new symbols.";

    return {
      id: item.id,
      name: item.name,
      action,
      summary,
      duplicateName,
      conflictingPreset,
      conflictingContext,
      existingName: existingMatch?.name || "",
      symbols: item.symbols,
      requestedSymbols: item.requestedSymbols,
      unsupportedSymbols: item.unsupportedSymbols,
      supportState: item.supportState,
      boardType: item.boardType,
      marketProfile: item.marketProfile,
      preset: item.preset,
      notes: item.notes,
      sessionTags: item.sessionTags,
      sessionIntent: item.sessionIntent
    };
  });

  return {
    rawCount: rawEntries.length,
    validCount: incoming.length,
    invalidCount: Math.max(0, rawEntries.length - incoming.length),
    newCount: entries.filter((item) => item.action === "add").length,
    mergeCount: entries.filter((item) => item.action === "merge").length,
    skipCount: entries.filter((item) => item.action === "skip").length,
    unsupportedSymbolCount: entries.reduce(
      (total, item) => total + (item.unsupportedSymbols?.length || 0),
      0
    ),
    partialSupportCount: entries.filter((item) => item.supportState === "Partially Supported").length,
    duplicateNames: entries.filter((item) => item.duplicateName).map((item) => item.name),
    conflictingPresets: entries.filter((item) => item.conflictingPreset).map((item) => item.name),
    entries
  };
}

export function resolveSavedWatchlistImport(currentSavedWatchlists = [], importedPayload, fallbackSymbols = []) {
  const existing = normalizeSavedWatchlists(currentSavedWatchlists, fallbackSymbols);
  const preview = previewSavedWatchlistImport(existing, importedPayload, fallbackSymbols);
  const incoming = importSavedWatchlistsPayload(importedPayload, fallbackSymbols);
  const merged = new Map(existing.map((item) => [item.id, item]));
  const byName = new Map(existing.map((item) => [watchlistComparisonKey(item.name), item]));

  incoming.forEach((item) => {
    const entry = preview.entries.find((candidate) => candidate.id === item.id && candidate.name === item.name);
    if (!entry || entry.action === "skip") return;

    const existingById = merged.get(item.id);
    const existingByName = byName.get(watchlistComparisonKey(item.name));
    const existingMatch = existingById || existingByName;

    if (!existingMatch) {
      merged.set(item.id, item);
      byName.set(watchlistComparisonKey(item.name), item);
      return;
    }

    const mergedRecord = buildMergedWatchlist(existingMatch, item);
    merged.set(existingMatch.id, mergedRecord);
    byName.set(watchlistComparisonKey(mergedRecord.name), mergedRecord);
  });

  return {
    watchlists: normalizeSavedWatchlists(Array.from(merged.values()), fallbackSymbols),
    preview
  };
}
