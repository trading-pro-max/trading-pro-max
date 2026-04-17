"use client";

import { mergeRuntimeSymbols, resolveProviderMapping } from "./product-live-market";

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

function supportedSymbols(symbols = [], fallbackSymbols = []) {
  return mergeRuntimeSymbols(symbols, fallbackSymbols).filter((symbol) => resolveProviderMapping(symbol).supported);
}

function nowStamp() {
  return new Date().toISOString();
}

function normalizeDensityMode(value, fallback = "Comfortable") {
  return ["Compact", "Comfortable", "Spacious"].includes(value) ? value : fallback;
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
    .slice(0, 6);
}

export function normalizeWatchlistNotes(notes = "") {
  return String(notes || "").trim().slice(0, 480);
}

export function normalizeSessionIntent(intent = "") {
  return String(intent || "").trim().slice(0, 120);
}

export function buildWatchlistPresetFromRuntime(runtime = {}, symbols = []) {
  const scopedSymbols = supportedSymbols(symbols, []);
  const mappedPreferredSymbol = runtime.preferredSymbol ? resolveProviderMapping(runtime.preferredSymbol).symbol : "";
  const selectedSymbol = runtime.selectedSymbol ? resolveProviderMapping(runtime.selectedSymbol).symbol : "";
  const preferredSymbol =
    scopedSymbols.includes(mappedPreferredSymbol)
      ? mappedPreferredSymbol
      : scopedSymbols.includes(selectedSymbol)
        ? selectedSymbol
        : scopedSymbols[0] || "";

  return {
    preferredSymbol,
    preferredRoute: String(runtime.preferredRoute || runtime.selectedRouteName || "").trim(),
    preferredTimeframe: String(runtime.chartTimeframe || runtime.preferredTimeframe || "15m").trim() || "15m",
    preferredDensityMode: normalizeDensityMode(runtime.densityMode || runtime.preferredDensityMode)
  };
}

function normalizeWatchlistPreset(preset = {}, symbols = [], options = {}) {
  const scopedSymbols = supportedSymbols(symbols, []);
  const normalized = buildWatchlistPresetFromRuntime(
    {
      preferredSymbol: preset.preferredSymbol,
      preferredRoute: preset.preferredRoute,
      chartTimeframe: preset.preferredTimeframe || options.defaultTimeframe || "15m",
      densityMode: preset.preferredDensityMode || options.defaultDensityMode || "Comfortable"
    },
    scopedSymbols
  );

  return {
    ...normalized,
    preferredSymbol: scopedSymbols.includes(normalized.preferredSymbol) ? normalized.preferredSymbol : scopedSymbols[0] || ""
  };
}

function watchlistComparisonKey(name = "") {
  return sanitizeName(name, "").toLowerCase();
}

function presetSignature(preset = {}, symbols = []) {
  return JSON.stringify(normalizeWatchlistPreset(preset, symbols));
}

function comparableWatchlistSignature(watchlist = {}) {
  return JSON.stringify({
    name: watchlistComparisonKey(watchlist.name),
    symbols: supportedSymbols(watchlist.symbols || [], []).sort(),
    preset: normalizeWatchlistPreset(watchlist.preset, watchlist.symbols || []),
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
  const normalizedSymbols = supportedSymbols(symbols, []);
  const id =
    options.id ||
    `watch-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

  return {
    id,
    name: sanitizeName(name, options.fallbackName || "New Watchlist"),
    symbols: normalizedSymbols,
    pinned: Boolean(options.pinned),
    preset: normalizeWatchlistPreset(options.preset, normalizedSymbols, options),
    notes: normalizeWatchlistNotes(options.notes),
    sessionTags: normalizeWatchlistTags(options.sessionTags || options.tags),
    sessionIntent: normalizeSessionIntent(options.sessionIntent || options.intent),
    createdAt: options.createdAt || nowStamp(),
    updatedAt: options.updatedAt || nowStamp()
  };
}

function buildWatchlistTemplate(template = {}) {
  const watchlist = buildSavedWatchlistRecord(template.name, template.symbols, {
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
    preset: watchlist.preset,
    notes: watchlist.notes,
    sessionTags: watchlist.sessionTags,
    sessionIntent: watchlist.sessionIntent,
    summary: template.summary || "Reusable local operator template.",
    pinned: Boolean(template.pinned)
  };
}

export function getSavedWatchlistTemplates() {
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
      symbols: ["NASDAQ", "SPY", "QQQ", "AAPL", "TSLA"],
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
      symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
      preset: {
        preferredSymbol: "BTC/USD",
        preferredRoute: "Breakout Compression",
        preferredTimeframe: "1h",
        preferredDensityMode: "Comfortable"
      },
      sessionTags: ["Crypto", "Rotation"],
      sessionIntent: "Weekend Liquidity Scan",
      notes: "Local crypto rotation board for structure, volatility compression, and replay review.",
      summary: "Compact crypto template for rotation and liquidity-driven structure checks."
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
  const fallback = supportedSymbols(fallbackSymbols, ["EUR/USD", "NASDAQ", "BTC/USD", "XAU/USD"]);

  return [
    buildSavedWatchlistRecord("Core Live Board", fallback, {
      id: "watch-core-live-board",
      pinned: true,
      preset: {
        preferredSymbol: fallback[0] || "EUR/USD",
        preferredRoute: "Core Live Board",
        preferredTimeframe: "15m",
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
    buildSavedWatchlistRecord("Growth Tape", ["NASDAQ", "SPY", "AAPL", "TSLA", "BTC/USD"], {
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
    })
  ];
}

export function normalizeSavedWatchlists(savedWatchlists = [], fallbackSymbols = []) {
  const seeded = createSeedSavedWatchlists(fallbackSymbols);
  const source = Array.isArray(savedWatchlists) && savedWatchlists.length ? savedWatchlists : seeded;
  const seenIds = new Set();

  const normalized = source
    .map((item, index) =>
      buildSavedWatchlistRecord(item?.name, item?.symbols || fallbackSymbols, {
        id: item?.id || `watch-seeded-${index + 1}`,
        pinned: item?.pinned,
        preset: item?.preset,
        notes: item?.notes,
        sessionTags: item?.sessionTags,
        sessionIntent: item?.sessionIntent,
        createdAt: item?.createdAt,
        updatedAt: item?.updatedAt,
        fallbackName: `Watchlist ${index + 1}`
      })
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
    activeWatchlistId: active?.id || ""
  };
}

export function exportSavedWatchlistsPayload(savedWatchlists = []) {
  return {
    product: "Trading Pro Max",
    kind: "saved-watchlists",
    version: "local-watchlists-v3",
    exportedAt: nowStamp(),
    watchlists: (savedWatchlists || []).map((item) => ({
      id: item.id,
      name: item.name,
      symbols: item.symbols || [],
      pinned: Boolean(item.pinned),
      preset: normalizeWatchlistPreset(item.preset, item.symbols || []),
      notes: normalizeWatchlistNotes(item.notes),
      sessionTags: normalizeWatchlistTags(item.sessionTags),
      sessionIntent: normalizeSessionIntent(item.sessionIntent),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
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
      buildSavedWatchlistRecord(item?.name, item?.symbols || fallbackSymbols, {
        id: item?.id || `watch-imported-${index + 1}`,
        pinned: item?.pinned,
        preset: item?.preset,
        notes: item?.notes,
        sessionTags: item?.sessionTags,
        sessionIntent: item?.sessionIntent,
        createdAt: item?.createdAt,
        updatedAt: item?.updatedAt,
        fallbackName: `Imported Watchlist ${index + 1}`
      })
    )
    .filter((item) => {
      if (!item.symbols.length) return false;
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
}

function buildMergedWatchlist(existing, incoming) {
  return buildSavedWatchlistRecord(existing.name || incoming.name, mergeRuntimeSymbols(existing.symbols || [], incoming.symbols || []), {
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
  });
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
      ? presetSignature(existingMatch.preset, existingMatch.symbols) !== presetSignature(item.preset, item.symbols)
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
      action === "add"
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
