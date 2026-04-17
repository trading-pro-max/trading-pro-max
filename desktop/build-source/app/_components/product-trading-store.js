"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  buildAutonomyDiagnostics,
  buildControlledAlerts,
  buildConnectorReadiness,
  buildEvaluationModel,
  buildGuardedActions,
  buildOperatorReports,
  buildOperatorPolicy,
  buildRecommendationLoop,
  buildRuntimeTrendSummary,
  buildRuntimeSignals,
  createRuntimeTrendSnapshot,
  mergeRuntimeTrendHistory
} from "./product-autonomy";
import { buildExecutionStatus, getDefaultExecutionProvider, getExecutionProviderCatalog, runExecutionAction } from "./product-execution";
import {
  buildLiveDataSnapshot,
  fetchLiveDataAdapterSnapshot,
  getLiveChartTimeframes,
  getDefaultLiveDataSource,
  getLiveDataProviderCatalog
} from "./product-live-data";
import { buildLiveChartOverlayModel } from "./product-live-chart";
import {
  getDefaultLiveTimeframe,
  mergeRuntimeSymbols,
  resolveLiveTimeframe,
  resolveProviderMapping
} from "./product-live-market";
import {
  buildSavedWatchlistRecord,
  buildWatchlistPresetFromRuntime,
  deriveActiveSavedWatchlist,
  getSavedWatchlistTemplates,
  normalizeSavedWatchlists,
  normalizeWatchlistNotes,
  normalizeSessionIntent,
  normalizeWatchlistTags,
  resolveWatchlistTemplate,
  resolveSavedWatchlistImport
} from "./product-watchlists";
import {
  buildInfinityLoop,
  buildInfinityOrchestrator,
  buildProductMemory
} from "./product-infinity";

function statusTone(status) {
  if (
    status === "Protected" ||
    status === "Blocked" ||
    status === "Canceled" ||
    status === "Rejected"
  ) {
    return "danger";
  }
  if (status === "Watch" || status === "Ready" || status === "Working" || status === "Partially Filled") return "warning";
  if (status === "Staged" || status === "Closed" || status === "Amend Ack") return "info";
  if (
    status === "Filled" ||
    status === "Qualified" ||
    status === "Momentum" ||
    status === "In plan" ||
    status === "Scaling" ||
    status === "Running" ||
    status === "Logged"
  ) {
    return "success";
  }
  return "info";
}

function formatCurrency(value) {
  const sign = value < 0 ? "-" : "+";
  return `${sign}$${Math.abs(value).toFixed(0)}`;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeOrder(order = {}) {
  return {
    route: order.route || "Connected Route",
    size: order.size || "--",
    entry: order.entry || "--",
    stop: order.stop || "--",
    target: order.target || "--",
    status: order.status || "Working",
    time: order.time || "--",
    ...order
  };
}

function normalizePosition(position = {}) {
  return {
    lifecycle: position.lifecycle || "Filled",
    status: position.status || "In plan",
    risk: position.risk || "Balanced",
    ...position
  };
}

function createPositionKey(position = {}) {
  return `${position.symbol}-${position.side}-${position.entry}`;
}

function createOrderRecord(current, side, status = "Working", overrides = {}) {
  return normalizeOrder({
    id: createId("ORD"),
    symbol: current.selectedSymbol,
    route: current.selectedRoute?.name || current.orderTicket?.route || "Connected Route",
    side,
    type: current.orderTicket?.type || "Limit",
    size: current.orderTicket?.size || "--",
    entry: current.orderTicket?.entry || "--",
    stop: current.orderTicket?.stop || "--",
    target: current.orderTicket?.target || "--",
    status,
    time: getTimeLabel(),
    ...overrides
  });
}

function createPositionRecord(current, order) {
  const side = order.side === "Sell" ? "Short" : "Long";
  return normalizePosition({
    symbol: order.symbol,
    route: order.route || current.selectedRoute?.name || "Connected Route",
    side,
    size: order.size,
    entry: order.entry,
    mark: order.entry,
    pnl: formatCurrency(0),
    risk: current.protectionState === "Locked" ? "Protected" : current.riskMode,
    status: current.protectionState === "Locked" ? "Protected" : "In plan",
    lifecycle: "Filled"
  });
}

function createExecutionEvent(event = {}) {
  return {
    id: event.id || createId("EVT"),
    orderId: event.orderId || "--",
    symbol: event.symbol || "--",
    route: event.route || "Connected Route",
    event: event.event || "Runtime",
    status: event.status || "Logged",
    detail: event.detail || "No runtime detail recorded.",
    provider: event.provider || "Paper Execution",
    time: event.time || getTimeLabel(),
    ...event
  };
}

function createAutonomyRecord(record = {}) {
  return {
    id: record.id || createId("AUTO"),
    key: record.key || "observe",
    label: record.label || "Autonomy event",
    detail: record.detail || "No autonomy detail recorded.",
    status: record.status || "Logged",
    tone: record.tone || "info",
    time: record.time || getTimeLabel(),
    ...record
  };
}

const REPLAY_VERDICT_TAGS = ["strong", "weak", "disciplined", "risky", "review-again"];

function normalizeReplayVerdictTag(tag = "") {
  const normalized = String(tag || "").trim().toLowerCase();
  return REPLAY_VERDICT_TAGS.includes(normalized) ? normalized : "";
}

function normalizeReplayVerdicts(verdicts = []) {
  const source = Array.isArray(verdicts) ? verdicts : [verdicts];
  const seen = new Set();

  return source
    .map((item) => normalizeReplayVerdictTag(item))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, REPLAY_VERDICT_TAGS.length);
}

function buildReplayReviewKey(recordType, record = {}) {
  const baseId = String(record.id || "").trim();
  if (baseId) return `${recordType}:${baseId}`;

  return [
    recordType,
    record.symbol,
    record.route,
    record.title,
    record.label,
    record.event,
    record.text,
    record.detail
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("|")
    .slice(0, 220);
}

function buildReplayReviewEntry(recordType, record = {}, currentEntry = {}) {
  return {
    key: buildReplayReviewKey(recordType, record),
    recordType,
    recordId: String(record.id || ""),
    label: String(record.title || record.label || record.event || record.id || record.symbol || "Replay item"),
    symbol: String(record.symbol || ""),
    route: String(record.route || ""),
    status: String(record.status || record.severity || "Logged"),
    watchlistId: String(record.watchlistId || ""),
    watchlistName: String(record.watchlistName || ""),
    sessionIntent: normalizeSessionIntent(record.sessionIntent || ""),
    sessionTags: normalizeWatchlistTags(record.sessionTags || []),
    bookmarked: Boolean(currentEntry.bookmarked),
    verdicts: normalizeReplayVerdicts(currentEntry.verdicts || []),
    updatedAt: new Date().toISOString()
  };
}

function buildReviewSnapshotRecord(name, baselinePack, comparisonPack) {
  const normalizedName = String(name || "").trim().slice(0, 96) || `Snapshot ${new Date().toLocaleString()}`;

  return {
    id: createId("SNAP"),
    name: normalizedName,
    savedAt: new Date().toISOString(),
    baselinePack,
    comparisonPack,
    summary: `${baselinePack?.scope?.watchlistLabel || "Baseline"} vs ${comparisonPack?.scope?.watchlistLabel || "Comparison"}`
  };
}

function normalizeReplayQueueName(name = "", fallback = "Replay Queue") {
  return String(name || "").trim().slice(0, 96) || fallback;
}

function buildReplayQueueRecord(name, options = {}) {
  return {
    id: options.id || createId("QUEUE"),
    name: normalizeReplayQueueName(name, options.fallbackName || "Replay Queue"),
    itemKeys: Array.isArray(options.itemKeys) ? Array.from(new Set(options.itemKeys.filter(Boolean))).slice(0, 48) : [],
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.updatedAt || new Date().toISOString()
  };
}

function deriveReplayQueueVerdicts(queue, replayReviewMarks = {}) {
  if (!queue) return [];
  const verdicts = new Set();

  (queue.itemKeys || []).forEach((key) => {
    const entry = replayReviewMarks?.[key];
    (entry?.verdicts || []).forEach((verdict) => verdicts.add(verdict));
  });

  return Array.from(verdicts).slice(0, REPLAY_VERDICT_TAGS.length);
}

function buildHandoffNoteRecord(current, payload = {}) {
  const activeWatchlist = current.activeWatchlist;
  const snapshotId = String(payload.snapshotId || current.activeReviewSnapshotId || "").trim();
  const snapshot = (current.reviewSnapshots || []).find((item) => item.id === snapshotId) || null;
  const replayQueueId = String(payload.replayQueueId || current.activeReplayQueueId || "").trim();
  const replayQueue = (current.replayQueues || []).find((item) => item.id === replayQueueId) || null;
  const verdicts = deriveReplayQueueVerdicts(replayQueue, current.replayReviewMarks);

  return {
    id: createId("HANDOFF"),
    createdAt: new Date().toISOString(),
    watchlistId: String(payload.watchlistId || activeWatchlist?.id || ""),
    watchlistName: String(payload.watchlistName || activeWatchlist?.name || ""),
    snapshotId: snapshot?.id || "",
    snapshotName: snapshot?.name || "",
    replayQueueId: replayQueue?.id || "",
    replayQueueName: replayQueue?.name || "",
    verdicts,
    sessionIntent: normalizeSessionIntent(payload.sessionIntent || activeWatchlist?.sessionIntent || ""),
    comment: normalizeWatchlistNotes(payload.comment || ""),
    sessionTags: normalizeWatchlistTags(payload.sessionTags || activeWatchlist?.sessionTags || []),
    selectedSymbol: String(payload.selectedSymbol || current.selectedSymbol || ""),
    selectedRoute: String(payload.selectedRoute || current.selectedRoute?.name || ""),
    protectionState: String(payload.protectionState || current.protectionState || "")
  };
}

function normalizePinnedIds(ids = [], limit = 8) {
  return Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [ids])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  ).slice(0, limit);
}

function togglePinnedId(ids = [], targetId, limit = 8) {
  const normalized = normalizePinnedIds(ids, limit);
  const key = String(targetId || "").trim();
  if (!key) return normalized;
  return normalized.includes(key) ? normalized.filter((item) => item !== key) : [key, ...normalized].slice(0, limit);
}

function buildImportedReplayReviewEntry(item = {}, fallbackKey = "") {
  const key = String(item.key || fallbackKey || "").trim();
  if (!key) return null;

  return {
    key,
    recordType: String(item.recordType || "record"),
    recordId: String(item.recordId || ""),
    label: String(item.label || "Replay item"),
    symbol: String(item.symbol || ""),
    route: String(item.route || ""),
    status: String(item.status || "Logged"),
    watchlistId: String(item.watchlistId || ""),
    watchlistName: String(item.watchlistName || ""),
    sessionIntent: normalizeSessionIntent(item.sessionIntent || ""),
    sessionTags: normalizeWatchlistTags(item.sessionTags || []),
    bookmarked: item.bookmarked !== false,
    verdicts: normalizeReplayVerdicts(item.verdicts || []),
    updatedAt: new Date().toISOString()
  };
}

function buildImportedReviewSnapshot(snapshot = {}) {
  if (!snapshot?.baselinePack || !snapshot?.comparisonPack) return null;
  const nextName = String(snapshot.name || "").trim() || "Imported Snapshot";
  const record = buildReviewSnapshotRecord(`Imported ${nextName}`, snapshot.baselinePack, snapshot.comparisonPack);
  return {
    ...record,
    summary: String(snapshot.summary || record.summary || ""),
    savedAt: new Date().toISOString()
  };
}

function normalizeContinuityFilterPresetName(name = "", fallback = "Continuity View") {
  return String(name || "").trim().slice(0, 96) || fallback;
}

function buildContinuityFilterPresetRecord(name, filters = {}, existingRecord = null) {
  return {
    id: existingRecord?.id || createId("CFP"),
    name: normalizeContinuityFilterPresetName(name, existingRecord?.name || "Continuity View"),
    watchlist: String(filters.watchlist || "All Market Sets"),
    sessionIntent: String(filters.sessionIntent || "All Intents"),
    symbol: String(filters.symbol || "All Symbols"),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function findContinuityFilterPreset(presets = [], filters = {}) {
  return (presets || []).find(
    (preset) =>
      String(preset.watchlist || "All Market Sets") === String(filters.watchlist || "All Market Sets") &&
      String(preset.sessionIntent || "All Intents") === String(filters.sessionIntent || "All Intents") &&
      String(preset.symbol || "All Symbols") === String(filters.symbol || "All Symbols")
  );
}

function normalizeContinuityWorkspaceMacroName(name = "", fallback = "Continuity Macro") {
  return String(name || "").trim().slice(0, 96) || fallback;
}

function normalizeContinuityMacroUsageHistory(history = []) {
  return (Array.isArray(history) ? history : [history])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 48);
}

function buildContinuityWorkspaceMacroRecord(current, name, payload = {}, existingRecord = null) {
  const presets = current.continuityFilterPresets || [];
  const filters = {
    watchlist: String(payload.filters?.watchlist || existingRecord?.filters?.watchlist || "All Market Sets"),
    sessionIntent: String(payload.filters?.sessionIntent || existingRecord?.filters?.sessionIntent || "All Intents"),
    symbol: String(payload.filters?.symbol || existingRecord?.filters?.symbol || "All Symbols")
  };
  const matchedPreset =
    (payload.presetId ? presets.find((preset) => preset.id === payload.presetId) : null) ||
    findContinuityFilterPreset(presets, filters) ||
    null;
  const pinnedHandoff =
    (payload.handoffId ? (current.handoffNotes || []).find((item) => item.id === payload.handoffId) : null) ||
    (existingRecord?.handoffId ? (current.handoffNotes || []).find((item) => item.id === existingRecord.handoffId) : null) ||
    (current.pinnedHandoffNoteIds || []).map((id) => (current.handoffNotes || []).find((item) => item.id === id)).find(Boolean) ||
    null;
  const pinnedSnapshot =
    (payload.snapshotId ? (current.reviewSnapshots || []).find((item) => item.id === payload.snapshotId) : null) ||
    (existingRecord?.snapshotId ? (current.reviewSnapshots || []).find((item) => item.id === existingRecord.snapshotId) : null) ||
    (current.pinnedReviewSnapshotIds || []).map((id) => (current.reviewSnapshots || []).find((item) => item.id === id)).find(Boolean) ||
    null;
  const replayQueue =
    (payload.replayQueueId ? (current.replayQueues || []).find((item) => item.id === payload.replayQueueId) : null) ||
    (existingRecord?.replayQueueId ? (current.replayQueues || []).find((item) => item.id === existingRecord.replayQueueId) : null) ||
    (current.pinnedReplayQueueIds || []).map((id) => (current.replayQueues || []).find((item) => item.id === id)).find(Boolean) ||
    (current.replayQueues || []).find((item) => item.id === current.activeReplayQueueId) ||
    null;

  return {
    id: existingRecord?.id || createId("CMACRO"),
    name: normalizeContinuityWorkspaceMacroName(name, existingRecord?.name || "Continuity Macro"),
    presetId: matchedPreset?.id || existingRecord?.presetId || "",
    presetName: matchedPreset?.name || existingRecord?.presetName || "Ad hoc continuity view",
    filters: matchedPreset
      ? {
          watchlist: matchedPreset.watchlist,
          sessionIntent: matchedPreset.sessionIntent,
          symbol: matchedPreset.symbol
        }
      : filters,
    handoffId: pinnedHandoff?.id || existingRecord?.handoffId || "",
    snapshotId: pinnedHandoff?.snapshotId || pinnedSnapshot?.id || existingRecord?.snapshotId || "",
    snapshotName: pinnedHandoff?.snapshotName || pinnedSnapshot?.name || existingRecord?.snapshotName || "",
    replayQueueId: replayQueue?.id || pinnedHandoff?.replayQueueId || existingRecord?.replayQueueId || "",
    replayQueueName: replayQueue?.name || pinnedHandoff?.replayQueueName || existingRecord?.replayQueueName || "",
    sessionIntent: normalizeSessionIntent(
      payload.sessionIntent ||
        pinnedHandoff?.sessionIntent ||
        matchedPreset?.sessionIntent ||
        existingRecord?.sessionIntent ||
        current.activeWatchlist?.sessionIntent ||
        ""
    ),
    packLabel:
      pinnedHandoff?.watchlistName ||
      pinnedSnapshot?.name ||
      replayQueue?.name ||
      existingRecord?.packLabel ||
      "Pinned continuity pack",
    usageCount: Math.max(
      0,
      Number.isFinite(Number(payload.usageCount))
        ? Number(payload.usageCount)
        : Number.isFinite(Number(existingRecord?.usageCount))
          ? Number(existingRecord?.usageCount)
          : 0
    ),
    lastUsedAt: String(payload.lastUsedAt || existingRecord?.lastUsedAt || ""),
    usageHistory: normalizeContinuityMacroUsageHistory(payload.usageHistory || existingRecord?.usageHistory || []),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeContinuityInsightReportName(name = "", fallback = "Continuity Insight Report") {
  return String(name || "").trim().slice(0, 108) || fallback;
}

function normalizeContinuityInsightReasoning(reasoning = []) {
  return (Array.isArray(reasoning) ? reasoning : [reasoning])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildContinuityInsightReportRecord(name, payload = {}, existingRecord = null) {
  const normalizeRows = (rows = [], limit = 8) =>
    (Array.isArray(rows) ? rows : [rows])
      .filter((item) => item && typeof item === "object")
      .slice(0, limit);

  return {
    id: existingRecord?.id || createId("CINSIGHT"),
    name: normalizeContinuityInsightReportName(name, existingRecord?.name || "Continuity Insight Report"),
    filters: {
      route: String(payload.filters?.route || existingRecord?.filters?.route || "All Routes"),
      protectionState: String(payload.filters?.protectionState || existingRecord?.filters?.protectionState || "All Protection"),
      symbol: String(payload.filters?.symbol || existingRecord?.filters?.symbol || "All Symbols")
    },
    primaryBaselineId: String(payload.primaryBaselineId || existingRecord?.primaryBaselineId || ""),
    comparisonBaselineId: String(payload.comparisonBaselineId || existingRecord?.comparisonBaselineId || ""),
    macroAnalytics: {
      mostUsed: normalizeRows(payload.macroAnalytics?.mostUsed || existingRecord?.macroAnalytics?.mostUsed || [], 4),
      lastUsed: normalizeRows(payload.macroAnalytics?.lastUsed || existingRecord?.macroAnalytics?.lastUsed || [], 4),
      leastUsed: normalizeRows(payload.macroAnalytics?.leastUsed || existingRecord?.macroAnalytics?.leastUsed || [], 4),
      frequencyRows: normalizeRows(payload.macroAnalytics?.frequencyRows || existingRecord?.macroAnalytics?.frequencyRows || [], 8)
    },
    driftClusters: normalizeRows(payload.driftClusters || existingRecord?.driftClusters || [], 8),
    trendSnapshots: normalizeRows(payload.trendSnapshots || existingRecord?.trendSnapshots || [], 6),
    executionContexts: {
      symbols: normalizeRows(payload.executionContexts?.symbols || existingRecord?.executionContexts?.symbols || [], 8),
      routes: normalizeRows(payload.executionContexts?.routes || existingRecord?.executionContexts?.routes || [], 8),
      protections: normalizeRows(payload.executionContexts?.protections || existingRecord?.executionContexts?.protections || [], 8)
    },
    reasoning: normalizeContinuityInsightReasoning(payload.reasoning || existingRecord?.reasoning || []),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeContinuityInsightCollectionName(name = "", fallback = "Insight Collection") {
  return String(name || "").trim().slice(0, 108) || fallback;
}

function normalizeContinuityInsightCollectionReportIds(reportIds = [], reports = []) {
  const validIds = new Set((Array.isArray(reports) ? reports : []).map((report) => String(report?.id || "")));
  return Array.from(
    new Set(
      (Array.isArray(reportIds) ? reportIds : [reportIds])
        .map((reportId) => String(reportId || "").trim())
        .filter((reportId) => reportId && validIds.has(reportId))
    )
  ).slice(0, 24);
}

function buildContinuityInsightCollectionRecord(current, name, payload = {}, existingRecord = null) {
  const reports = current?.continuityInsightReports || [];
  const reportIds = normalizeContinuityInsightCollectionReportIds(
    payload.reportIds !== undefined ? payload.reportIds : existingRecord?.reportIds || [],
    reports
  );

  return {
    id: existingRecord?.id || createId("CICOLL"),
    name: normalizeContinuityInsightCollectionName(name, existingRecord?.name || "Insight Collection"),
    reportIds,
    lastOpenedAt: String(payload.lastOpenedAt || existingRecord?.lastOpenedAt || ""),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function resolveContinuityInsightComparisonIds(
  reports = [],
  primaryReportId = "",
  comparisonReportId = "",
  activeReportId = ""
) {
  const entries = Array.isArray(reports) ? reports.filter(Boolean) : [];
  const primaryReport =
    entries.find((report) => report.id === primaryReportId) ||
    entries.find((report) => report.id === activeReportId) ||
    entries[0] ||
    null;
  const comparisonReport =
    entries.find((report) => report.id === comparisonReportId && report.id !== primaryReport?.id) ||
    entries.find((report) => report.id !== primaryReport?.id) ||
    null;

  return {
    primaryReportId: primaryReport?.id || "",
    comparisonReportId: comparisonReport?.id || ""
  };
}

function normalizeQueueDriftBaselineName(name = "", fallback = "Drift Baseline") {
  return String(name || "").trim().slice(0, 96) || fallback;
}

function buildQueueDriftBaselineRecord(name, payload = {}, existingRecord = null) {
  const pack = payload.pack && typeof payload.pack === "object" ? payload.pack : existingRecord?.pack || null;
  return {
    id: existingRecord?.id || createId("DRIFT"),
    name: normalizeQueueDriftBaselineName(
      name,
      existingRecord?.name || payload.fileName || pack?.primaryQueue?.name || "Drift Baseline"
    ),
    fileName: String(payload.fileName || existingRecord?.fileName || ""),
    primaryQueueName: String(pack?.primaryQueue?.name || existingRecord?.primaryQueueName || "Primary queue"),
    comparisonQueueName: String(pack?.comparisonQueue?.name || existingRecord?.comparisonQueueName || "Comparison queue"),
    exportedAt: String(pack?.exportedAt || existingRecord?.exportedAt || ""),
    pack,
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildContinuityAlertFingerprint(payload = {}) {
  return [
    payload.severity,
    payload.reason,
    payload.symbol,
    payload.route,
    payload.snapshotName,
    payload.queueName,
    payload.watchlistName
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("|")
    .slice(0, 220);
}

function buildContinuityAlertRecord(payload = {}, existingRecord = null) {
  return {
    id: existingRecord?.id || createId("CALERT"),
    severity: String(payload.severity || existingRecord?.severity || "Warning"),
    tone: String(payload.tone || existingRecord?.tone || "warning"),
    reason: String(payload.reason || existingRecord?.reason || "Continuity drift detected."),
    recommendedAction: String(
      payload.recommendedAction ||
        existingRecord?.recommendedAction ||
        "Resume the last trusted review pack or pin the current stack if the drift is intentional."
    ),
    watchlistName: String(payload.watchlistName || existingRecord?.watchlistName || ""),
    snapshotName: String(payload.snapshotName || existingRecord?.snapshotName || ""),
    queueName: String(payload.queueName || existingRecord?.queueName || ""),
    sessionIntent: normalizeSessionIntent(payload.sessionIntent || existingRecord?.sessionIntent || ""),
    symbol: String(payload.symbol || existingRecord?.symbol || ""),
    route: String(payload.route || existingRecord?.route || ""),
    protectionState: String(payload.protectionState || existingRecord?.protectionState || ""),
    fingerprint: buildContinuityAlertFingerprint(payload) || existingRecord?.fingerprint || createId("CALERT-FP"),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function resolveContinuityWorkspaceMacroRuntime(current, macro) {
  const note = (current.handoffNotes || []).find((item) => item.id === macro?.handoffId) || null;
  const snapshot =
    (current.reviewSnapshots || []).find((item) => item.id === (note?.snapshotId || macro?.snapshotId)) || null;
  const queue =
    (current.replayQueues || []).find((item) => item.id === (macro?.replayQueueId || note?.replayQueueId)) || null;
  const snapshotRuntime = snapshot?.comparisonPack?.runtime || snapshot?.baselinePack?.runtime || {};
  const snapshotScope = snapshot?.comparisonPack?.scope || snapshot?.baselinePack?.scope || {};
  const macroSymbol =
    String(macro?.filters?.symbol || "").trim() &&
    String(macro?.filters?.symbol || "").trim() !== "All Symbols"
      ? String(macro?.filters?.symbol || "").trim()
      : "";
  const mappedSymbol = resolveProviderMapping(
    note?.selectedSymbol || snapshotRuntime.selectedSymbol || macroSymbol || current.selectedSymbol
  ).symbol;
  const routeKey = String(note?.selectedRoute || snapshotRuntime.selectedRoute || current.selectedRoute?.name || "").trim();
  const routeMatch =
    current.routeLibrary.find((route) => route.name === routeKey || route.asset === routeKey) ||
    current.selectedRoute;
  const watchlist =
    (current.savedWatchlists || []).find((item) => item.id === (note?.watchlistId || snapshotScope.activeWatchlistId)) ||
    current.activeWatchlist;

  return {
    note,
    snapshot,
    queue,
    watchlist,
    mappedSymbol,
    routeMatch,
    protectionState: note?.protectionState || snapshotRuntime.protectionState || current.protectionState
  };
}

function mergeAutonomyLog(currentLog = [], entry) {
  if (!entry) return currentLog || [];
  return [entry, ...(currentLog || [])].slice(0, 16);
}

function riskModeRank(mode) {
  if (mode === "Defensive") return 0;
  if (mode === "Balanced") return 1;
  if (mode === "Aggressive") return 2;
  return 1;
}

function createRecommendationLogEntry(recommendation) {
  if (!recommendation) return null;

  return createAutonomyRecord({
    key: recommendation.actionKey || "recommend",
    label: recommendation.actionLabel || "Recommendation",
    detail: recommendation.summary || "No recommendation summary recorded.",
    status: recommendation.actionStatus || "Available",
    tone: recommendation.tone || "info"
  });
}

function mergeRecommendationLog(currentLog = [], recommendation) {
  const entry = createRecommendationLogEntry(recommendation);
  if (!entry) return currentLog || [];

  const previous = currentLog?.[0];
  if (
    previous &&
    previous.key === entry.key &&
    previous.label === entry.label &&
    previous.detail === entry.detail &&
    previous.status === entry.status
  ) {
    return currentLog;
  }

  return [entry, ...(currentLog || [])].slice(0, 16);
}

function buildAutonomyActionState(current, entry) {
  if (!entry) {
    return {
      guardedActionResults: current.guardedActionResults || {},
      autonomyAuditLog: current.autonomyAuditLog || []
    };
  }

  return {
    guardedActionResults: {
      ...(current.guardedActionResults || {}),
      [entry.key]: entry
    },
    autonomyAuditLog: mergeAutonomyLog(current.autonomyAuditLog, entry)
  };
}

function buildRecoveryState(current, entry) {
  if (!entry) {
    return {
      recentActions: current.recentActions,
      lastRecoveryAction: current.lastRecoveryAction || null,
      recoveryLog: current.recoveryLog || [],
      ...buildAutonomyActionState(current, null)
    };
  }

  return {
    recentActions: pushAction(current.recentActions, entry.label, entry.detail, entry.status || "Logged"),
    lastRecoveryAction: entry,
    recoveryLog: mergeAutonomyLog(current.recoveryLog, entry),
    ...buildAutonomyActionState(current, entry)
  };
}

function buildSeedRecentActions(baseData) {
  const queueActions = (baseData.queue || []).map((item, index) => ({
    id: `QUEUE-${index + 1}`,
    title: item.task,
    detail: `${item.owner} | ${item.status}`,
    status: item.status
  }));
  const historyActions = (baseData.history || []).map((item) => ({
    id: item.id,
    title: `${item.symbol} ${item.side} ${item.type}`,
    detail: `${item.status} at ${item.time}`,
    status: item.status
  }));

  return [...queueActions, ...historyActions];
}

function buildSeedExecutionEvents(baseData) {
  return (baseData.history || []).map((item, index) =>
    createExecutionEvent({
      id: `EVT-${index + 1}-${item.id}`,
      orderId: item.id,
      symbol: item.symbol,
      route: item.route || "Connected Route",
      event: item.status,
      status: item.status,
      detail: `${item.symbol} ${item.side} ${item.type} ${item.status.toLowerCase()} at ${item.time}.`,
      time: item.time,
      provider: "Paper Execution"
    })
  );
}

function deriveRiskSummary({ baseData, openPositions, recentOrders, riskMode, protectionState, selectedSymbol }) {
  const startingOpenRisk =
    Number.parseFloat(String(baseData?.riskSummary?.openRisk || "1.38").replace(/[^\d.]/g, "")) || 1.38;
  const openRisk = Math.max(0.2, startingOpenRisk + openPositions.length * 0.18).toFixed(2);
  const drawdownBase =
    Number.parseFloat(String(baseData?.riskSummary?.drawdown || "0.62").replace(/[^\d.]/g, "")) || 0.62;
  const protectiveOffset = protectionState === "Locked" ? -0.08 : protectionState === "Guarded" ? -0.03 : 0;
  const riskModeOffset = riskMode === "Aggressive" ? 0.12 : riskMode === "Defensive" ? -0.07 : 0;
  const drawdown = Math.max(
    0.18,
    drawdownBase +
      openPositions.length * 0.03 +
      recentOrders.filter((order) => order.status === "Canceled").length * 0.01 +
      riskModeOffset +
      protectiveOffset
  ).toFixed(2);
  const protectedCount = openPositions.filter(
    (position) => position.risk === "Protected" || position.status === "Protected"
  ).length;

  return {
    drawdown: `${drawdown}%`,
    openRisk: `${openRisk}R`,
    protectionState,
    guardStatus:
      protectionState === "Locked"
        ? "Hard protection engaged"
        : `${protectedCount} protected positions under ${riskMode.toLowerCase()} mode`,
    protectedCount,
    activeSymbol: selectedSymbol
  };
}

function buildAiGuidance(
  activeWatch,
  primaryRoute,
  riskMode,
  protectionState,
  riskSummary,
  recentActions = [],
  liveDataStatus,
  executionStatus
) {
  const routeState = primaryRoute.state;
  const protectedFlow = protectionState === "Locked" || routeState === "Protected";
  const latestAction = recentActions[0];

  return {
    headline: `${activeWatch.symbol} is streaming through ${liveDataStatus?.label || "the local feed"} with ${liveDataStatus?.feedHealth || "stable"} feed health and ${executionStatus?.label || "paper execution"} handling the route.`,
    routeSummary: `${primaryRoute.name} on ${activeWatch.symbol} is ${routeState.toLowerCase()} at ${primaryRoute.confidence} confidence on ${liveDataStatus?.mode || "connected feed"} mode with ${liveDataStatus?.freshness || "active"} freshness.`,
    riskNote: protectedFlow
      ? `${activeWatch.symbol} is under ${protectionState.toLowerCase()} posture with ${riskSummary.openRisk} open risk. Preserve bracket discipline and defensive sizing.`
      : routeState === "Watch"
        ? `${activeWatch.symbol} remains in watch mode. Favor patience until signal quality confirms continuation.`
        : `${activeWatch.symbol} is executable under ${riskMode.toLowerCase()} mode with ${riskSummary.drawdown} session drawdown, ${executionStatus?.pendingOrders ?? 0} pending orders, and ${executionStatus?.rejectedOrders ?? 0} rejects.`,
    executionSuggestion: protectedFlow
      ? "Reduce aggression, keep ticket protection tight, and avoid adding risk until posture normalizes."
      : routeState === "Ready"
        ? `Use ${executionStatus?.label || "paper execution"} to stage or send the ticket with bracket protection intact while monitoring partial-fill and reject events.`
        : "Keep the order staged and monitor the signal board before promoting it into active execution.",
    warningState: protectedFlow
      ? "Warning: protection is elevated. Favor capital preservation over expansion."
      : routeState === "Watch"
        ? "Warning: route is still observational. Avoid premature execution if the feed stalls."
        : "Warning state is low. Continue only while route quality and risk posture stay aligned.",
    nextAction: protectedFlow
      ? `Maintain a defensive posture on ${activeWatch.symbol} and wait for guard conditions to relax.`
      : routeState === "Watch"
        ? `Monitor ${activeWatch.symbol} for stronger route confirmation before sending additional size.`
        : `Route ${primaryRoute.name} is paper-ready. Confirm the ticket and prepare for controlled execution.`,
    prompts: [
      `Explain the ${activeWatch.symbol} route using the current ${liveDataStatus?.label || "demo feed"}.`,
      `Summarize current risk on ${activeWatch.symbol} with ${executionStatus?.label || "paper execution"} context.`,
      `Should ${activeWatch.symbol} stay bracketed or be reduced?`,
      latestAction ? `Summarize the latest action: ${latestAction.title}.` : `Prepare a handoff note for ${activeWatch.symbol}.`
    ]
  };
}

function buildTradingSnapshot(
  baseData,
  liveSnapshot,
  selectedSymbol,
  preferredRoute,
  riskMode,
  protectionState,
  openPositions,
  recentOrders,
  recentActions,
  executionStatus
) {
  const activeWatch =
    liveSnapshot.watchlist.find((item) => item.symbol === selectedSymbol) ||
    liveSnapshot.watchlist[0] ||
    {};
  const routeMatch =
    liveSnapshot.routeLibrary.find(
      (route) => route.asset === activeWatch.symbol && route.name === preferredRoute
    ) ||
    liveSnapshot.routeLibrary.find((route) => route.asset === activeWatch.symbol) ||
    baseData.routeLibrary?.find(
      (route) => route.asset === activeWatch.symbol && route.name === preferredRoute
    ) ||
    baseData.routeLibrary?.find((route) => route.asset === activeWatch.symbol) ||
    baseData.primaryRoute || {
      name: activeWatch.strategy || "Connected Route",
      asset: activeWatch.symbol,
      confidence: activeWatch.confidence || "70%",
      state: activeWatch.status || "Watch"
    };
  const routeState = protectionState === "Locked" ? "Protected" : routeMatch.state || activeWatch.status || "Watch";
  const primaryRoute = {
    ...routeMatch,
    name: routeMatch.name || activeWatch.strategy || "Connected Route",
    asset: routeMatch.asset || activeWatch.symbol,
    confidence: routeMatch.confidence || activeWatch.confidence || "70%",
    state: routeState
  };
  const chartData = {
    ...(liveSnapshot.chart || baseData.chart),
    symbol: activeWatch.symbol || baseData.chart?.symbol,
    timeframe: liveSnapshot.chart?.timeframe || baseData.chart?.timeframe || "15m"
  };
  const orderTicket = {
    ...baseData.orderTicket,
    symbol: activeWatch.symbol || baseData.orderTicket?.symbol,
    route: primaryRoute.name,
    side: routeState === "Protected" ? "Sell" : baseData.orderTicket?.side || "Buy",
    entry: activeWatch.ask || activeWatch.last || baseData.orderTicket?.entry,
    stop:
      routeState === "Protected"
        ? "Tight Protective Stop"
        : baseData.orderTicket?.stop || "--",
    target:
      routeState === "Watch"
        ? "Scaled Target"
        : baseData.orderTicket?.target || "--",
    bid: activeWatch.bid || "--",
    ask: activeWatch.ask || "--",
    spread: activeWatch.spread || "--"
  };
  const riskSummary = deriveRiskSummary({
    baseData,
    openPositions,
    recentOrders,
    riskMode,
    protectionState,
    selectedSymbol: activeWatch.symbol || selectedSymbol
  });

  return {
    selectedSymbol: activeWatch.symbol || selectedSymbol,
    selectedRoute: primaryRoute,
    chartData,
    orderTicket,
    aiGuidance: buildAiGuidance(
      activeWatch,
      primaryRoute,
      riskMode,
      protectionState,
      riskSummary,
      recentActions,
      liveSnapshot.liveDataStatus,
      executionStatus
    ),
    activeWatch,
    routeNotes: baseData.routeNotes?.[activeWatch.symbol] || [],
    marketPosture: liveSnapshot.marketPosture?.[activeWatch.symbol] || baseData.marketPosture?.[activeWatch.symbol] || null,
    riskSummary
  };
}

function buildOperatorDiagnostics({
  activeWatch,
  primaryRoute,
  liveDataStatus,
  liveDataDiagnostics,
  executionStatus,
  riskSummary,
  protectionState,
  riskMode,
  symbolRuntimeHealth = [],
  recentActions = [],
  autonomyDiagnostics
}) {
  const activeRuntime =
    symbolRuntimeHealth.find((item) => item.symbol === activeWatch?.symbol) || symbolRuntimeHealth[0] || null;

  return {
    feedState: {
      label: "Feed State",
      value: liveDataStatus?.state || "--",
      hint: `${liveDataStatus?.label || "No feed"} | ${liveDataDiagnostics?.freshness || "Waiting"}`,
      tone: liveDataStatus?.tone || "neutral"
    },
    executionState: {
      label: "Execution State",
      value: executionStatus?.state || "--",
      hint: `${executionStatus?.pendingOrders ?? 0} pending | ${executionStatus?.eventCount ?? 0} events`,
      tone: executionStatus?.tone || "neutral"
    },
    protectionPosture: {
      label: "Protection",
      value: protectionState,
      hint: `${riskMode} mode | ${riskSummary?.guardStatus || "No protection note"}`,
      tone: protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "success"
    },
    routeReadiness: {
      label: "Route Readiness",
      value: primaryRoute?.state || "--",
      hint: `${primaryRoute?.name || "No route"} | ${primaryRoute?.confidence || "--"}`,
      tone: statusTone(primaryRoute?.state)
    },
    runtimeHealth: {
      label: "Runtime Health",
      value: activeRuntime?.runtimeHealth || liveDataDiagnostics?.runtimeHealth || "--",
      hint: `${activeRuntime?.feedHealth || liveDataDiagnostics?.feedHealth || "No health"} | ${activeRuntime?.signalState || liveDataDiagnostics?.signalState || "No signal"}`,
      tone:
        activeRuntime?.feedHealth === "Degraded" || executionStatus?.rejectedOrders
          ? "danger"
          : activeRuntime?.feedHealth === "Stable" || executionStatus?.partialFills
            ? "warning"
            : "success"
    },
    activeRuntime,
    note:
      autonomyDiagnostics?.summary ||
      liveDataDiagnostics?.note ||
      recentActions[0]?.detail ||
      "Runtime diagnostics are available for the active shared product session."
  };
}

const initialState = {
  hydrated: false,
  baseData: null,
  selectedSymbol: "",
  selectedRoute: null,
  chartData: null,
  orderTicket: null,
  aiGuidance: null,
  activeWatch: null,
  routeNotes: [],
  marketPosture: null,
  riskMode: "Balanced",
  protectionState: "Armed",
  riskSummary: null,
  openPositions: [],
  recentOrders: [],
  recentActions: [],
  sessionNotes: [],
  reviewSnapshots: [],
  activeReviewSnapshotId: "",
  continuityFilterPresets: [],
  continuityWorkspaceMacros: [],
  activeContinuityMacroId: "",
  continuityInsightReports: [],
  activeContinuityInsightReportId: "",
  continuityInsightCollections: [],
  activeContinuityInsightCollectionId: "",
  continuityInsightPrimaryReportId: "",
  continuityInsightComparisonReportId: "",
  replayReviewMarks: {},
  replayQueues: [],
  activeReplayQueueId: "",
  queueDriftBaselines: [],
  handoffNotes: [],
  pinnedReviewSnapshotIds: [],
  pinnedReplayQueueIds: [],
  pinnedHandoffNoteIds: [],
  continuityAlertHistory: [],
  savedWatchlists: [],
  watchlistTemplates: [],
  startupTemplateKey: "",
  activeWatchlistId: "",
  activeWatchlist: null,
  watchlist: [],
  marketFeeds: [],
  routeLibrary: [],
  quoteMap: {},
  signalBoard: [],
  tradeTape: [],
  chartOverlayModel: null,
  liveDataSource: getDefaultLiveDataSource(),
  chartTimeframe: getDefaultLiveTimeframe(),
  liveDataStatus: null,
  liveDataDiagnostics: null,
  symbolRuntimeHealth: [],
  runtimeSignals: null,
  evaluationModel: null,
  operatorPolicy: null,
  connectorReadiness: null,
  controlledAlerts: null,
  guardedActions: [],
  guardedActionResults: {},
  autonomyAuditLog: [],
  autonomyDiagnostics: null,
  recommendationLoop: null,
  recommendationLog: [],
  autonomyMode: "Guarded Observe",
  lastRecoveryAction: null,
  recoveryLog: [],
  runtimeTrendHistory: [],
  runtimeTrendSummary: null,
  operatorReports: [],
  productMemory: null,
  infinityLoop: null,
  infinityOrchestrator: null,
  liveDataProviders: getLiveDataProviderCatalog(),
  chartTimeframes: getLiveChartTimeframes(),
  liveTick: 0,
  liveAdapterRuntime: null,
  trackedSymbols: [],
  executionProvider: getDefaultExecutionProvider(),
  executionProviders: getExecutionProviderCatalog(),
  executionStatus: null,
  executionEvents: [],
  operatorDiagnostics: null,
  themeMode: "Desk Dark",
  densityMode: "Comfortable",
  defaultRiskMode: "Balanced",
  preferredSymbol: "",
  preferredRoute: ""
};

const SAVED_SESSION_KEY = "tpm-product-saved-session";
let activeLiveAdapterRefresh = null;
let activeLiveAdapterRefreshKey = "";

function buildRuntimeWatchlistState(baseData, state) {
  const fallbackSymbols = (baseData.watchlist || []).map((item) => item.symbol);
  const watchlists = normalizeSavedWatchlists(state.savedWatchlists || [], fallbackSymbols);
  const activeSet = deriveActiveSavedWatchlist(watchlists, state.activeWatchlistId, fallbackSymbols);
  const preferredSymbol = state.preferredSymbol ? resolveProviderMapping(state.preferredSymbol).symbol : null;
  const selectedSymbol = state.selectedSymbol ? resolveProviderMapping(state.selectedSymbol).symbol : null;
  const runtimeSymbols = mergeRuntimeSymbols(activeSet.activeWatchlist?.symbols || fallbackSymbols, [
    selectedSymbol,
    preferredSymbol
  ]).filter((symbol) => resolveProviderMapping(symbol).supported);

  return {
    savedWatchlists: activeSet.savedWatchlists,
    activeWatchlistId: activeSet.activeWatchlistId,
    activeWatchlist: {
      ...(activeSet.activeWatchlist || buildSavedWatchlistRecord("Core Live Board", fallbackSymbols)),
      symbols: runtimeSymbols.length ? runtimeSymbols : fallbackSymbols
    },
    watchlistSymbols: runtimeSymbols.length ? runtimeSymbols : fallbackSymbols
  };
}

function captureWatchlistPresetFromState(current, watchlistSymbols = []) {
  return buildWatchlistPresetFromRuntime(
    {
      selectedSymbol: current.selectedSymbol,
      preferredSymbol: current.preferredSymbol || current.selectedSymbol,
      preferredRoute: current.selectedRoute?.name || current.preferredRoute || "",
      chartTimeframe: current.chartTimeframe || getDefaultLiveTimeframe(),
      densityMode: current.densityMode || "Comfortable"
    },
    watchlistSymbols
  );
}

function mergeImportedSavedWatchlists(currentSavedWatchlists = [], importedPayload, fallbackSymbols = []) {
  return resolveSavedWatchlistImport(currentSavedWatchlists, importedPayload, fallbackSymbols);
}

function buildWatchlistActivationState(current, watchlist) {
  const preset = watchlist?.preset || {};
  const preferredSymbol = preset.preferredSymbol ? resolveProviderMapping(preset.preferredSymbol).symbol : "";
  const nextSelected =
    watchlist?.symbols?.includes(preferredSymbol)
      ? preferredSymbol
      : watchlist?.symbols?.includes(current.selectedSymbol)
        ? current.selectedSymbol
        : watchlist?.symbols?.[0] || current.selectedSymbol;

  return {
    activeWatchlistId: watchlist?.id || current.activeWatchlistId,
    selectedSymbol: nextSelected || current.selectedSymbol,
    preferredSymbol: nextSelected || current.preferredSymbol,
    preferredRoute: String(preset.preferredRoute || ""),
    chartTimeframe: preset.preferredTimeframe || current.chartTimeframe || getDefaultLiveTimeframe(),
    densityMode: preset.preferredDensityMode || current.densityMode || "Comfortable",
    trackedSymbols: mergeRuntimeSymbols(current.trackedSymbols || [], watchlist?.symbols || [])
  };
}

function getStartupTemplateRecordId(templateKey = "") {
  return templateKey ? `watch-startup-template-${templateKey}` : "";
}

function buildStartupTemplateRecord(templateKey, existingRecord = null) {
  const template = resolveWatchlistTemplate(templateKey);
  if (!template) return null;

  return {
    ...buildSavedWatchlistRecord(template.name, template.symbols, {
      id: getStartupTemplateRecordId(templateKey),
      pinned: existingRecord?.pinned || false,
      preset: template.preset,
      notes: template.notes,
      sessionTags: template.sessionTags,
      sessionIntent: template.sessionIntent,
      createdAt: existingRecord?.createdAt,
      updatedAt: new Date().toISOString()
    }),
    startupTemplate: true,
    sourceTemplateKey: templateKey
  };
}

function applyStartupTemplateState(current) {
  const templateKey = String(current.startupTemplateKey || "").trim();
  if (!templateKey) return current;

  const existingStartupRecord = (current.savedWatchlists || []).find(
    (item) => item.id === getStartupTemplateRecordId(templateKey)
  );
  const startupRecord = buildStartupTemplateRecord(templateKey, existingStartupRecord);
  if (!startupRecord) {
    return {
      ...current,
      startupTemplateKey: ""
    };
  }

  const nextWatchlists = [
    startupRecord,
    ...(current.savedWatchlists || []).filter((item) => !item.startupTemplate)
  ];
  const activationState = buildWatchlistActivationState(
    {
      ...current,
      savedWatchlists: nextWatchlists
    },
    startupRecord
  );

  return {
    ...current,
    savedWatchlists: nextWatchlists,
    ...activationState,
    activeWatchlistId: startupRecord.id
  };
}

function buildLiveAdapterSymbolSet(current) {
  return mergeRuntimeSymbols(
    [
      current.selectedSymbol,
      current.preferredSymbol,
      ...(current.activeWatchlist?.symbols?.length
        ? current.activeWatchlist.symbols
        : (current.watchlist?.length ? current.watchlist : current.baseData?.watchlist || []).map((item) => item.symbol))
    ],
    current.trackedSymbols || []
  ).slice(0, 4);
}

function buildTrackedSymbols(baseData, state) {
  const selected = state.selectedSymbol ? resolveProviderMapping(state.selectedSymbol).symbol : null;
  const preferred = state.preferredSymbol ? resolveProviderMapping(state.preferredSymbol).symbol : null;
  const activeWatchlistSymbols = state.activeWatchlist?.symbols || [];

  return mergeRuntimeSymbols(
    [
      ...(state.trackedSymbols || []),
      ...activeWatchlistSymbols,
      selected,
      preferred
    ],
    (baseData.watchlist || []).map((item) => item.symbol)
  ).filter((symbol) => !(baseData.watchlist || []).some((item) => resolveProviderMapping(item.symbol).symbol === symbol));
}

function symbolExistsInRuntime(baseData, trackedSymbols = [], symbol = "") {
  const resolved = resolveProviderMapping(symbol).symbol;
  return mergeRuntimeSymbols(
    (baseData.watchlist || []).map((item) => item.symbol),
    trackedSymbols
  ).includes(resolved);
}

function hasSavedSessionSnapshot() {
  try {
    return Boolean(localStorage.getItem(SAVED_SESSION_KEY));
  } catch {
    return false;
  }
}

const executionHelpers = {
  createId,
  createOrderRecord,
  createPositionKey,
  createPositionRecord,
  createExecutionEvent,
  getTimeLabel,
  normalizeOrder,
  normalizePosition,
  pushAction
};

function rehydrateState(baseData, state) {
  const riskMode = state.riskMode || state.defaultRiskMode || "Balanced";
  const protectionState = state.protectionState || "Armed";
  const openPositions = (state.openPositions?.length ? state.openPositions : baseData.positions || []).map(
    normalizePosition
  );
  const recentOrders = (state.recentOrders?.length ? state.recentOrders : baseData.history || []).map(normalizeOrder);
  const recentActions =
    state.recentActions?.length ? state.recentActions : baseData.recentActions || buildSeedRecentActions(baseData);
  const sessionNotes = state.sessionNotes?.length ? state.sessionNotes : baseData.sessionNotes || [];
  const executionEvents =
    state.executionEvents?.length ? state.executionEvents : baseData.executionEvents || buildSeedExecutionEvents(baseData);
  const runtimeWatchlists = buildRuntimeWatchlistState(baseData, state);
  const trackedSymbols = buildTrackedSymbols(baseData, {
    ...state,
    activeWatchlist: runtimeWatchlists.activeWatchlist
  });
  const selectedSymbolCandidate =
    state.selectedSymbol && runtimeWatchlists.watchlistSymbols.includes(resolveProviderMapping(state.selectedSymbol).symbol)
      ? resolveProviderMapping(state.selectedSymbol).symbol
      : state.preferredSymbol && runtimeWatchlists.watchlistSymbols.includes(resolveProviderMapping(state.preferredSymbol).symbol)
        ? resolveProviderMapping(state.preferredSymbol).symbol
        : runtimeWatchlists.activeWatchlist?.symbols?.[0] || resolveProviderMapping(baseData.primaryRoute?.asset || baseData.watchlist?.[0]?.symbol).symbol;
  const liveDataSource = state.liveDataSource || getDefaultLiveDataSource();
  const chartTimeframe = resolveLiveTimeframe(state.chartTimeframe || getDefaultLiveTimeframe()).key;
  const liveTick = Number.isFinite(state.liveTick) ? state.liveTick : 0;
  const liveAdapterRuntime = state.liveAdapterRuntime || null;
  let liveSnapshot = buildLiveDataSnapshot({
    baseData,
    selectedSymbol: selectedSymbolCandidate,
    liveDataSource,
    liveTick,
    liveAdapterRuntime,
    trackedSymbols,
    watchlistSymbols: runtimeWatchlists.watchlistSymbols,
    chartTimeframe
  });
  const resolvedSymbol =
    liveSnapshot.watchlist.some((item) => item.symbol === selectedSymbolCandidate)
      ? selectedSymbolCandidate
      : liveSnapshot.watchlist[0]?.symbol || selectedSymbolCandidate;

  if (resolvedSymbol !== selectedSymbolCandidate) {
    liveSnapshot = buildLiveDataSnapshot({
      baseData,
      selectedSymbol: resolvedSymbol,
      liveDataSource,
      liveTick,
      liveAdapterRuntime,
      trackedSymbols,
      watchlistSymbols: runtimeWatchlists.watchlistSymbols,
      chartTimeframe
    });
  }

  const executionProvider = state.executionProvider || getDefaultExecutionProvider();
  const executionStatus = buildExecutionStatus({
    providerKey: executionProvider,
    recentOrders,
    openPositions,
    recentActions,
    executionEvents
  });
  const snapshot = buildTradingSnapshot(
    baseData,
    liveSnapshot,
    resolvedSymbol,
    state.preferredRoute || "",
    riskMode,
    protectionState,
    openPositions,
    recentOrders,
    recentActions,
    executionStatus
  );
  const persistedTicket = state.orderTicket || {};
  const resolvedOrderTicket = {
    ...snapshot.orderTicket,
    side: persistedTicket.side || snapshot.orderTicket.side,
    type: persistedTicket.type || snapshot.orderTicket.type,
    size: persistedTicket.size || snapshot.orderTicket.size,
    entry: persistedTicket.entry || snapshot.orderTicket.entry,
    stop: persistedTicket.stop || snapshot.orderTicket.stop,
    target: persistedTicket.target || snapshot.orderTicket.target,
    riskPct: persistedTicket.riskPct || snapshot.orderTicket.riskPct,
    notional: persistedTicket.notional || snapshot.orderTicket.notional
  };
  const chartOverlayModel = buildLiveChartOverlayModel({
    chart: snapshot.chartData,
    activeWatch: snapshot.activeWatch,
    primaryRoute: snapshot.selectedRoute,
    orderTicket: resolvedOrderTicket,
    openPositions,
    recentOrders,
    executionEvents,
    protectionState,
    riskSummary: snapshot.riskSummary
  });
  const runtimeSignals = buildRuntimeSignals({
    hydrated: true,
    selectedSymbol: snapshot.selectedSymbol,
    selectedRoute: snapshot.selectedRoute,
    liveDataStatus: liveSnapshot.liveDataStatus,
    liveDataDiagnostics: liveSnapshot.liveDataDiagnostics,
    executionStatus,
    riskSummary: snapshot.riskSummary,
    protectionState,
    riskMode,
    recentActions,
    sessionNotes,
    executionEvents,
    symbolRuntimeHealth: liveSnapshot.symbolRuntimeHealth
  });
  const operatorPolicy = buildOperatorPolicy({
    liveDataSource,
    liveDataStatus: liveSnapshot.liveDataStatus,
    executionProvider,
    executionStatus,
    runtimeSignals,
    riskMode,
    hasSavedSession: hasSavedSessionSnapshot()
  });
  const connectorReadiness = buildConnectorReadiness({
    liveDataSource,
    liveDataStatus: liveSnapshot.liveDataStatus,
    executionProvider,
    executionStatus,
    operatorPolicy
  });
  const evaluationModel = buildEvaluationModel({ runtimeSignals, operatorPolicy });
  const guardedActions = buildGuardedActions({ runtimeSignals, evaluationModel, operatorPolicy });
  const guardedActionResults = state.guardedActionResults || {};
  const autonomyAuditLog = state.autonomyAuditLog || [];
  const recoveryLog = state.recoveryLog || [];
  const lastRecoveryAction = state.lastRecoveryAction || null;
  const recommendationLoop = buildRecommendationLoop({
    runtimeSignals,
    evaluationModel,
    guardedActions,
    operatorPolicy
  });
  const recommendationLog = mergeRecommendationLog(state.recommendationLog || [], recommendationLoop.current);
  const currentTrendSnapshot = createRuntimeTrendSnapshot({
    evaluationModel,
    recommendationLoop,
    operatorPolicy,
    lastRecoveryAction,
    recoveryLog,
    recommendationLog
  });
  const runtimeTrendSummary = buildRuntimeTrendSummary({
    currentSnapshot: currentTrendSnapshot,
    history: state.runtimeTrendHistory || [],
    recoveryLog,
    recommendationLog
  });
  const runtimeTrendHistory = mergeRuntimeTrendHistory(state.runtimeTrendHistory || [], currentTrendSnapshot);
  const rawControlledAlerts = buildControlledAlerts({
    runtimeSignals,
    executionStatus,
    protectionState,
    recommendationLoop,
    runtimeTrendSummary
  });
  const controlledAlerts = {
    ...rawControlledAlerts,
    alerts: (rawControlledAlerts.alerts || []).map((alert) => ({
      ...alert,
      symbol: snapshot.selectedSymbol,
      watchlistId: runtimeWatchlists.activeWatchlist?.id || "",
      watchlistName: runtimeWatchlists.activeWatchlist?.name || "",
      sessionTags: runtimeWatchlists.activeWatchlist?.sessionTags || [],
      sessionIntent: runtimeWatchlists.activeWatchlist?.sessionIntent || ""
    }))
  };
  const autonomyDiagnostics = buildAutonomyDiagnostics({
    runtimeSignals,
    evaluationModel,
    guardedActions,
    operatorPolicy,
    recommendationLoop,
    lastRecoveryAction
  });
  const productMemory = buildProductMemory({
    selectedSymbol: snapshot.selectedSymbol,
    selectedRoute: snapshot.selectedRoute,
    runtimeSignals,
    evaluationModel,
    controlledAlerts,
    recentActions,
    autonomyAuditLog,
    recoveryLog,
    recommendationLog,
    runtimeTrendHistory
  });
  const infinityLoop = buildInfinityLoop({
    runtimeSignals,
    evaluationModel,
    recommendationLoop,
    guardedActions,
    lastRecoveryAction,
    productMemory
  });
  const infinityOrchestrator = buildInfinityOrchestrator({
    runtimeSignals,
    evaluationModel,
    guardedActions,
    operatorPolicy,
    recommendationLoop,
    connectorReadiness,
    controlledAlerts,
    runtimeTrendSummary,
    productMemory,
    infinityLoop
  });
  const operatorReports = buildOperatorReports({
    autonomyAuditLog,
    runtimeTrendHistory,
    runtimeTrendSummary,
    recoveryLog,
    recommendationLog,
    connectorReadiness,
    controlledAlerts,
    operatorPolicy,
    evaluationModel,
    runtimeSignals,
    lastRecoveryAction,
    recommendationLoop
  });
  const operatorDiagnostics = buildOperatorDiagnostics({
    activeWatch: snapshot.activeWatch,
    primaryRoute: snapshot.selectedRoute,
    liveDataStatus: liveSnapshot.liveDataStatus,
    liveDataDiagnostics: liveSnapshot.liveDataDiagnostics,
    executionStatus,
    riskSummary: snapshot.riskSummary,
    protectionState,
    riskMode,
    symbolRuntimeHealth: liveSnapshot.symbolRuntimeHealth,
    recentActions,
    autonomyDiagnostics
  });
  const continuityInsightReports = (state.continuityInsightReports || []).map((report) =>
    buildContinuityInsightReportRecord(report.name, report, report)
  );
  const continuityInsightCollections = (state.continuityInsightCollections || []).map((collection) =>
    buildContinuityInsightCollectionRecord(
      { continuityInsightReports },
      collection.name,
      collection,
      collection
    )
  );
  const continuityInsightComparison = resolveContinuityInsightComparisonIds(
    continuityInsightReports,
    state.continuityInsightPrimaryReportId || state.activeContinuityInsightReportId || "",
    state.continuityInsightComparisonReportId || "",
    state.activeContinuityInsightReportId || ""
  );

  return {
    hydrated: true,
    baseData,
    selectedSymbol: snapshot.selectedSymbol,
    selectedRoute: snapshot.selectedRoute,
    chartData: snapshot.chartData,
    orderTicket: resolvedOrderTicket,
    aiGuidance: snapshot.aiGuidance,
    activeWatch: snapshot.activeWatch,
    routeNotes: snapshot.routeNotes,
    marketPosture: snapshot.marketPosture,
    riskMode,
    protectionState,
    riskSummary: snapshot.riskSummary,
    openPositions,
    recentOrders,
    recentActions,
    sessionNotes,
    reviewSnapshots: state.reviewSnapshots || [],
    activeReviewSnapshotId: state.activeReviewSnapshotId || "",
    continuityFilterPresets: (state.continuityFilterPresets || []).map((preset) =>
      buildContinuityFilterPresetRecord(preset.name, preset, preset)
    ),
    continuityWorkspaceMacros: (state.continuityWorkspaceMacros || []).map((macro) =>
      buildContinuityWorkspaceMacroRecord(state, macro.name, macro, macro)
    ),
    activeContinuityMacroId: String(state.activeContinuityMacroId || ""),
    continuityInsightReports,
    activeContinuityInsightReportId:
      continuityInsightReports.some((report) => report.id === state.activeContinuityInsightReportId)
        ? String(state.activeContinuityInsightReportId || "")
        : continuityInsightComparison.primaryReportId,
    continuityInsightCollections,
    activeContinuityInsightCollectionId: continuityInsightCollections.some(
      (collection) => collection.id === state.activeContinuityInsightCollectionId
    )
      ? String(state.activeContinuityInsightCollectionId || "")
      : "",
    continuityInsightPrimaryReportId: continuityInsightComparison.primaryReportId,
    continuityInsightComparisonReportId: continuityInsightComparison.comparisonReportId,
    replayReviewMarks: state.replayReviewMarks || {},
    replayQueues: (state.replayQueues || []).map((queue) => buildReplayQueueRecord(queue.name, queue)),
    activeReplayQueueId: state.activeReplayQueueId || "",
    queueDriftBaselines: (state.queueDriftBaselines || [])
      .map((baseline) => buildQueueDriftBaselineRecord(baseline.name, baseline, baseline))
      .filter((baseline) => baseline.pack),
    handoffNotes: state.handoffNotes || [],
    pinnedReviewSnapshotIds: normalizePinnedIds(state.pinnedReviewSnapshotIds || []),
    pinnedReplayQueueIds: normalizePinnedIds(state.pinnedReplayQueueIds || []),
    pinnedHandoffNoteIds: normalizePinnedIds(state.pinnedHandoffNoteIds || []),
    continuityAlertHistory: (state.continuityAlertHistory || []).map((alert) =>
      buildContinuityAlertRecord(alert, alert)
    ),
    savedWatchlists: runtimeWatchlists.savedWatchlists,
    watchlistTemplates: getSavedWatchlistTemplates(),
    startupTemplateKey: String(state.startupTemplateKey || ""),
    activeWatchlistId: runtimeWatchlists.activeWatchlistId,
    activeWatchlist: runtimeWatchlists.activeWatchlist,
    watchlist: liveSnapshot.watchlist,
    marketFeeds: liveSnapshot.marketFeeds,
    routeLibrary: liveSnapshot.routeLibrary,
    quoteMap: liveSnapshot.quoteMap,
    signalBoard: liveSnapshot.signalBoard,
    tradeTape: liveSnapshot.tradeTape,
    chartOverlayModel,
    liveDataSource,
    chartTimeframe,
    liveDataStatus: liveSnapshot.liveDataStatus,
    liveDataDiagnostics: liveSnapshot.liveDataDiagnostics,
    symbolRuntimeHealth: liveSnapshot.symbolRuntimeHealth,
    runtimeSignals,
    evaluationModel,
    operatorPolicy,
    connectorReadiness,
    controlledAlerts,
    guardedActions,
    guardedActionResults,
    autonomyAuditLog,
    autonomyDiagnostics,
    recommendationLoop,
    recommendationLog,
    autonomyMode: operatorPolicy.mode,
    lastRecoveryAction,
    recoveryLog,
    runtimeTrendHistory,
    runtimeTrendSummary,
    operatorReports,
    productMemory,
    infinityLoop,
    infinityOrchestrator,
    liveDataProviders: getLiveDataProviderCatalog(),
    chartTimeframes: getLiveChartTimeframes(),
    liveTick,
    liveAdapterRuntime,
    trackedSymbols,
    executionProvider,
    executionProviders: getExecutionProviderCatalog(),
    executionStatus,
    executionEvents,
    operatorDiagnostics,
    themeMode: state.themeMode || "Desk Dark",
    densityMode: state.densityMode || "Comfortable",
    defaultRiskMode: state.defaultRiskMode || "Balanced",
    preferredSymbol: state.preferredSymbol || "",
    preferredRoute: state.preferredRoute || ""
  };
}

function pushAction(currentActions, title, detail, status = "Logged", meta = {}) {
  return [
    {
      id: createId("ACT"),
      title,
      detail,
      status,
      ...meta
    },
    ...currentActions
  ];
}

function applyExecutionState(current, executionPatch = {}) {
  if (!current.baseData) return current;
  return rehydrateState(current.baseData, {
    ...current,
    ...executionPatch
  });
}

export const useProductTradingStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      initialize(baseData) {
        if (!baseData) return;
        const current = get();
        const startupState = current.hydrated ? current : applyStartupTemplateState(current);
        set(rehydrateState(baseData, startupState));
      },
      refreshDerivedState(overrides = {}) {
        const current = get();
        if (!current.baseData) return;
        set(rehydrateState(current.baseData, { ...current, ...overrides }));
      },
      selectSymbol(symbol) {
        const current = get();
        if (!current.baseData) return;
        const mappedSymbol = resolveProviderMapping(symbol).symbol;
        const nextWatchlists = (current.savedWatchlists || []).map((item) =>
          item.id === current.activeWatchlistId
            ? {
                ...item,
                symbols: mergeRuntimeSymbols(item.symbols || [], [mappedSymbol]),
                updatedAt: new Date().toISOString()
              }
            : item
        );
        set(
          rehydrateState(current.baseData, {
            ...current,
            selectedSymbol: mappedSymbol,
            preferredSymbol: mappedSymbol,
            savedWatchlists: nextWatchlists,
            trackedSymbols: mergeRuntimeSymbols(current.trackedSymbols || [], [mappedSymbol]),
            orderTicket: {}
          })
        );
      },
      selectRoute(routeIdentifier) {
        const current = get();
        const match = current.routeLibrary.find(
          (route) => route.name === routeIdentifier || route.asset === routeIdentifier
        );
        if (!match || !current.baseData) return;

        set(
          rehydrateState(current.baseData, {
            ...current,
            selectedSymbol: match.asset,
            preferredSymbol: match.asset,
            savedWatchlists: (current.savedWatchlists || []).map((item) =>
              item.id === current.activeWatchlistId
                ? {
                    ...item,
                    symbols: mergeRuntimeSymbols(item.symbols || [], [match.asset]),
                    updatedAt: new Date().toISOString()
                  }
                : item
            ),
            trackedSymbols: mergeRuntimeSymbols(current.trackedSymbols || [], [match.asset]),
            preferredRoute: match.name
          })
        );
      },
      setLiveDataSource(liveDataSource) {
        const current = get();
        if (!current.baseData) return;
        const recoveryEntry =
          current.liveDataSource !== "demo" && liveDataSource === "demo"
            ? createAutonomyRecord({
                key: "apply-safe-feed-fallback",
                label: "Safe feed fallback applied",
                detail: "The workspace returned to the local demo feed to keep runtime data on the safest supported source.",
                status: "Logged",
                tone: "warning"
              })
            : null;
        const recoveryState = buildRecoveryState(current, recoveryEntry);

        set(
          rehydrateState(current.baseData, {
            ...current,
            ...recoveryState,
            liveDataSource,
            liveAdapterRuntime: null
          })
        );
      },
      setChartTimeframe(chartTimeframe) {
        const current = get();
        if (!current.baseData) return;
        const timeframeKey = resolveLiveTimeframe(chartTimeframe).key;

        set(
          rehydrateState(current.baseData, {
            ...current,
            chartTimeframe: timeframeKey
          })
        );
      },
      tickLiveData() {
        const current = get();
        if (!current.baseData || current.liveDataSource !== "demo") return;

        set(
          rehydrateState(current.baseData, {
            ...current,
            liveTick: (current.liveTick || 0) + 1
          })
        );
      },
      async refreshLiveDataAdapter() {
        const current = get();
        if (!current.baseData || current.liveDataSource === "demo") return;

        const symbols = buildLiveAdapterSymbolSet(current);
        const selectedSymbol = current.selectedSymbol || symbols[0] || current.baseData.primaryRoute?.asset;
        const requestKey = JSON.stringify({
          source: current.liveDataSource,
          selectedSymbol,
          symbols,
          chartTimeframe: current.chartTimeframe
        });

        if (!selectedSymbol) return;
        if (activeLiveAdapterRefresh && activeLiveAdapterRefreshKey === requestKey) {
          return activeLiveAdapterRefresh;
        }

        const refreshTask = (async () => {
          try {
            const liveAdapterRuntime = await fetchLiveDataAdapterSnapshot({
              liveDataSource: current.liveDataSource,
              symbols,
              selectedSymbol,
              timeframe: current.chartTimeframe
            });
            const latest = get();
            if (!latest.baseData) return;

            set(
              rehydrateState(latest.baseData, {
                ...latest,
                liveAdapterRuntime
              })
            );
          } catch (error) {
            const latest = get();
            if (!latest.baseData) return;

            const fallbackRuntime = {
              ok: false,
              fallback: true,
              provider: {
                key: "twelve-data",
                label: "Twelve Data",
                state: "Fallback to Demo",
                tone: "warning",
                mode: "Read-only live polling with demo fallback",
                connectorState: "Fallback Active",
                providerState: "Fallback to Demo",
                readinessState: "Blocked",
                lastUpdate: getTimeLabel(),
                freshness: "Stale",
                latency: "--",
                feedHealth: "Fallback",
                signalState: "Monitoring",
                runtimeHealth: "70%",
                validationState: "Valid",
                configPath: ".env.local",
                blockedReason: "Twelve Data could not be refreshed from the local runtime.",
                degradedReason:
                  error instanceof Error ? error.message : "Unknown Twelve Data runtime failure.",
                adapterSupported: true,
                fallbackActive: true,
                readOnly: true
              },
              quotes: [],
              chart: null
            };

            set(
              rehydrateState(latest.baseData, {
                ...latest,
                liveAdapterRuntime: fallbackRuntime
              })
            );
          } finally {
            if (activeLiveAdapterRefreshKey === requestKey) {
              activeLiveAdapterRefresh = null;
              activeLiveAdapterRefreshKey = "";
            }
          }
        })();

        activeLiveAdapterRefresh = refreshTask;
        activeLiveAdapterRefreshKey = requestKey;

        return refreshTask;
      },
      setExecutionProvider(executionProvider) {
        const current = get();
        if (!current.baseData) return;

        set(
          rehydrateState(current.baseData, {
            ...current,
            executionProvider
          })
        );
      },
      updateOrderTicketField(field, value) {
        set((state) => ({
          orderTicket: {
            ...state.orderTicket,
            [field]: value
          }
        }));
      },
      setTicketSide(side) {
        set((state) => ({
          orderTicket: {
            ...state.orderTicket,
            side
          }
        }));
      },
      setRiskMode(riskMode) {
        const current = get();
        if (!current.baseData) return;
        const recoveryEntry =
          riskModeRank(riskMode) < riskModeRank(current.riskMode)
            ? createAutonomyRecord({
                key: "apply-safe-risk-mode-downgrade",
                label: "Safe risk mode downgrade applied",
                detail: `Risk mode was lowered from ${current.riskMode} to ${riskMode} to preserve local risk posture.`,
                status: "Logged",
                tone: "warning"
              })
            : null;
        const recoveryState = buildRecoveryState(current, recoveryEntry);

        set(
          rehydrateState(current.baseData, {
            ...current,
            ...recoveryState,
            riskMode
          })
        );
      },
      setProtectionState(protectionState) {
        const current = get();
        if (!current.baseData) return;

        set(
          rehydrateState(current.baseData, {
            ...current,
            protectionState
          })
        );
      },
      setThemeMode(themeMode) {
        set({ themeMode });
      },
      setDensityMode(densityMode) {
        set({ densityMode });
      },
      setDefaultRiskMode(defaultRiskMode) {
        const current = get();
        set({ defaultRiskMode });
        if (current.riskMode === current.defaultRiskMode) {
          get().setRiskMode(defaultRiskMode);
        }
      },
      setPreferredSymbol(preferredSymbol) {
        const mappedSymbol = resolveProviderMapping(preferredSymbol).symbol;
        set((state) => ({
          preferredSymbol: mappedSymbol,
          trackedSymbols: mergeRuntimeSymbols(state.trackedSymbols || [], [mappedSymbol])
        }));
      },
      setPreferredRoute(preferredRoute) {
        set({ preferredRoute });
      },
      activateSavedWatchlist(watchlistId) {
        const current = get();
        if (!current.baseData) return;
        const nextWatchlist = (current.savedWatchlists || []).find((item) => item.id === watchlistId);
        if (!nextWatchlist) return;
        const activationState = buildWatchlistActivationState(current, nextWatchlist);

        set(
          rehydrateState(current.baseData, {
            ...current,
            ...activationState,
            recentActions: pushAction(
              current.recentActions,
              "Watchlist activated",
              `${nextWatchlist.name} loaded with ${nextWatchlist.preset?.preferredTimeframe || activationState.chartTimeframe} focus and ${nextWatchlist.preset?.preferredDensityMode || activationState.densityMode} density.`,
              "Logged",
              {
                symbol: activationState.selectedSymbol,
                watchlistId: nextWatchlist.id,
                watchlistName: nextWatchlist.name,
                sessionTags: nextWatchlist.sessionTags || [],
                sessionIntent: nextWatchlist.sessionIntent || ""
              }
            )
          })
        );
      },
      createSavedWatchlist(name, symbols = []) {
        const current = get();
        if (!current.baseData) return;
        const watchlistSymbols = mergeRuntimeSymbols(
          symbols.length ? symbols : current.watchlist.map((item) => item.symbol),
          []
        );
        if (!watchlistSymbols.length) return;
        const record = buildSavedWatchlistRecord(name, watchlistSymbols, {
          fallbackName: `Watchlist ${(current.savedWatchlists?.length || 0) + 1}`,
          preset: captureWatchlistPresetFromState(current, watchlistSymbols)
        });
        const activationState = buildWatchlistActivationState(current, record);

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: [record, ...(current.savedWatchlists || [])],
            ...activationState,
            recentActions: pushAction(
              current.recentActions,
              "Watchlist created",
              `${record.name} captured the current workspace symbol, route, timeframe, and density preset locally.`,
              "Logged",
              {
                symbol: activationState.selectedSymbol,
                watchlistId: record.id,
                watchlistName: record.name,
                sessionTags: record.sessionTags || [],
                sessionIntent: record.sessionIntent || ""
              }
            )
          })
        );
      },
      createSavedWatchlistFromTemplate(templateKey, nameOverride = "") {
        const current = get();
        if (!current.baseData) return;
        const template = resolveWatchlistTemplate(templateKey);
        if (!template) return;
        const baseName = String(nameOverride || "").trim() || `${template.name} Copy`;
        const existingNames = new Set((current.savedWatchlists || []).map((item) => item.name.toLowerCase()));
        let candidateName = baseName;
        let index = 2;

        while (existingNames.has(candidateName.toLowerCase())) {
          candidateName = `${baseName} ${index}`;
          index += 1;
        }

        const record = buildSavedWatchlistRecord(candidateName, template.symbols, {
          preset: template.preset,
          notes: template.notes,
          sessionTags: template.sessionTags,
          sessionIntent: template.sessionIntent
        });
        const activationState = buildWatchlistActivationState(current, record);

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: [record, ...(current.savedWatchlists || [])],
            ...activationState,
            recentActions: pushAction(
              current.recentActions,
              "Watchlist cloned from template",
              `${record.name} was created from ${template.name} with local presets, tags, and session intent applied.`,
              "Logged",
              {
                symbol: activationState.selectedSymbol,
                watchlistId: record.id,
                watchlistName: record.name,
                sessionTags: record.sessionTags || [],
                sessionIntent: record.sessionIntent || ""
              }
            )
          })
        );
      },
      setStartupTemplate(templateKey) {
        const current = get();
        const template = resolveWatchlistTemplate(templateKey);
        if (!template) return;

        if (!current.baseData) {
          set({ startupTemplateKey: template.key });
          return;
        }

        set(
          rehydrateState(current.baseData, {
            ...current,
            startupTemplateKey: template.key,
            recentActions: pushAction(
              current.recentActions,
              "Startup template armed",
              `${template.name} will load on the next workspace launch with its local market-set preset.`,
              "Logged",
              {
                symbol: template.preset?.preferredSymbol || current.selectedSymbol,
                watchlistId: getStartupTemplateRecordId(template.key),
                watchlistName: template.name,
                sessionTags: template.sessionTags || [],
                sessionIntent: template.sessionIntent || ""
              }
            )
          })
        );
      },
      clearStartupTemplate() {
        const current = get();

        if (!current.baseData) {
          set({ startupTemplateKey: "" });
          return;
        }

        set(
          rehydrateState(current.baseData, {
            ...current,
            startupTemplateKey: "",
            recentActions: pushAction(
              current.recentActions,
              "Startup template cleared",
              "The workspace will resume normal local startup behavior on the next launch.",
              "Logged"
            )
          })
        );
      },
      renameSavedWatchlist(watchlistId, name) {
        const current = get();
        if (!current.baseData) return;
        const nextName = String(name || "").trim();
        if (!nextName) return;

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: (current.savedWatchlists || []).map((item) =>
              item.id === watchlistId
                ? {
                    ...item,
                    name: nextName,
                    updatedAt: new Date().toISOString()
                  }
                : item
            )
          })
        );
      },
      updateSavedWatchlistContext(watchlistId, context = {}) {
        const current = get();
        if (!current.baseData) return;
        const nextWatchlist = (current.savedWatchlists || []).find((item) => item.id === watchlistId);
        if (!nextWatchlist) return;
        const notes = normalizeWatchlistNotes(context.notes);
        const sessionTags = normalizeWatchlistTags(context.sessionTags || context.tags);
        const sessionIntent = normalizeSessionIntent(context.sessionIntent || context.intent);

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: (current.savedWatchlists || []).map((item) =>
              item.id === watchlistId
                ? {
                    ...item,
                    notes,
                    sessionTags,
                    sessionIntent,
                    updatedAt: new Date().toISOString()
                  }
                : item
            ),
            recentActions: pushAction(
              current.recentActions,
              "Watchlist context saved",
              `${nextWatchlist.name} now carries ${sessionTags.length} tag(s), ${sessionIntent || "no session intent"}, and ${notes ? "a local note" : "no local note"}.`,
              "Logged",
              {
                symbol: current.selectedSymbol,
                watchlistId: nextWatchlist.id,
                watchlistName: nextWatchlist.name,
                sessionTags,
                sessionIntent
              }
            )
          })
        );
      },
      captureSavedWatchlistPreset(watchlistId) {
        const current = get();
        if (!current.baseData) return;
        const nextWatchlist = (current.savedWatchlists || []).find((item) => item.id === watchlistId);
        if (!nextWatchlist) return;
        const preset = captureWatchlistPresetFromState(current, nextWatchlist.symbols || []);

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: (current.savedWatchlists || []).map((item) =>
              item.id === watchlistId
                ? {
                    ...item,
                    preset,
                    updatedAt: new Date().toISOString()
                  }
                : item
            ),
            recentActions: pushAction(
              current.recentActions,
              "Watchlist preset saved",
              `${nextWatchlist.name} now remembers ${preset.preferredSymbol || "the active symbol"}, ${preset.preferredTimeframe}, ${preset.preferredDensityMode}, and ${preset.preferredRoute || "the current route focus"}.`,
              "Logged",
              {
                symbol: preset.preferredSymbol || current.selectedSymbol,
                watchlistId: nextWatchlist.id,
                watchlistName: nextWatchlist.name,
                sessionTags: nextWatchlist.sessionTags || [],
                sessionIntent: nextWatchlist.sessionIntent || ""
              }
            )
          })
        );
      },
      pinSavedWatchlist(watchlistId) {
        const current = get();
        if (!current.baseData) return;

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: (current.savedWatchlists || []).map((item) => ({
              ...item,
              pinned: item.id === watchlistId,
              updatedAt: item.id === watchlistId ? new Date().toISOString() : item.updatedAt
            }))
          })
        );
      },
      removeSavedWatchlist(watchlistId) {
        const current = get();
        if (!current.baseData || (current.savedWatchlists || []).length <= 1) return;
        const removingActive = current.activeWatchlistId === watchlistId;
        const nextWatchlists = (current.savedWatchlists || []).filter((item) => item.id !== watchlistId);
        const nextActiveId =
          removingActive
            ? nextWatchlists.find((item) => item.pinned)?.id || nextWatchlists[0]?.id || ""
            : current.activeWatchlistId;
        const nextActive = nextWatchlists.find((item) => item.id === nextActiveId) || nextWatchlists[0];
        const activationState = removingActive && nextActive ? buildWatchlistActivationState(current, nextActive) : {};
        const removedWatchlist = (current.savedWatchlists || []).find((item) => item.id === watchlistId);

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: nextWatchlists,
            ...activationState,
            activeWatchlistId: nextActiveId,
            recentActions: pushAction(
              current.recentActions,
              "Watchlist removed",
              `${removedWatchlist?.name || "Saved watchlist"} was removed. ${nextActive?.name || "Fallback watchlist"} is now active locally.`,
              "Logged",
              {
                symbol: activationState.selectedSymbol || current.selectedSymbol,
                watchlistId: nextActive?.id || "",
                watchlistName: nextActive?.name || "",
                sessionTags: nextActive?.sessionTags || [],
                sessionIntent: nextActive?.sessionIntent || ""
              }
            )
          })
        );
      },
      importSavedWatchlists(importedPayload) {
        const current = get();
        if (!current.baseData) return;
        const fallbackSymbols = (current.baseData.watchlist || []).map((item) => item.symbol);
        const importResolution = mergeImportedSavedWatchlists(
          current.savedWatchlists || [],
          importedPayload,
          fallbackSymbols
        );
        const mergedWatchlists = importResolution.watchlists || [];
        if (!mergedWatchlists.length) return;
        const currentActiveStillExists = mergedWatchlists.some((item) => item.id === current.activeWatchlistId);
        const nextActive =
          mergedWatchlists.find((item) => item.id === current.activeWatchlistId) ||
          mergedWatchlists.find((item) => item.pinned) ||
          mergedWatchlists[0];
        const activationState = currentActiveStillExists ? {} : buildWatchlistActivationState(current, nextActive);
        const importedCount = importResolution.preview?.newCount || 0;
        const mergedCount = importResolution.preview?.mergeCount || 0;
        const skippedCount = importResolution.preview?.skipCount || 0;

        set(
          rehydrateState(current.baseData, {
            ...current,
            savedWatchlists: mergedWatchlists,
            ...activationState,
            activeWatchlistId: currentActiveStillExists ? current.activeWatchlistId : nextActive?.id || current.activeWatchlistId,
            recentActions: pushAction(
              current.recentActions,
              "Watchlists imported",
              `${importedCount} added, ${mergedCount} merged, and ${skippedCount} skipped while preserving local presets and context.`,
              "Logged",
              {
                symbol: current.selectedSymbol,
                watchlistId: currentActiveStillExists ? current.activeWatchlistId : nextActive?.id || "",
                watchlistName: currentActiveStillExists ? current.activeWatchlist?.name || "" : nextActive?.name || "",
                sessionTags: currentActiveStillExists
                  ? current.activeWatchlist?.sessionTags || []
                  : nextActive?.sessionTags || [],
                sessionIntent: currentActiveStillExists
                  ? current.activeWatchlist?.sessionIntent || ""
                  : nextActive?.sessionIntent || ""
              }
            )
          })
        );
      },
      stageOrder(sideOverride) {
        const current = get();
        if (!current.baseData || !current.orderTicket || !current.selectedRoute) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "stageOrder",
          current,
          payload: { side: sideOverride || current.orderTicket.side },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      placeOrder(sideOverride, existingOrderId) {
        const current = get();
        if (!current.baseData || !current.orderTicket || !current.selectedRoute) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "placeOrder",
          current,
          payload: {
            side: sideOverride || current.orderTicket.side,
            orderId: existingOrderId
          },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      amendOrder(orderId, patch = {}) {
        const current = get();
        if (!current.baseData) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "amendOrder",
          current,
          payload: {
            orderId,
            patch: {
              size: patch.size || current.orderTicket?.size,
              entry: patch.entry || current.orderTicket?.entry,
              stop: patch.stop || current.orderTicket?.stop,
              target: patch.target || current.orderTicket?.target,
              type: patch.type || current.orderTicket?.type
            }
          },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      updateExecutionStatus(orderId, status) {
        const current = get();
        if (!current.baseData) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "updateStatus",
          current,
          payload: { orderId, status },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      fillOrder(orderId) {
        get().updateExecutionStatus(orderId, "Filled");
      },
      partialFillOrder(orderId) {
        get().updateExecutionStatus(orderId, "Partially Filled");
      },
      rejectOrder(orderId, reason) {
        const current = get();
        if (!current.baseData) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "updateStatus",
          current,
          payload: { orderId, status: "Rejected", reason },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      closePosition(positionKey) {
        const current = get();
        if (!current.baseData) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "closePosition",
          current,
          payload: { positionKey },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      cancelOrder(orderId) {
        const current = get();
        if (!current.baseData) return;

        const executionPatch = runExecutionAction({
          providerKey: current.executionProvider,
          action: "cancelOrder",
          current,
          payload: { orderId },
          helpers: executionHelpers
        });

        set(applyExecutionState(current, executionPatch));
      },
      addSessionNote(note) {
        const current = get();
        const value = note.trim();
        if (!value) return;
        const activeWatchlist = current.activeWatchlist;
        const entry = {
          id: createId("NOTE"),
          symbol: current.selectedSymbol,
          route: current.selectedRoute?.name || "No active route",
          text: value,
          watchlistId: activeWatchlist?.id || "",
          watchlistName: activeWatchlist?.name || "",
          sessionTags: activeWatchlist?.sessionTags || [],
          sessionIntent: activeWatchlist?.sessionIntent || ""
        };

        set({
          sessionNotes: [entry, ...current.sessionNotes],
          recentActions: pushAction(
            current.recentActions,
            "Session note added",
            `${current.selectedSymbol} | ${current.selectedRoute?.name || "No route"}`,
            "Logged",
            {
              symbol: current.selectedSymbol,
              watchlistId: activeWatchlist?.id || "",
              watchlistName: activeWatchlist?.name || "",
              sessionTags: activeWatchlist?.sessionTags || [],
              sessionIntent: activeWatchlist?.sessionIntent || ""
            }
          )
        });
      },
      saveReviewSnapshot(name, baselinePack, comparisonPack) {
        if (!baselinePack || !comparisonPack) return;
        const current = get();
        const snapshot = buildReviewSnapshotRecord(name, baselinePack, comparisonPack);

        set({
          reviewSnapshots: [snapshot, ...(current.reviewSnapshots || [])].slice(0, 12),
          recentActions: pushAction(
            current.recentActions,
            "Review snapshot saved",
            `${snapshot.name} stored a local baseline comparison for ${snapshot.summary}.`,
            "Logged"
          )
        });
      },
      removeReviewSnapshot(snapshotId) {
        const current = get();
        const removed = (current.reviewSnapshots || []).find((item) => item.id === snapshotId);
        if (!removed) return;

        set({
          reviewSnapshots: (current.reviewSnapshots || []).filter((item) => item.id !== snapshotId),
          activeReviewSnapshotId: current.activeReviewSnapshotId === snapshotId ? "" : current.activeReviewSnapshotId,
          pinnedReviewSnapshotIds: (current.pinnedReviewSnapshotIds || []).filter((item) => item !== snapshotId),
          recentActions: pushAction(
            current.recentActions,
            "Review snapshot removed",
            `${removed.name} was removed from the local comparison history.`,
            "Logged"
          )
        });
      },
      loadReviewSnapshot(snapshotId) {
        const current = get();
        const snapshot = (current.reviewSnapshots || []).find((item) => item.id === snapshotId);
        if (!snapshot) return;

        set({
          activeReviewSnapshotId: snapshot.id,
          recentActions: pushAction(
            current.recentActions,
            "Review snapshot loaded",
            `${snapshot.name} is now the active local comparison baseline.`,
            "Logged"
          )
        });
      },
      saveContinuityFilterPreset(name, filters = {}) {
        const current = get();
        const preset = buildContinuityFilterPresetRecord(name, filters);

        set({
          continuityFilterPresets: [preset, ...(current.continuityFilterPresets || [])].slice(0, 16),
          recentActions: pushAction(
            current.recentActions,
            "Continuity view saved",
            `${preset.name} stored the current local continuity timeline filters.`,
            "Logged"
          )
        });
      },
      renameContinuityFilterPreset(presetId, name) {
        const current = get();
        const existing = (current.continuityFilterPresets || []).find((item) => item.id === presetId);
        if (!existing) return;
        const nextPreset = buildContinuityFilterPresetRecord(name, existing, existing);

        set({
          continuityFilterPresets: (current.continuityFilterPresets || []).map((item) =>
            item.id === presetId ? nextPreset : item
          ),
          recentActions: pushAction(
            current.recentActions,
            "Continuity view renamed",
            `${existing.name} is now ${nextPreset.name}.`,
            "Logged"
          )
        });
      },
      removeContinuityFilterPreset(presetId) {
        const current = get();
        const existing = (current.continuityFilterPresets || []).find((item) => item.id === presetId);
        if (!existing) return;

        set({
          continuityFilterPresets: (current.continuityFilterPresets || []).filter((item) => item.id !== presetId),
          recentActions: pushAction(
            current.recentActions,
            "Continuity view removed",
            `${existing.name} was removed from local continuity presets.`,
            "Logged"
          )
        });
      },
      saveContinuityWorkspaceMacro(name, payload = {}) {
        const current = get();
        const macro = buildContinuityWorkspaceMacroRecord(current, name, payload);

        set({
          continuityWorkspaceMacros: [macro, ...(current.continuityWorkspaceMacros || [])].slice(0, 12),
          activeContinuityMacroId: macro.id,
          recentActions: pushAction(
            current.recentActions,
            "Continuity macro saved",
            `${macro.name} stored a reusable local review launch bundle.`,
            "Logged"
          )
        });
      },
      renameContinuityWorkspaceMacro(macroId, name) {
        const current = get();
        const existing = (current.continuityWorkspaceMacros || []).find((item) => item.id === macroId);
        if (!existing) return;
        const nextMacro = buildContinuityWorkspaceMacroRecord(current, name, existing, existing);

        set({
          continuityWorkspaceMacros: (current.continuityWorkspaceMacros || []).map((item) =>
            item.id === macroId ? nextMacro : item
          ),
          recentActions: pushAction(
            current.recentActions,
            "Continuity macro renamed",
            `${existing.name} is now ${nextMacro.name}.`,
            "Logged"
          )
        });
      },
      removeContinuityWorkspaceMacro(macroId) {
        const current = get();
        const existing = (current.continuityWorkspaceMacros || []).find((item) => item.id === macroId);
        if (!existing) return;

        set({
          continuityWorkspaceMacros: (current.continuityWorkspaceMacros || []).filter((item) => item.id !== macroId),
          activeContinuityMacroId:
            current.activeContinuityMacroId === macroId
              ? (current.continuityWorkspaceMacros || []).find((item) => item.id !== macroId)?.id || ""
              : current.activeContinuityMacroId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity macro removed",
            `${existing.name} was removed from local continuity macros.`,
            "Logged"
          )
        });
      },
      saveContinuityInsightReport(name, payload = {}) {
        const current = get();
        const report = buildContinuityInsightReportRecord(name, payload);
        const nextReports = [report, ...(current.continuityInsightReports || [])].slice(0, 18);
        const nextComparison = resolveContinuityInsightComparisonIds(
          nextReports,
          report.id,
          current.continuityInsightPrimaryReportId || current.activeContinuityInsightReportId || "",
          report.id
        );

        set({
          continuityInsightReports: nextReports,
          activeContinuityInsightReportId: report.id,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight report saved",
            `${report.name} bundled the current local continuity reasoning for later review.`,
            "Logged"
          )
        });
      },
      renameContinuityInsightReport(reportId, name) {
        const current = get();
        const existing = (current.continuityInsightReports || []).find((item) => item.id === reportId);
        if (!existing) return;
        const nextReport = buildContinuityInsightReportRecord(name, existing, existing);
        const nextReports = (current.continuityInsightReports || []).map((item) =>
          item.id === reportId ? nextReport : item
        );
        const nextCollections = (current.continuityInsightCollections || []).map((collection) =>
          buildContinuityInsightCollectionRecord(
            { continuityInsightReports: nextReports },
            collection.name,
            collection,
            collection
          )
        );

        set({
          continuityInsightReports: nextReports,
          continuityInsightCollections: nextCollections,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight report renamed",
            `${existing.name} is now ${nextReport.name}.`,
            "Logged"
          )
        });
      },
      removeContinuityInsightReport(reportId) {
        const current = get();
        const existing = (current.continuityInsightReports || []).find((item) => item.id === reportId);
        if (!existing) return;
        const nextReports = (current.continuityInsightReports || []).filter((item) => item.id !== reportId);
        const nextCollections = (current.continuityInsightCollections || []).map((collection) =>
          buildContinuityInsightCollectionRecord(
            { continuityInsightReports: nextReports },
            collection.name,
            {
              ...collection,
              reportIds: (collection.reportIds || []).filter((id) => id !== reportId)
            },
            collection
          )
        );
        const nextComparison = resolveContinuityInsightComparisonIds(
          nextReports,
          current.continuityInsightPrimaryReportId === reportId ? "" : current.continuityInsightPrimaryReportId,
          current.continuityInsightComparisonReportId === reportId ? "" : current.continuityInsightComparisonReportId,
          current.activeContinuityInsightReportId === reportId ? "" : current.activeContinuityInsightReportId
        );

        set({
          continuityInsightReports: nextReports,
          continuityInsightCollections: nextCollections,
          activeContinuityInsightReportId: nextComparison.primaryReportId,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight report removed",
            `${existing.name} was removed from local continuity insight reports.`,
            "Logged"
          )
        });
      },
      loadContinuityInsightReport(reportId) {
        const current = get();
        const report = (current.continuityInsightReports || []).find((item) => item.id === reportId);
        if (!report) return;
        const nextComparison = resolveContinuityInsightComparisonIds(
          current.continuityInsightReports || [],
          report.id,
          current.continuityInsightComparisonReportId,
          report.id
        );

        set({
          activeContinuityInsightReportId: report.id,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight report reopened",
            `${report.name} reopened the saved continuity intelligence bundle.`,
            "Logged"
          )
        });
      },
      setContinuityInsightComparisonPair(primaryReportId, comparisonReportId = "", options = {}) {
        const current = get();
        const nextComparison = resolveContinuityInsightComparisonIds(
          current.continuityInsightReports || [],
          primaryReportId,
          comparisonReportId,
          current.activeContinuityInsightReportId
        );
        const primaryReport = (current.continuityInsightReports || []).find(
          (report) => report.id === nextComparison.primaryReportId
        );
        const comparisonReport = (current.continuityInsightReports || []).find(
          (report) => report.id === nextComparison.comparisonReportId
        );

        set({
          activeContinuityInsightReportId: nextComparison.primaryReportId,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          ...(options.silent
            ? {}
            : {
                recentActions: pushAction(
                  current.recentActions,
                  options.title || "Continuity insight pair reopened",
                  options.detail ||
                    `${primaryReport?.name || "Primary report"} vs ${comparisonReport?.name || "No comparison report"} is active for local delta review.`,
                  "Logged"
                )
              })
        });
      },
      reopenLatestContinuityInsightPair() {
        const current = get();
        const primaryReportId =
          current.continuityInsightPrimaryReportId ||
          current.activeContinuityInsightReportId ||
          (current.continuityInsightReports || [])[0]?.id ||
          "";
        if (!primaryReportId) return;
        get().setContinuityInsightComparisonPair(primaryReportId, current.continuityInsightComparisonReportId, {
          title: "Latest continuity insight pair reopened"
        });
      },
      createContinuityInsightCollection(name, payload = {}) {
        const current = get();
        const fallbackReportIds = [
          current.continuityInsightPrimaryReportId,
          current.continuityInsightComparisonReportId,
          current.activeContinuityInsightReportId
        ];
        const requestedReportIds =
          Array.isArray(payload.reportIds) && payload.reportIds.length ? payload.reportIds : fallbackReportIds;
        const collection = buildContinuityInsightCollectionRecord(
          current,
          name,
          { ...payload, reportIds: requestedReportIds }
        );
        if (!collection.reportIds.length) return;
        const nextCollections = [collection, ...(current.continuityInsightCollections || [])].slice(0, 12);
        const nextComparison = resolveContinuityInsightComparisonIds(
          current.continuityInsightReports || [],
          collection.reportIds[0] || current.continuityInsightPrimaryReportId || "",
          collection.reportIds.find((id) => id !== (collection.reportIds[0] || "")) || "",
          collection.reportIds[0] || current.activeContinuityInsightReportId || ""
        );

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId: collection.id,
          activeContinuityInsightReportId: nextComparison.primaryReportId,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight collection saved",
            `${collection.name} grouped ${collection.reportIds.length} reports into a reusable local review set.`,
            "Logged"
          )
        });
      },
      renameContinuityInsightCollection(collectionId, name) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        if (!existing) return;
        const nextCollection = buildContinuityInsightCollectionRecord(current, name, existing, existing);

        set({
          continuityInsightCollections: (current.continuityInsightCollections || []).map((item) =>
            item.id === collectionId ? nextCollection : item
          ),
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight collection renamed",
            `${existing.name} is now ${nextCollection.name}.`,
            "Logged"
          )
        });
      },
      removeContinuityInsightCollection(collectionId) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        if (!existing) return;

        set({
          continuityInsightCollections: (current.continuityInsightCollections || []).filter(
            (item) => item.id !== collectionId
          ),
          activeContinuityInsightCollectionId:
            current.activeContinuityInsightCollectionId === collectionId
              ? (current.continuityInsightCollections || []).find((item) => item.id !== collectionId)?.id || ""
              : current.activeContinuityInsightCollectionId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight collection removed",
            `${existing.name} was removed from local continuity collections.`,
            "Logged"
          )
        });
      },
      addContinuityInsightReportToCollection(collectionId, reportId) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        const report = (current.continuityInsightReports || []).find((item) => item.id === reportId);
        if (!existing || !report) return;
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          {
            ...existing,
            reportIds: [...(existing.reportIds || []), report.id]
          },
          existing
        );

        set({
          continuityInsightCollections: [nextCollection, ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)],
          activeContinuityInsightCollectionId: nextCollection.id,
          recentActions: pushAction(
            current.recentActions,
            "Continuity report added to collection",
            `${report.name} was added to ${nextCollection.name}.`,
            "Logged"
          )
        });
      },
      removeContinuityInsightReportFromCollection(collectionId, reportId) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        const report = (current.continuityInsightReports || []).find((item) => item.id === reportId);
        if (!existing || !report) return;
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          {
            ...existing,
            reportIds: (existing.reportIds || []).filter((id) => id !== reportId)
          },
          existing
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];
        const nextComparison = existing.id === current.activeContinuityInsightCollectionId
          ? resolveContinuityInsightComparisonIds(
              current.continuityInsightReports || [],
              nextCollection.reportIds[0] || current.continuityInsightPrimaryReportId || "",
              nextCollection.reportIds.find((id) => id !== (nextCollection.reportIds[0] || "")) || "",
              nextCollection.reportIds[0] || current.activeContinuityInsightReportId || ""
            )
          : null;

        set({
          continuityInsightCollections: nextCollections,
          ...(nextComparison
            ? {
                activeContinuityInsightReportId:
                  nextComparison.primaryReportId || current.activeContinuityInsightReportId,
                continuityInsightPrimaryReportId:
                  nextComparison.primaryReportId || current.continuityInsightPrimaryReportId,
                continuityInsightComparisonReportId: nextComparison.comparisonReportId
              }
            : {}),
          recentActions: pushAction(
            current.recentActions,
            "Continuity report removed from collection",
            `${report.name} was removed from ${nextCollection.name}.`,
            "Logged"
          )
        });
      },
      loadContinuityInsightCollection(collectionId) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        if (!existing) return;
        const reopenedAt = new Date().toISOString();
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          { ...existing, lastOpenedAt: reopenedAt },
          existing
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];
        const nextComparison = resolveContinuityInsightComparisonIds(
          current.continuityInsightReports || [],
          nextCollection.reportIds[0] || current.continuityInsightPrimaryReportId || "",
          nextCollection.reportIds.find((id) => id !== (nextCollection.reportIds[0] || "")) || "",
          nextCollection.reportIds[0] || current.activeContinuityInsightReportId || ""
        );

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId: nextCollection.id,
          activeContinuityInsightReportId:
            nextComparison.primaryReportId || current.activeContinuityInsightReportId,
          continuityInsightPrimaryReportId:
            nextComparison.primaryReportId || current.continuityInsightPrimaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity insight collection reopened",
            nextCollection.reportIds.length
              ? `${nextCollection.name} restored ${nextCollection.reportIds.length} saved reports into the local review set.`
              : `${nextCollection.name} reopened as an empty local review set.`,
            "Logged"
          )
        });
      },
      reopenLatestContinuityInsightCollection() {
        const current = get();
        const latestCollection =
          (current.continuityInsightCollections || []).find(
            (collection) => collection.id === current.activeContinuityInsightCollectionId
          ) ||
          (current.continuityInsightCollections || [])[0] ||
          null;
        if (!latestCollection) return;
        get().loadContinuityInsightCollection(latestCollection.id);
      },
      launchContinuityWorkspaceMacro(macroId) {
        const current = get();
        if (!current.baseData) return;
        const macro = (current.continuityWorkspaceMacros || []).find((item) => item.id === macroId);
        if (!macro) return;
        const launchedAt = new Date().toISOString();
        const nextMacro = buildContinuityWorkspaceMacroRecord(
          current,
          macro.name,
          {
            ...macro,
            usageCount: Number(macro.usageCount || 0) + 1,
            lastUsedAt: launchedAt,
            usageHistory: [launchedAt, ...(macro.usageHistory || [])]
          },
          macro
        );
        const nextMacros = (current.continuityWorkspaceMacros || []).map((item) =>
          item.id === macroId ? nextMacro : item
        );
        const runtime = resolveContinuityWorkspaceMacroRuntime(current, macro);

        set(
          rehydrateState(current.baseData, {
            ...current,
            continuityWorkspaceMacros: nextMacros,
            selectedSymbol: runtime.mappedSymbol || current.selectedSymbol,
            preferredSymbol: runtime.mappedSymbol || current.preferredSymbol,
            selectedRoute: runtime.routeMatch || current.selectedRoute,
            preferredRoute: runtime.routeMatch?.name || current.preferredRoute,
            protectionState: runtime.protectionState,
            activeWatchlistId: runtime.watchlist?.id || current.activeWatchlistId,
            activeWatchlist: runtime.watchlist || current.activeWatchlist,
            activeReviewSnapshotId: runtime.snapshot?.id || current.activeReviewSnapshotId,
            activeReplayQueueId: runtime.queue?.id || current.activeReplayQueueId,
            activeContinuityMacroId: nextMacro.id,
            recentActions: pushAction(
              current.recentActions,
              "Continuity macro launched",
              `${nextMacro.name} reopened a saved local review workspace.`,
              "Logged",
              {
                symbol: runtime.mappedSymbol || current.selectedSymbol,
                watchlistId: runtime.watchlist?.id || "",
                watchlistName: runtime.watchlist?.name || "",
                sessionTags: runtime.watchlist?.sessionTags || [],
                sessionIntent: nextMacro.sessionIntent || runtime.watchlist?.sessionIntent || ""
              }
            )
          })
        );
      },
      togglePinnedReviewSnapshot(snapshotId) {
        const current = get();
        const snapshot = (current.reviewSnapshots || []).find((item) => item.id === snapshotId);
        if (!snapshot) return;
        const nextPinned = togglePinnedId(current.pinnedReviewSnapshotIds || [], snapshotId);
        const isPinned = nextPinned.includes(snapshotId);

        set({
          pinnedReviewSnapshotIds: nextPinned,
          recentActions: pushAction(
            current.recentActions,
            isPinned ? "Snapshot pinned" : "Snapshot unpinned",
            `${snapshot.name} ${isPinned ? "was pinned for quick review access." : "was removed from quick review pins."}`,
            "Logged"
          )
        });
      },
      createReplayQueue(name) {
        const current = get();
        const queue = buildReplayQueueRecord(name, {
          fallbackName: `Replay Queue ${(current.replayQueues?.length || 0) + 1}`
        });

        set({
          replayQueues: [queue, ...(current.replayQueues || [])].slice(0, 12),
          activeReplayQueueId: queue.id,
          recentActions: pushAction(
            current.recentActions,
            "Replay queue created",
            `${queue.name} is ready to collect bookmarked replay items for review.`,
            "Logged"
          )
        });
      },
      renameReplayQueue(queueId, name) {
        const current = get();
        const existing = (current.replayQueues || []).find((item) => item.id === queueId);
        if (!existing) return;
        const nextName = normalizeReplayQueueName(name, existing.name);

        set({
          replayQueues: (current.replayQueues || []).map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  name: nextName,
                  updatedAt: new Date().toISOString()
                }
              : item
          ),
          recentActions: pushAction(
            current.recentActions,
            "Replay queue renamed",
            `${existing.name} is now ${nextName}.`,
            "Logged"
          )
        });
      },
      setActiveReplayQueue(queueId) {
        const current = get();
        const queue = (current.replayQueues || []).find((item) => item.id === queueId);
        if (!queue) return;

        set({
          activeReplayQueueId: queue.id,
          recentActions: pushAction(
            current.recentActions,
            "Replay queue activated",
            `${queue.name} is now the active local review queue.`,
            "Logged"
          )
        });
      },
      removeReplayQueue(queueId) {
        const current = get();
        const queue = (current.replayQueues || []).find((item) => item.id === queueId);
        if (!queue) return;
        const nextQueues = (current.replayQueues || []).filter((item) => item.id !== queueId);

        set({
          replayQueues: nextQueues,
          activeReplayQueueId: current.activeReplayQueueId === queueId ? nextQueues[0]?.id || "" : current.activeReplayQueueId,
          pinnedReplayQueueIds: (current.pinnedReplayQueueIds || []).filter((item) => item !== queueId),
          recentActions: pushAction(
            current.recentActions,
            "Replay queue removed",
            `${queue.name} was removed from the local replay review deck.`,
            "Logged"
          )
        });
      },
      togglePinnedReplayQueue(queueId) {
        const current = get();
        const queue = (current.replayQueues || []).find((item) => item.id === queueId);
        if (!queue) return;
        const nextPinned = togglePinnedId(current.pinnedReplayQueueIds || [], queueId);
        const isPinned = nextPinned.includes(queueId);

        set({
          pinnedReplayQueueIds: nextPinned,
          recentActions: pushAction(
            current.recentActions,
            isPinned ? "Replay queue pinned" : "Replay queue unpinned",
            `${queue.name} ${isPinned ? "was pinned for desk setup." : "was removed from pinned review queues."}`,
            "Logged"
          )
        });
      },
      toggleReplayQueueItem(queueId, recordType, record) {
        const current = get();
        const key = buildReplayReviewKey(recordType, record);
        const targetQueue = (current.replayQueues || []).find((item) => item.id === queueId);
        if (!targetQueue || !key) return;
        const alreadyIncluded = (targetQueue.itemKeys || []).includes(key);
        const nextItems = alreadyIncluded
          ? (targetQueue.itemKeys || []).filter((item) => item !== key)
          : [key, ...(targetQueue.itemKeys || [])].slice(0, 48);

        set({
          replayQueues: (current.replayQueues || []).map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  itemKeys: nextItems,
                  updatedAt: new Date().toISOString()
                }
              : item
          ),
          activeReplayQueueId: queueId,
          recentActions: pushAction(
            current.recentActions,
            alreadyIncluded ? "Replay item removed from queue" : "Replay item added to queue",
            `${record.title || record.label || record.event || record.id || record.symbol || "Replay item"} ${alreadyIncluded ? "was removed from" : "was added to"} ${targetQueue.name}.`,
            "Logged"
          )
        });
      },
      saveQueueDriftBaseline(name, payload = {}) {
        const current = get();
        const baseline = buildQueueDriftBaselineRecord(name, payload);
        if (!baseline.pack) return;

        set({
          queueDriftBaselines: [baseline, ...(current.queueDriftBaselines || [])].slice(0, 16),
          recentActions: pushAction(
            current.recentActions,
            "Drift baseline saved",
            `${baseline.name} joined the local queue-drift baseline library.`,
            "Logged"
          )
        });
      },
      renameQueueDriftBaseline(baselineId, name) {
        const current = get();
        const existing = (current.queueDriftBaselines || []).find((item) => item.id === baselineId);
        if (!existing) return;
        const nextBaseline = buildQueueDriftBaselineRecord(name, existing, existing);

        set({
          queueDriftBaselines: (current.queueDriftBaselines || []).map((item) =>
            item.id === baselineId ? nextBaseline : item
          ),
          recentActions: pushAction(
            current.recentActions,
            "Drift baseline renamed",
            `${existing.name} is now ${nextBaseline.name}.`,
            "Logged"
          )
        });
      },
      removeQueueDriftBaseline(baselineId) {
        const current = get();
        const existing = (current.queueDriftBaselines || []).find((item) => item.id === baselineId);
        if (!existing) return;

        set({
          queueDriftBaselines: (current.queueDriftBaselines || []).filter((item) => item.id !== baselineId),
          recentActions: pushAction(
            current.recentActions,
            "Drift baseline removed",
            `${existing.name} was removed from the local drift baseline library.`,
            "Logged"
          )
        });
      },
      saveHandoffNote(payload = {}) {
        const current = get();
        const note = buildHandoffNoteRecord(current, payload);
        if (!note.comment && !note.snapshotId && !note.replayQueueId && !note.watchlistId) return;

        set({
          handoffNotes: [note, ...(current.handoffNotes || [])].slice(0, 18),
          recentActions: pushAction(
            current.recentActions,
            "Operator handoff saved",
            `${note.watchlistName || "Current market set"} handoff packet stored locally for the next review cycle.`,
            "Logged",
            {
              symbol: current.selectedSymbol,
              watchlistId: note.watchlistId,
              watchlistName: note.watchlistName,
              sessionTags: note.sessionTags,
              sessionIntent: note.sessionIntent
            }
          )
        });
      },
      removeHandoffNote(noteId) {
        const current = get();
        const note = (current.handoffNotes || []).find((item) => item.id === noteId);
        if (!note) return;

        set({
          handoffNotes: (current.handoffNotes || []).filter((item) => item.id !== noteId),
          pinnedHandoffNoteIds: (current.pinnedHandoffNoteIds || []).filter((item) => item !== noteId),
          recentActions: pushAction(
            current.recentActions,
            "Operator handoff removed",
            `${note.watchlistName || "Handoff note"} was removed from local continuity memory.`,
            "Logged"
          )
        });
      },
      togglePinnedHandoffNote(noteId) {
        const current = get();
        const note = (current.handoffNotes || []).find((item) => item.id === noteId);
        if (!note) return;
        const nextPinned = togglePinnedId(current.pinnedHandoffNoteIds || [], noteId);
        const isPinned = nextPinned.includes(noteId);

        set({
          pinnedHandoffNoteIds: nextPinned,
          recentActions: pushAction(
            current.recentActions,
            isPinned ? "Handoff pinned" : "Handoff unpinned",
            `${note.watchlistName || "Handoff packet"} ${isPinned ? "was pinned for continuity launch." : "was removed from pinned handoffs."}`,
            "Logged"
            )
          });
        },
      resumeLastReviewStack() {
        const current = get();
        if (!current.baseData) return;

        const latestHandoff = (current.handoffNotes || [])[0] || null;
        if (latestHandoff) {
          get().restoreHandoffContext(latestHandoff.id);
          return;
        }

        const snapshot =
          (current.reviewSnapshots || []).find((item) => item.id === current.activeReviewSnapshotId) ||
          (current.reviewSnapshots || [])[0] ||
          null;
        const queue =
          (current.replayQueues || []).find((item) => item.id === current.activeReplayQueueId) ||
          (current.replayQueues || [])[0] ||
          null;

        if (!snapshot && !queue) return;

        const snapshotRuntime = snapshot?.comparisonPack?.runtime || snapshot?.baselinePack?.runtime || {};
        const snapshotScope = snapshot?.comparisonPack?.scope || snapshot?.baselinePack?.scope || {};
        const mappedSymbol = resolveProviderMapping(snapshotRuntime.selectedSymbol || current.selectedSymbol).symbol;
        const routeKey = String(snapshotRuntime.selectedRoute || current.selectedRoute?.name || "").trim();
        const routeMatch =
          current.routeLibrary.find((route) => route.name === routeKey || route.asset === routeKey) ||
          current.selectedRoute;
        const watchlist =
          (current.savedWatchlists || []).find((item) => item.id === snapshotScope.activeWatchlistId) ||
          current.activeWatchlist;
        const snapshotLabel = snapshot?.name || "No snapshot";
        const queueLabel = queue?.name || "No queue";

        set(
          rehydrateState(current.baseData, {
            ...current,
            selectedSymbol: mappedSymbol || current.selectedSymbol,
            preferredSymbol: mappedSymbol || current.preferredSymbol,
            selectedRoute: routeMatch,
            preferredRoute: routeMatch?.name || current.preferredRoute,
            protectionState: snapshotRuntime.protectionState || current.protectionState,
            activeWatchlistId: watchlist?.id || current.activeWatchlistId,
            activeWatchlist: watchlist || current.activeWatchlist,
            activeReviewSnapshotId: snapshot?.id || current.activeReviewSnapshotId,
            activeReplayQueueId: queue?.id || current.activeReplayQueueId,
            recentActions: pushAction(
              current.recentActions,
              "Review stack resumed",
              `${snapshotLabel} and ${queueLabel} restored the latest local review stack.`,
              "Logged",
              {
                symbol: mappedSymbol || current.selectedSymbol,
                watchlistId: watchlist?.id || "",
                watchlistName: watchlist?.name || "",
                sessionTags: watchlist?.sessionTags || [],
                sessionIntent: watchlist?.sessionIntent || ""
              }
            )
          })
        );
      },
      resumePinnedReviewStack() {
        const current = get();
        if (!current.baseData) return;

        const pinnedHandoff = (current.pinnedHandoffNoteIds || [])
          .map((id) => (current.handoffNotes || []).find((item) => item.id === id))
          .find(Boolean);
        if (pinnedHandoff) {
          get().restoreHandoffContext(pinnedHandoff.id);
          return;
        }

        const snapshot =
          (current.pinnedReviewSnapshotIds || [])
            .map((id) => (current.reviewSnapshots || []).find((item) => item.id === id))
            .find(Boolean) ||
          (current.reviewSnapshots || []).find((item) => item.id === current.activeReviewSnapshotId) ||
          null;
        const queue =
          (current.pinnedReplayQueueIds || [])
            .map((id) => (current.replayQueues || []).find((item) => item.id === id))
            .find(Boolean) ||
          (current.replayQueues || []).find((item) => item.id === current.activeReplayQueueId) ||
          null;

        if (!snapshot && !queue) return;

        const snapshotRuntime = snapshot?.comparisonPack?.runtime || snapshot?.baselinePack?.runtime || {};
        const snapshotScope = snapshot?.comparisonPack?.scope || snapshot?.baselinePack?.scope || {};
        const mappedSymbol = resolveProviderMapping(snapshotRuntime.selectedSymbol || current.selectedSymbol).symbol;
        const routeKey = String(snapshotRuntime.selectedRoute || current.selectedRoute?.name || "").trim();
        const routeMatch =
          current.routeLibrary.find((route) => route.name === routeKey || route.asset === routeKey) ||
          current.selectedRoute;
        const watchlist =
          (current.savedWatchlists || []).find((item) => item.id === snapshotScope.activeWatchlistId) ||
          current.activeWatchlist;
        const snapshotLabel = snapshot?.name || "No snapshot";
        const queueLabel = queue?.name || "No queue";

        set(
          rehydrateState(current.baseData, {
            ...current,
            selectedSymbol: mappedSymbol || current.selectedSymbol,
            preferredSymbol: mappedSymbol || current.preferredSymbol,
            selectedRoute: routeMatch,
            preferredRoute: routeMatch?.name || current.preferredRoute,
            protectionState: snapshotRuntime.protectionState || current.protectionState,
            activeWatchlistId: watchlist?.id || current.activeWatchlistId,
            activeWatchlist: watchlist || current.activeWatchlist,
            activeReviewSnapshotId: snapshot?.id || current.activeReviewSnapshotId,
            activeReplayQueueId: queue?.id || current.activeReplayQueueId,
            recentActions: pushAction(
              current.recentActions,
              "Pinned review pack resumed",
              `${snapshotLabel} and ${queueLabel} restored the pinned local continuity pack.`,
              "Logged",
              {
                symbol: mappedSymbol || current.selectedSymbol,
                watchlistId: watchlist?.id || "",
                watchlistName: watchlist?.name || "",
                sessionTags: watchlist?.sessionTags || [],
                sessionIntent: watchlist?.sessionIntent || ""
              }
            )
          })
        );
      },
      restoreHandoffContext(noteId) {
        const current = get();
        if (!current.baseData) return;
        const note = (current.handoffNotes || []).find((item) => item.id === noteId);
        if (!note) return;
        const snapshot = (current.reviewSnapshots || []).find((item) => item.id === note.snapshotId) || null;
        const queue = (current.replayQueues || []).find((item) => item.id === note.replayQueueId) || null;
        const watchlist = (current.savedWatchlists || []).find((item) => item.id === note.watchlistId) || null;
        const mappedSymbol = resolveProviderMapping(note.selectedSymbol || current.selectedSymbol).symbol;
        const routeMatch =
          current.routeLibrary.find(
            (route) => route.name === note.selectedRoute || route.asset === note.selectedRoute
          ) || current.selectedRoute;

        set(
          rehydrateState(current.baseData, {
            ...current,
            selectedSymbol: mappedSymbol,
            preferredSymbol: mappedSymbol || current.preferredSymbol,
            selectedRoute: routeMatch,
            preferredRoute: routeMatch?.name || current.preferredRoute,
            protectionState: note.protectionState || current.protectionState,
            activeWatchlistId: watchlist?.id || current.activeWatchlistId,
            activeWatchlist: watchlist || current.activeWatchlist,
            activeReviewSnapshotId: snapshot?.id || current.activeReviewSnapshotId,
            activeReplayQueueId: queue?.id || current.activeReplayQueueId,
            recentActions: pushAction(
              current.recentActions,
              "Handoff context restored",
              `${note.watchlistName || "Handoff packet"} reopened the saved local review context.`,
              "Logged",
              {
                symbol: mappedSymbol,
                watchlistId: note.watchlistId,
                watchlistName: note.watchlistName,
                sessionTags: note.sessionTags,
                sessionIntent: note.sessionIntent
              }
            )
          })
        );
      },
      recordContinuityAlert(payload = {}) {
        const current = get();
        const record = buildContinuityAlertRecord(payload);
        const latest = (current.continuityAlertHistory || [])[0];
        if (latest?.fingerprint === record.fingerprint) return;

        set({
          continuityAlertHistory: [record, ...(current.continuityAlertHistory || [])].slice(0, 24)
        });
      },
      importHandoffBundle(bundle = {}, mode = "import-and-activate") {
        const current = get();
        if (!current.baseData || String(bundle.kind || "") !== "handoff-export-bundle") return;
        const importMode = ["restore-only", "import-only", "import-and-activate"].includes(mode) ? mode : "import-and-activate";
        const shouldActivate = importMode !== "import-only";
        const shouldSaveAssets = importMode !== "restore-only";

        const importedSnapshot = buildImportedReviewSnapshot(bundle.savedSnapshot || null);
        const importedReplayItems = Array.isArray(bundle.replayQueue?.items) ? bundle.replayQueue.items : [];
        const nextReplayReviewMarks = shouldSaveAssets ? { ...(current.replayReviewMarks || {}) } : { ...(current.replayReviewMarks || {}) };

        importedReplayItems.forEach((item) => {
          const key = String(item?.key || "").trim() || buildReplayReviewKey(item?.recordType || "record", item || {});
          const entry = buildImportedReplayReviewEntry(item, key);
          if (entry && shouldSaveAssets) nextReplayReviewMarks[entry.key] = entry;
        });

        const importedQueue =
          bundle.replayQueue
            ? buildReplayQueueRecord(bundle.replayQueue.name, {
                fallbackName: `Imported Queue ${(current.replayQueues?.length || 0) + 1}`,
                itemKeys: importedReplayItems
                  .map((item) => String(item?.key || "").trim() || buildReplayReviewKey(item?.recordType || "record", item || {}))
                  .filter(Boolean)
              })
            : null;
        const nextReviewSnapshots = shouldSaveAssets && importedSnapshot ? [importedSnapshot, ...(current.reviewSnapshots || [])].slice(0, 12) : current.reviewSnapshots || [];
        const nextReplayQueues = shouldSaveAssets && importedQueue ? [importedQueue, ...(current.replayQueues || [])].slice(0, 12) : current.replayQueues || [];
        const importedNoteBase = buildHandoffNoteRecord(
          {
            ...current,
            reviewSnapshots: nextReviewSnapshots,
            replayQueues: nextReplayQueues,
            replayReviewMarks: nextReplayReviewMarks
          },
          {
            watchlistId: bundle.handoffNote?.watchlistId || "",
            watchlistName: bundle.handoffNote?.watchlistName || "",
            snapshotId: importedSnapshot?.id || "",
            replayQueueId: importedQueue?.id || "",
            sessionIntent: bundle.handoffNote?.sessionIntent || bundle.sessionIntent || "",
            comment: bundle.handoffNote?.comment || "",
            sessionTags: bundle.handoffNote?.sessionTags || [],
            selectedSymbol: bundle.context?.selectedSymbol || bundle.handoffNote?.selectedSymbol || "",
            selectedRoute: bundle.context?.selectedRoute || bundle.handoffNote?.selectedRoute || "",
            protectionState: bundle.context?.protectionState || bundle.handoffNote?.protectionState || ""
          }
        );
        const importedNote = {
          ...importedNoteBase,
          verdicts: normalizeReplayVerdicts(bundle.replayVerdictTags || importedNoteBase.verdicts || [])
        };
        const watchlist = (current.savedWatchlists || []).find((item) => item.id === importedNote.watchlistId) || current.activeWatchlist;
        const mappedSymbol = resolveProviderMapping(bundle.context?.selectedSymbol || importedNote.selectedSymbol || current.selectedSymbol).symbol;
        const routeMatch =
          current.routeLibrary.find(
            (route) => route.name === (bundle.context?.selectedRoute || importedNote.selectedRoute) || route.asset === (bundle.context?.selectedRoute || importedNote.selectedRoute)
          ) || current.selectedRoute;
        const nextRecentActions = pushAction(
          current.recentActions,
          importMode === "restore-only"
            ? "Handoff packet restored"
            : importMode === "import-only"
              ? "Handoff packet imported"
              : "Handoff bundle restored",
          importMode === "restore-only"
            ? `${importedNote.watchlistName || "Imported handoff"} reapplied desk context without saving new continuity assets.`
            : importMode === "import-only"
              ? `${importedNote.watchlistName || "Imported handoff"} was added to local continuity memory without changing the active desk.`
              : `${importedNote.watchlistName || "Imported handoff"} reopened a saved local review packet.`,
          "Logged",
          {
            symbol: mappedSymbol,
            watchlistId: importedNote.watchlistId,
            watchlistName: importedNote.watchlistName,
            sessionTags: importedNote.sessionTags,
            sessionIntent: importedNote.sessionIntent
          }
        );

        set(
          rehydrateState(current.baseData, {
            ...current,
            reviewSnapshots: nextReviewSnapshots,
            activeReviewSnapshotId: shouldActivate && shouldSaveAssets ? importedSnapshot?.id || current.activeReviewSnapshotId : current.activeReviewSnapshotId,
            replayReviewMarks: shouldSaveAssets ? nextReplayReviewMarks : current.replayReviewMarks,
            replayQueues: nextReplayQueues,
            activeReplayQueueId: shouldActivate && shouldSaveAssets ? importedQueue?.id || current.activeReplayQueueId : current.activeReplayQueueId,
            handoffNotes: shouldSaveAssets ? [importedNote, ...(current.handoffNotes || [])].slice(0, 18) : current.handoffNotes,
            selectedSymbol: shouldActivate ? mappedSymbol : current.selectedSymbol,
            preferredSymbol: shouldActivate ? mappedSymbol || current.preferredSymbol : current.preferredSymbol,
            selectedRoute: shouldActivate ? routeMatch : current.selectedRoute,
            preferredRoute: shouldActivate ? routeMatch?.name || current.preferredRoute : current.preferredRoute,
            protectionState: shouldActivate ? bundle.context?.protectionState || importedNote.protectionState || current.protectionState : current.protectionState,
            activeWatchlistId: shouldActivate ? watchlist?.id || current.activeWatchlistId : current.activeWatchlistId,
            activeWatchlist: shouldActivate ? watchlist || current.activeWatchlist : current.activeWatchlist,
            recentActions: nextRecentActions
          })
        );
      },
      toggleReplayBookmark(recordType, record) {
        const current = get();
        const key = buildReplayReviewKey(recordType, record);
        const existing = current.replayReviewMarks?.[key] || null;
        const nextEntry = buildReplayReviewEntry(recordType, record, {
          ...(existing || {}),
          bookmarked: !existing?.bookmarked
        });
        const nextMarks = { ...(current.replayReviewMarks || {}) };

        if (!nextEntry.bookmarked && !nextEntry.verdicts.length) {
          delete nextMarks[key];
        } else {
          nextMarks[key] = nextEntry;
        }

        set({
          replayReviewMarks: nextMarks,
          recentActions: pushAction(
            current.recentActions,
            nextEntry.bookmarked ? "Replay bookmarked" : "Replay bookmark cleared",
            `${nextEntry.label} ${nextEntry.bookmarked ? "was pinned for review" : "was removed from bookmarks"} in Journal Vault.`,
            "Logged",
            {
              symbol: nextEntry.symbol,
              watchlistId: nextEntry.watchlistId,
              watchlistName: nextEntry.watchlistName,
              sessionTags: nextEntry.sessionTags,
              sessionIntent: nextEntry.sessionIntent
            }
          )
        });
      },
      toggleReplayVerdict(recordType, record, verdictTag) {
        const normalizedVerdict = normalizeReplayVerdictTag(verdictTag);
        if (!normalizedVerdict) return;

        const current = get();
        const key = buildReplayReviewKey(recordType, record);
        const existing = current.replayReviewMarks?.[key] || null;
        const verdicts = normalizeReplayVerdicts(
          existing?.verdicts?.includes(normalizedVerdict)
            ? existing.verdicts.filter((item) => item !== normalizedVerdict)
            : [...(existing?.verdicts || []), normalizedVerdict]
        );
        const nextEntry = buildReplayReviewEntry(recordType, record, {
          ...(existing || {}),
          verdicts
        });
        const nextMarks = { ...(current.replayReviewMarks || {}) };

        if (!nextEntry.bookmarked && !nextEntry.verdicts.length) {
          delete nextMarks[key];
        } else {
          nextMarks[key] = nextEntry;
        }

        set({
          replayReviewMarks: nextMarks,
          recentActions: pushAction(
            current.recentActions,
            verdicts.includes(normalizedVerdict) ? "Replay verdict tagged" : "Replay verdict cleared",
            `${nextEntry.label} is now marked ${verdicts.length ? verdicts.join(", ") : "with no verdict tag"} for local review.`,
            "Logged",
            {
              symbol: nextEntry.symbol,
              watchlistId: nextEntry.watchlistId,
              watchlistName: nextEntry.watchlistName,
              sessionTags: nextEntry.sessionTags,
              sessionIntent: nextEntry.sessionIntent
            }
          )
        });
      },
      saveSession() {
        const current = get();
        const snapshot = {
          selectedSymbol: current.selectedSymbol,
          riskMode: current.riskMode,
          protectionState: current.protectionState,
          orderTicket: current.orderTicket,
          openPositions: current.openPositions,
          recentOrders: current.recentOrders,
          executionEvents: current.executionEvents,
          recentActions: current.recentActions,
          sessionNotes: current.sessionNotes,
          reviewSnapshots: current.reviewSnapshots,
          activeReviewSnapshotId: current.activeReviewSnapshotId,
          continuityFilterPresets: current.continuityFilterPresets,
          continuityWorkspaceMacros: current.continuityWorkspaceMacros,
          activeContinuityMacroId: current.activeContinuityMacroId,
          continuityInsightReports: current.continuityInsightReports,
          activeContinuityInsightReportId: current.activeContinuityInsightReportId,
          continuityInsightCollections: current.continuityInsightCollections,
          activeContinuityInsightCollectionId: current.activeContinuityInsightCollectionId,
          continuityInsightPrimaryReportId: current.continuityInsightPrimaryReportId,
          continuityInsightComparisonReportId: current.continuityInsightComparisonReportId,
          replayReviewMarks: current.replayReviewMarks,
          replayQueues: current.replayQueues,
          activeReplayQueueId: current.activeReplayQueueId,
          queueDriftBaselines: current.queueDriftBaselines,
          handoffNotes: current.handoffNotes,
          pinnedReviewSnapshotIds: current.pinnedReviewSnapshotIds,
          pinnedReplayQueueIds: current.pinnedReplayQueueIds,
          pinnedHandoffNoteIds: current.pinnedHandoffNoteIds,
          continuityAlertHistory: current.continuityAlertHistory,
          guardedActionResults: current.guardedActionResults,
          autonomyAuditLog: current.autonomyAuditLog,
          lastRecoveryAction: current.lastRecoveryAction,
          recoveryLog: current.recoveryLog,
          recommendationLog: current.recommendationLog,
          runtimeTrendHistory: current.runtimeTrendHistory,
          liveDataSource: current.liveDataSource,
          chartTimeframe: current.chartTimeframe,
          executionProvider: current.executionProvider,
          themeMode: current.themeMode,
          densityMode: current.densityMode,
          defaultRiskMode: current.defaultRiskMode,
          preferredSymbol: current.preferredSymbol,
          preferredRoute: current.preferredRoute,
          trackedSymbols: current.trackedSymbols,
          savedWatchlists: current.savedWatchlists,
          activeWatchlistId: current.activeWatchlistId,
          startupTemplateKey: current.startupTemplateKey
        };
        localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(snapshot));
        set({
          recentActions: pushAction(
            current.recentActions,
            "Session saved",
            `${current.selectedSymbol} workspace snapshot stored locally`,
            "Logged"
          )
        });
      },
      restoreSavedSession() {
        const current = get();
        if (!current.baseData) return;
        const raw = localStorage.getItem(SAVED_SESSION_KEY);
        if (!raw) return;
        try {
          const snapshot = JSON.parse(raw);
          const restoredState = {
            ...current,
            ...snapshot
          };
          const recoveryEntry = createAutonomyRecord({
            key: "apply-safe-session-recovery",
            label: "Safe session recovery applied",
            detail: `${snapshot.selectedSymbol || current.selectedSymbol || "Workspace"} session state was restored from the local saved snapshot.`,
            status: "Logged",
            tone: "info"
          });
          const recoveryState = buildRecoveryState(restoredState, recoveryEntry);
          set(
            rehydrateState(current.baseData, {
              ...restoredState,
              ...recoveryState
            })
          );
        } catch {}
      },
      resetSession() {
        const current = get();
        if (!current.baseData) return;
        const recoveryEntry = createAutonomyRecord({
          key: "apply-safe-runtime-reset",
          label: "Safe runtime reset applied",
          detail: "The shared workspace runtime was reset to current local defaults without changing critical product logic.",
          status: "Logged",
          tone: "warning"
        });
        const recoveryState = buildRecoveryState(current, recoveryEntry);

        const resetState = rehydrateState(current.baseData, {
          ...initialState,
          themeMode: current.themeMode,
          densityMode: current.densityMode,
          defaultRiskMode: current.defaultRiskMode,
          preferredSymbol: current.preferredSymbol,
          preferredRoute: current.preferredRoute,
          liveDataSource: current.liveDataSource,
          chartTimeframe: current.chartTimeframe,
          trackedSymbols: current.trackedSymbols,
          savedWatchlists: current.savedWatchlists,
          activeWatchlistId: current.activeWatchlistId,
          startupTemplateKey: current.startupTemplateKey,
          executionProvider: current.executionProvider,
          riskMode: current.defaultRiskMode || "Balanced",
          reviewSnapshots: current.reviewSnapshots,
          activeReviewSnapshotId: current.activeReviewSnapshotId,
          continuityFilterPresets: current.continuityFilterPresets,
          continuityWorkspaceMacros: current.continuityWorkspaceMacros,
          activeContinuityMacroId: current.activeContinuityMacroId,
          continuityInsightReports: current.continuityInsightReports,
          activeContinuityInsightReportId: current.activeContinuityInsightReportId,
          continuityInsightCollections: current.continuityInsightCollections,
          activeContinuityInsightCollectionId: current.activeContinuityInsightCollectionId,
          continuityInsightPrimaryReportId: current.continuityInsightPrimaryReportId,
          continuityInsightComparisonReportId: current.continuityInsightComparisonReportId,
          replayReviewMarks: current.replayReviewMarks,
          replayQueues: current.replayQueues,
          activeReplayQueueId: current.activeReplayQueueId,
          queueDriftBaselines: current.queueDriftBaselines,
          handoffNotes: current.handoffNotes,
          pinnedReviewSnapshotIds: current.pinnedReviewSnapshotIds,
          pinnedReplayQueueIds: current.pinnedReplayQueueIds,
          pinnedHandoffNoteIds: current.pinnedHandoffNoteIds,
          continuityAlertHistory: current.continuityAlertHistory,
          recommendationLog: current.recommendationLog,
          runtimeTrendHistory: current.runtimeTrendHistory,
          ...recoveryState
        });
        set({
          ...resetState,
          recentActions: pushAction([], "Session reset", "Workspace session restored to current defaults", "Logged")
        });
      },
      runGuardedAction(actionKey) {
        const current = get();
        if (!current.baseData) return;

        const action = current.guardedActions.find((item) => item.key === actionKey);
        if (!action) return;

        const recordAction = (entry, title = entry.label, detail = entry.detail, status = entry.status) =>
          set(
            rehydrateState(current.baseData, {
              ...current,
              ...buildAutonomyActionState(current, entry),
              recentActions: pushAction(current.recentActions, title, detail, status)
            })
          );

        if (action.blocked || action.requiresSupportedAdapter) {
          const blockedEntry = createAutonomyRecord({
            key: action.key,
            label: action.label,
            detail: action.reason,
            status: action.status,
            tone: action.tone
          });
          recordAction(blockedEntry, "Guarded action blocked", `${action.label} is blocked: ${action.reason}`, "Blocked");
          return;
        }

        if (actionKey === "observe") {
          recordAction(
            createAutonomyRecord({
              key: action.key,
              label: action.label,
              detail: `Observation recorded for ${current.selectedSymbol || "the active workspace"} without changing runtime state.`,
              status: action.requiresApproval ? "Approval Run" : "Logged",
              tone: "info"
            }),
            "Autonomy observe snapshot"
          );
          return;
        }

        if (actionKey === "diagnose") {
          recordAction(
            createAutonomyRecord({
              key: action.key,
              label: action.label,
              detail:
                current.recommendationLoop?.summary ||
                "Runtime diagnosis summary prepared for operator review.",
              status: action.requiresApproval ? "Approval Run" : "Logged",
              tone: action.recommended ? "warning" : "info"
            }),
            "Autonomy diagnosis prepared"
          );
          return;
        }

        if (actionKey === "recommend") {
          recordAction(
            createAutonomyRecord({
              key: action.key,
              label: action.label,
              detail:
                current.recommendationLoop?.current?.summary ||
                "Safe operator recommendation prepared.",
              status: action.requiresApproval ? "Approval Run" : "Logged",
              tone: action.recommended ? "warning" : "info"
            }),
            "Autonomy recommendation prepared"
          );
          return;
        }

        if (actionKey === "simulate") {
          recordAction(
            createAutonomyRecord({
              key: action.key,
              label: action.label,
              detail:
                "A safe paper-runtime scenario was prepared without changing execution or broker connectivity.",
              status: action.requiresApproval ? "Approval Run" : "Logged",
              tone: "info"
            }),
            "Paper simulation prepared"
          );
          return;
        }

        if (actionKey === "apply-safe-ui-adjustment") {
          const nextDensity = current.densityMode === "Spacious" ? "Comfortable" : current.densityMode;
          const nextTheme = current.themeMode === "Desk Light" ? "Desk Dark" : current.themeMode;
          set(
            rehydrateState(current.baseData, {
              ...current,
              densityMode: nextDensity,
              themeMode: nextTheme,
              ...buildAutonomyActionState(
                current,
                createAutonomyRecord({
                  key: action.key,
                  label: action.label,
                  detail: "Local workspace ergonomics were adjusted toward the default trading desk layout without changing runtime, execution, or packaging behavior.",
                  status: action.requiresApproval ? "Approval Run" : "Logged",
                  tone: "info"
                })
              ),
              recentActions: pushAction(
                current.recentActions,
                "Safe UI adjustment applied",
                "Workspace density and theme were nudged toward the default desk profile.",
                "Logged"
              )
            })
          );
          return;
        }

        if (actionKey === "apply-safe-runtime-reset") {
          get().resetSession();
          return;
        }

        if (actionKey === "apply-safe-session-recovery") {
          get().restoreSavedSession();
          return;
        }

        if (actionKey === "apply-safe-risk-mode-downgrade") {
          const nextRiskMode =
            current.riskMode === "Aggressive" ? "Balanced" : current.riskMode === "Balanced" ? "Defensive" : "Defensive";
          get().setRiskMode(nextRiskMode);
          return;
        }

        if (actionKey === "apply-safe-feed-fallback") {
          get().setLiveDataSource("demo");
        }
      }
    }),
    {
      name: "tpm-product-trading-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedSymbol: state.selectedSymbol,
        riskMode: state.riskMode,
        protectionState: state.protectionState,
        orderTicket: state.orderTicket,
        openPositions: state.openPositions,
        recentOrders: state.recentOrders,
        executionEvents: state.executionEvents,
        recentActions: state.recentActions,
        sessionNotes: state.sessionNotes,
        reviewSnapshots: state.reviewSnapshots,
        activeReviewSnapshotId: state.activeReviewSnapshotId,
        continuityFilterPresets: state.continuityFilterPresets,
        continuityWorkspaceMacros: state.continuityWorkspaceMacros,
        activeContinuityMacroId: state.activeContinuityMacroId,
        continuityInsightReports: state.continuityInsightReports,
        activeContinuityInsightReportId: state.activeContinuityInsightReportId,
        continuityInsightCollections: state.continuityInsightCollections,
        activeContinuityInsightCollectionId: state.activeContinuityInsightCollectionId,
        continuityInsightPrimaryReportId: state.continuityInsightPrimaryReportId,
        continuityInsightComparisonReportId: state.continuityInsightComparisonReportId,
        replayReviewMarks: state.replayReviewMarks,
        replayQueues: state.replayQueues,
        activeReplayQueueId: state.activeReplayQueueId,
        queueDriftBaselines: state.queueDriftBaselines,
        handoffNotes: state.handoffNotes,
        pinnedReviewSnapshotIds: state.pinnedReviewSnapshotIds,
        pinnedReplayQueueIds: state.pinnedReplayQueueIds,
        pinnedHandoffNoteIds: state.pinnedHandoffNoteIds,
        continuityAlertHistory: state.continuityAlertHistory,
        savedWatchlists: state.savedWatchlists,
        activeWatchlistId: state.activeWatchlistId,
        startupTemplateKey: state.startupTemplateKey,
        guardedActionResults: state.guardedActionResults,
        autonomyAuditLog: state.autonomyAuditLog,
        lastRecoveryAction: state.lastRecoveryAction,
        recoveryLog: state.recoveryLog,
        recommendationLog: state.recommendationLog,
        runtimeTrendHistory: state.runtimeTrendHistory,
        liveDataSource: state.liveDataSource,
        chartTimeframe: state.chartTimeframe,
        executionProvider: state.executionProvider,
        themeMode: state.themeMode,
        densityMode: state.densityMode,
        defaultRiskMode: state.defaultRiskMode,
        preferredSymbol: state.preferredSymbol,
        preferredRoute: state.preferredRoute,
        trackedSymbols: state.trackedSymbols
      })
    }
  )
);
