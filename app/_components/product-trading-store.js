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
import { coreModules } from "./product-modules";

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

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDateLabel(dateKey = "") {
  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const date =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month - 1, day)
      : new Date();
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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

function normalizeContinuityInsightCollectionNotes(notes = "") {
  return String(notes || "").trim().slice(0, 1200);
}

function summarizeContinuityInsightTrendPosture(trendSnapshots = []) {
  const counts = (Array.isArray(trendSnapshots) ? trendSnapshots : [trendSnapshots]).reduce(
    (accumulator, snapshot) => {
      const key = String(snapshot?.state || "").trim().toLowerCase();
      if (key === "improving") accumulator.improving += 1;
      if (key === "stable") accumulator.stable += 1;
      if (key === "worsening") accumulator.worsening += 1;
      return accumulator;
    },
    { improving: 0, stable: 0, worsening: 0 }
  );
  const dominant = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] || ["stable", 0];
  const state =
    dominant[0] === "improving" ? "Improving" : dominant[0] === "worsening" ? "Worsening" : "Stable";
  const tone = state === "Improving" ? "success" : state === "Worsening" ? "warning" : "info";

  return {
    state,
    tone,
    detail: `${counts.improving} improving | ${counts.stable} stable | ${counts.worsening} worsening`
  };
}

function summarizeContinuityInsightCollectionNote(notes = "") {
  const normalized = normalizeContinuityInsightCollectionNotes(notes);
  if (!normalized) return "Empty note revision";
  return normalized.length > 144 ? `${normalized.slice(0, 141)}...` : normalized;
}

function buildContinuityInsightCollectionNoteHistoryRecord(notes = "", existingRecord = null) {
  const normalizedNotes = normalizeContinuityInsightCollectionNotes(notes);
  if (!normalizedNotes) return null;

  return {
    id: existingRecord?.id || createId("CINREV"),
    note: normalizedNotes,
    summary: summarizeContinuityInsightCollectionNote(normalizedNotes),
    savedAt: String(existingRecord?.savedAt || new Date().toISOString())
  };
}

function normalizeContinuityInsightCollectionNoteHistory(history = []) {
  const seen = new Set();

  return (Array.isArray(history) ? history : [history])
    .map((entry) =>
      buildContinuityInsightCollectionNoteHistoryRecord(entry?.note || entry?.notes || "", {
        id: entry?.id,
        savedAt: entry?.savedAt || entry?.updatedAt || entry?.createdAt || ""
      })
    )
    .filter((entry) => {
      if (!entry) return false;
      const signature = entry.note;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, 12);
}

function buildNextContinuityInsightCollectionNoteHistory(existingCollection = {}, nextNotes = "") {
  const currentNotes = normalizeContinuityInsightCollectionNotes(existingCollection?.notes || "");
  const normalizedNextNotes = normalizeContinuityInsightCollectionNotes(nextNotes);
  const existingHistory = normalizeContinuityInsightCollectionNoteHistory(existingCollection?.noteHistory || []);

  if (normalizedNextNotes === currentNotes || !currentNotes) {
    return existingHistory;
  }

  const nextRevision = buildContinuityInsightCollectionNoteHistoryRecord(currentNotes, {
    savedAt: existingCollection?.updatedAt || existingCollection?.createdAt || new Date().toISOString()
  });
  if (!nextRevision) return existingHistory;

  return normalizeContinuityInsightCollectionNoteHistory([nextRevision, ...existingHistory]);
}

function normalizeContinuityInsightCollectionCheckpointLabel(label = "", fallback = "Playback checkpoint") {
  return String(label || "").trim().slice(0, 108) || fallback;
}

function normalizeContinuityInsightCollectionCheckpointNote(note = "") {
  return String(note || "").trim().slice(0, 320);
}

function buildContinuityInsightCollectionCheckpointRecord(reportIds = [], checkpoint = {}, existingRecord = null) {
  const validReportIds = new Set((Array.isArray(reportIds) ? reportIds : []).map((reportId) => String(reportId || "").trim()));
  const reportId = String(checkpoint.reportId || existingRecord?.reportId || "").trim();
  if (!reportId || !validReportIds.has(reportId)) return null;

  return {
    id: existingRecord?.id || createId("CICHK"),
    reportId,
    label: normalizeContinuityInsightCollectionCheckpointLabel(
      checkpoint.label,
      existingRecord?.label || "Playback checkpoint"
    ),
    note: normalizeContinuityInsightCollectionCheckpointNote(checkpoint.note || existingRecord?.note || ""),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeContinuityInsightCollectionCheckpoints(checkpoints = [], reportIds = []) {
  const seen = new Set();

  return (Array.isArray(checkpoints) ? checkpoints : [checkpoints])
    .map((checkpoint) => buildContinuityInsightCollectionCheckpointRecord(reportIds, checkpoint))
    .filter((checkpoint) => {
      if (!checkpoint || seen.has(checkpoint.reportId)) return false;
      seen.add(checkpoint.reportId);
      return true;
    })
    .slice(0, 12);
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

function buildContinuityInsightCollectionMeta(reportIds = [], reports = []) {
  const linkedReports = reportIds
    .map((reportId) => (Array.isArray(reports) ? reports : []).find((report) => report.id === reportId) || null)
    .filter(Boolean);
  const symbols = Array.from(
    new Set(
      linkedReports
        .flatMap((report) => report.executionContexts?.symbols || [])
        .map((row) => String(row?.label || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
  const routes = Array.from(
    new Set(
      linkedReports
        .flatMap((report) => report.executionContexts?.routes || [])
        .map((row) => String(row?.label || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
  const protections = Array.from(
    new Set(
      linkedReports
        .flatMap((report) => report.executionContexts?.protections || [])
        .map((row) => String(row?.label || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
  const timestamps = linkedReports
    .map((report) => new Date(report.updatedAt || report.createdAt || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  const summaryParts = [
    `${linkedReports.length} reports`,
    symbols.length ? `${symbols.length} symbols` : "",
    routes.length ? `${routes.length} routes` : "",
    protections.length ? `${protections.length} postures` : ""
  ].filter(Boolean);

  return {
    reportCount: linkedReports.length,
    linkedReports,
    coverage: {
      symbols,
      routes,
      protections
    },
    summary: summaryParts.join(" | ") || "Empty review set",
    earliestReportAt: timestamps.length ? new Date(timestamps[0]).toISOString() : "",
    latestReportAt: timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : "",
    primaryReportId: linkedReports[0]?.id || "",
    comparisonReportId: linkedReports.find((report) => report.id !== (linkedReports[0]?.id || ""))?.id || ""
  };
}

function buildContinuityInsightCollectionRecord(current, name, payload = {}, existingRecord = null) {
  const reports = current?.continuityInsightReports || [];
  const reportIds = normalizeContinuityInsightCollectionReportIds(
    payload.reportIds !== undefined ? payload.reportIds : existingRecord?.reportIds || [],
    reports
  );
  const meta = buildContinuityInsightCollectionMeta(reportIds, reports);
  const nextNotes =
    payload.notes !== undefined ? payload.notes : existingRecord?.notes || "";

  return {
    id: existingRecord?.id || createId("CICOLL"),
    name: normalizeContinuityInsightCollectionName(name, existingRecord?.name || "Insight Collection"),
    reportIds,
    reportCount: meta.reportCount,
    summary: meta.summary,
    coverage: meta.coverage,
    earliestReportAt: meta.earliestReportAt,
    latestReportAt: meta.latestReportAt,
    primaryReportId: meta.primaryReportId,
    comparisonReportId: meta.comparisonReportId,
    notes: normalizeContinuityInsightCollectionNotes(nextNotes),
    noteHistory: normalizeContinuityInsightCollectionNoteHistory(
      payload.noteHistory !== undefined ? payload.noteHistory : existingRecord?.noteHistory || []
    ),
    checkpoints: normalizeContinuityInsightCollectionCheckpoints(
      payload.checkpoints !== undefined ? payload.checkpoints : existingRecord?.checkpoints || [],
      reportIds
    ),
    lastOpenedAt: String(payload.lastOpenedAt || existingRecord?.lastOpenedAt || ""),
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildImportedContinuityInsightReportRecord(report = {}) {
  const nextReport = buildContinuityInsightReportRecord(report.name, report);
  return {
    ...nextReport,
    createdAt: String(report.createdAt || nextReport.createdAt || new Date().toISOString()),
    updatedAt: String(report.updatedAt || nextReport.updatedAt || new Date().toISOString())
  };
}

function buildImportedContinuityInsightCollectionRecord(current, collection = {}) {
  const nextCollection = buildContinuityInsightCollectionRecord(current, collection.name, collection);
  return {
    ...nextCollection,
    createdAt: String(collection.createdAt || nextCollection.createdAt || new Date().toISOString()),
    updatedAt: String(collection.updatedAt || nextCollection.updatedAt || new Date().toISOString()),
    lastOpenedAt: String(collection.lastOpenedAt || nextCollection.lastOpenedAt || "")
  };
}

function buildContinuityInsightReportFingerprint(report = {}) {
  return JSON.stringify({
    name: String(report.name || "").trim().toLowerCase(),
    route: String(report.filters?.route || "").trim().toLowerCase(),
    protectionState: String(report.filters?.protectionState || "").trim().toLowerCase(),
    symbol: String(report.filters?.symbol || "").trim().toLowerCase(),
    createdAt: String(report.createdAt || "").trim(),
    updatedAt: String(report.updatedAt || "").trim(),
    reasoning: normalizeContinuityInsightReasoning(report.reasoning || []),
    driftClusterCount: Array.isArray(report.driftClusters) ? report.driftClusters.length : 0,
    trendSnapshotCount: Array.isArray(report.trendSnapshots) ? report.trendSnapshots.length : 0
  });
}

function buildContinuityInsightCollectionFingerprint(collection = {}) {
  return JSON.stringify({
    name: String(collection.name || "").trim().toLowerCase(),
    reportIds: Array.isArray(collection.reportIds) ? collection.reportIds.map((reportId) => String(reportId || "").trim()) : []
  });
}

function buildPromotedContinuityInsightCheckpointRecord(current, payload = {}, existingRecord = null) {
  const collectionId = String(payload.collectionId || existingRecord?.collectionId || "").trim();
  const checkpointId = String(payload.checkpointId || existingRecord?.checkpointId || "").trim();
  const reportId = String(payload.reportId || existingRecord?.reportId || "").trim();
  const collection = (current?.continuityInsightCollections || []).find((item) => item.id === collectionId) || null;
  if (!collection) return null;

  const checkpoint =
    (collection.checkpoints || []).find((item) => item.id === checkpointId) ||
    (collection.checkpoints || []).find((item) => item.reportId === reportId) ||
    null;
  if (!checkpoint) return null;

  const report =
    (current?.continuityInsightReports || []).find((item) => item.id === (checkpoint.reportId || reportId)) || null;
  if (!report) return null;

  const trend = summarizeContinuityInsightTrendPosture(report.trendSnapshots);

  return {
    id: existingRecord?.id || createId("CIPROMO"),
    collectionId: collection.id,
    collectionName: collection.name,
    checkpointId: checkpoint.id,
    reportId: report.id,
    label: checkpoint.label,
    note: checkpoint.note,
    summary:
      checkpoint.note ||
      report.reasoning?.[0] ||
      report.driftClusters?.[0]?.summary ||
      trend.detail ||
      "Checkpoint is ready for shell reopen.",
    symbol: String(report.filters?.symbol || report.executionContexts?.symbols?.[0]?.label || "").trim(),
    route: String(report.filters?.route || report.executionContexts?.routes?.[0]?.label || "").trim(),
    protectionState: String(
      report.filters?.protectionState || report.executionContexts?.protections?.[0]?.label || ""
    ).trim(),
    trendState: trend.state,
    reportTimestamp: String(report.updatedAt || report.createdAt || ""),
    promotedAt: String(existingRecord?.promotedAt || payload.promotedAt || new Date().toISOString()),
    updatedAt: new Date().toISOString()
  };
}

function normalizePromotedContinuityInsightCheckpointRecords(records = [], current = {}) {
  const seen = new Set();

  return (Array.isArray(records) ? records : [records])
    .map((record) => buildPromotedContinuityInsightCheckpointRecord(current, record, record))
    .filter((record) => {
      if (!record) return false;
      const signature = `${record.collectionId}::${record.checkpointId}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, 12);
}

function buildPromotedContinuityInsightCheckpointState(current = {}, overrides = {}) {
  return normalizePromotedContinuityInsightCheckpointRecords(current.promotedContinuityInsightCheckpoints || [], {
    ...current,
    ...overrides
  });
}

function buildPinnedContinuityInsightPairRecord(current, primaryReportId, comparisonReportId = "", existingRecord = null) {
  const reports = current?.continuityInsightReports || [];
  const nextComparison = resolveContinuityInsightComparisonIds(
    reports,
    primaryReportId,
    comparisonReportId,
    current?.activeContinuityInsightReportId || ""
  );
  const primaryReport = reports.find((report) => report.id === nextComparison.primaryReportId) || null;
  if (!primaryReport) return null;
  const comparisonReport = reports.find((report) => report.id === nextComparison.comparisonReportId) || null;

  return {
    id: existingRecord?.id || createId("CIPAIR"),
    primaryReportId: primaryReport.id,
    comparisonReportId: comparisonReport?.id || "",
    label: comparisonReport ? `${primaryReport.name} vs ${comparisonReport.name}` : primaryReport.name,
    summary: comparisonReport
      ? `${primaryReport.filters?.symbol || "All Symbols"} | ${comparisonReport.filters?.symbol || "All Symbols"}`
      : `${primaryReport.filters?.route || "All Routes"} | ${primaryReport.filters?.protectionState || "All Protection"}`,
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizePinnedContinuityInsightPairRecords(pairs = [], current = {}) {
  const reports = current?.continuityInsightReports || [];
  const seen = new Set();

  return (Array.isArray(pairs) ? pairs : [pairs])
    .map((pair) =>
      buildPinnedContinuityInsightPairRecord(
        current,
        pair?.primaryReportId || "",
        pair?.comparisonReportId || "",
        pair
      )
    )
    .filter((pair) => {
      if (!pair || !reports.some((report) => report.id === pair.primaryReportId)) return false;
      const signature = `${pair.primaryReportId}::${pair.comparisonReportId || ""}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, 8);
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

function clampHomeBaseScore(value, fallback = 0) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function parseHomeBaseNumeric(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? fallback).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getHomeBaseScoreTone(score) {
  if (score >= 82) return "success";
  if (score >= 66) return "info";
  if (score >= 50) return "warning";
  return "danger";
}

function getHomeBaseScoreState(score) {
  if (score >= 82) return "Strong";
  if (score >= 66) return "Stable";
  if (score >= 50) return "Guarded";
  return "Thin";
}

function getExecutionReadinessScore(routeState, executionStatus) {
  const normalized = String(routeState || executionStatus?.state || "").toLowerCase();
  const tone = executionStatus?.tone || "";

  if (normalized.includes("qualified")) return 84;
  if (normalized.includes("filled")) return 82;
  if (normalized.includes("running") || normalized.includes("working")) return 80;
  if (normalized.includes("ready") || normalized.includes("staged")) return 76;
  if (normalized.includes("momentum") || normalized.includes("scaling") || normalized.includes("plan")) return 72;
  if (normalized.includes("watch") || normalized.includes("observe")) return 60;
  if (normalized.includes("protected")) return 56;
  if (normalized.includes("blocked") || normalized.includes("rejected")) return 34;
  if (tone === "success") return 74;
  if (tone === "warning") return 62;
  if (tone === "danger") return 38;
  return 48;
}

function resolveHomeBaseActiveItem(items = [], activeId = "") {
  return items.find((item) => item.id === activeId) || items[0] || null;
}

function buildHomeBaseScorecard(config = {}) {
  const score = clampHomeBaseScore(config.score, 0);
  return {
    key: String(config.key || "").trim() || "context",
    label: String(config.label || "Context"),
    focusLabel: String(config.focusLabel || config.state || config.label || "Context"),
    score,
    tone: config.tone || getHomeBaseScoreTone(score),
    state: config.state || getHomeBaseScoreState(score),
    detail: config.detail || "No context detail available.",
    path: config.path || "/",
    actionLabel: config.actionLabel || "Open",
    source: config.source || "",
    resumeable: Boolean(config.resumeable),
    reopenable: Boolean(config.reopenable),
    rankScore: clampHomeBaseScore(config.rankScore ?? score, score)
  };
}

function buildHomeBaseCommandAction(config = {}) {
  const priority = Math.max(0, Math.round(Number.isFinite(config.priority) ? config.priority : 0));
  return {
    key: String(config.key || config.commandKey || config.source || "command"),
    label: String(config.label || "Command"),
    focusLabel: String(config.focusLabel || config.label || "Desk"),
    detail: config.detail || "No command detail available.",
    tone: config.tone || "info",
    path: config.path || "/",
    source: config.source || "",
    commandKey: String(config.commandKey || config.key || "open-path"),
    actionLabel: String(config.actionLabel || config.label || "Open"),
    priority
  };
}

function pushUniqueHomeBaseCommandAction(actions = [], seenKeys = new Set(), action = null) {
  if (!action?.key || seenKeys.has(action.key)) return;
  seenKeys.add(action.key);
  actions.push(action);
}

function buildHomeBaseModuleSwitches(scorecards = []) {
  const scoreMap = Object.fromEntries(
    (scorecards || []).map((item) => [item.key, Number.isFinite(item.rankScore) ? item.rankScore : item.score || 0])
  );
  const labelMap = Object.fromEntries((scorecards || []).map((item) => [item.key, item.label]));
  const moduleWeights = {
    "/market-intelligence": { market: 0.94, watchlist: 0.76, execution: 0.08 },
    "/strategy-lab": { market: 0.38, execution: 0.48, watchlist: 0.18 },
    "/execution-center": { execution: 0.96, risk: 0.28, market: 0.08 },
    "/risk-control": { risk: 0.98, execution: 0.26, continuity: 0.08 },
    "/ai-copilot": { execution: 0.34, risk: 0.34, continuity: 0.28, review: 0.16 },
    "/journal-vault": { review: 0.88, continuity: 0.88, execution: 0.12 }
  };

  return coreModules
    .map((module) => {
      const weightedContexts = Object.entries(moduleWeights[module.href] || {})
        .map(([key, weight]) => ({
          key,
          label: labelMap[key] || key,
          contribution: (scoreMap[key] || 0) * weight
        }))
        .filter((item) => item.contribution > 0)
        .sort((left, right) => right.contribution - left.contribution);
      const priority = clampHomeBaseScore(
        38 + weightedContexts.reduce((total, item) => total + item.contribution, 0) / 2.2
      );
      const reason = weightedContexts.length
        ? `${weightedContexts
            .slice(0, 2)
            .map((item) => item.label)
            .join(" + ")} drives the next desk switch.`
        : module.summary;

      return {
        ...module,
        priority,
        reason
      };
    })
    .sort((left, right) => right.priority - left.priority)
    .map((module, index) => ({
      ...module,
      rank: index + 1
    }));
}

const HOME_BASE_WORKFLOW_STATE_KEYS = {
  open: "homeBaseDayOpenWorkflow",
  close: "homeBaseDayCloseWorkflow"
};

const HOME_BASE_WORKFLOW_CONFIG = {
  open: {
    key: "open",
    label: "Day Open",
    defaultStatus: "Waiting",
    inProgressStatus: "In Progress",
    completeStatus: "Ready",
    statuses: ["Waiting", "In Progress", "Ready"],
    summary:
      "Begin the desk from Home Base by reopening review, paper execution, risk posture, and continuity before fresh action.",
    captureLabel: "Open status capture",
    capturePlaceholder:
      "Record the opening posture, lead symbols, overnight carry context, and the first paper-safe priorities.",
    items: [
      {
        id: "review",
        label: "Review active stack",
        detail: "Reopen Journal Vault review snapshots or replay queues before expanding the desk.",
        linkTarget: "review",
        actionLabel: "Open Review"
      },
      {
        id: "execution",
        label: "Check paper execution",
        detail: "Confirm route readiness, open positions, and pending paper orders in Execution Center.",
        linkTarget: "execution",
        actionLabel: "Open Execution"
      },
      {
        id: "risk",
        label: "Confirm risk guard",
        detail: "Verify drawdown, open risk, protection state, and risk mode before new exposure.",
        linkTarget: "risk",
        actionLabel: "Open Risk"
      },
      {
        id: "continuity",
        label: "Reopen continuity posture",
        detail: "Restore the latest handoff, continuity collection, or continuity insight before the session ramps.",
        linkTarget: "continuity",
        actionLabel: "Open Continuity"
      }
    ]
  },
  close: {
    key: "close",
    label: "Day Close",
    defaultStatus: "Waiting",
    inProgressStatus: "In Progress",
    completeStatus: "Wrapped",
    statuses: ["Waiting", "In Progress", "Wrapped"],
    summary:
      "End the desk from Home Base by reviewing outcomes, confirming paper execution cleanup, locking risk posture, and preserving continuity.",
    captureLabel: "Close status capture",
    capturePlaceholder:
      "Record the closing posture, paper execution cleanup, risk notes, review outcome, and the next-session handoff.",
    items: [
      {
        id: "review",
        label: "Review session outcome",
        detail: "Capture the best and weakest decisions in Journal Vault before the desk closes.",
        linkTarget: "review",
        actionLabel: "Open Review"
      },
      {
        id: "execution",
        label: "Confirm paper execution cleanup",
        detail: "Check the paper order state, open position posture, and audit trail before wrapping.",
        linkTarget: "execution",
        actionLabel: "Open Execution"
      },
      {
        id: "risk",
        label: "Lock risk posture",
        detail: "Record the closing risk state, drawdown posture, and protection mode for the next session.",
        linkTarget: "risk",
        actionLabel: "Open Risk"
      },
      {
        id: "continuity",
        label: "Publish continuity handoff",
        detail: "Move the latest review and continuity context into the next operator handoff from Journal Vault.",
        linkTarget: "continuity",
        actionLabel: "Open Continuity"
      }
    ]
  }
};

function resolveHomeBaseWorkflowKey(workflowKey = "open") {
  return workflowKey === "close" ? "close" : "open";
}

function resolveHomeBaseWorkflowConfig(workflowKey = "open") {
  return HOME_BASE_WORKFLOW_CONFIG[resolveHomeBaseWorkflowKey(workflowKey)];
}

function resolveHomeBaseWorkflowStateKey(workflowKey = "open") {
  return HOME_BASE_WORKFLOW_STATE_KEYS[resolveHomeBaseWorkflowKey(workflowKey)];
}

function buildHomeBaseWorkflowItems(workflowKey, items = []) {
  const config = resolveHomeBaseWorkflowConfig(workflowKey);

  return config.items.map((item) => {
    const current = (items || []).find((entry) => entry?.id === item.id) || {};
    return {
      ...item,
      checked: Boolean(current.checked),
      checkedAt: String(current.checkedAt || ""),
      updatedAt: String(current.updatedAt || current.checkedAt || "")
    };
  });
}

function buildHomeBaseWorkflowRecord(workflowKey, workflow = {}) {
  const config = resolveHomeBaseWorkflowConfig(workflowKey);
  const items = buildHomeBaseWorkflowItems(workflowKey, workflow.items || []);
  const completedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const todayKey = getLocalDateKey();
  const sessionDate = String(workflow.sessionDate || todayKey).trim() || todayKey;
  const rawStatus = String(workflow.status || "").trim();
  const inferredStatus =
    completedCount >= totalCount && totalCount
      ? config.completeStatus
      : completedCount > 0 || String(workflow.statusCapture || "").trim()
        ? config.inProgressStatus
        : config.defaultStatus;

  return {
    key: config.key,
    label: config.label,
    defaultStatus: config.defaultStatus,
    inProgressStatus: config.inProgressStatus,
    completeStatus: config.completeStatus,
    statuses: config.statuses,
    summary: config.summary,
    captureLabel: config.captureLabel,
    capturePlaceholder: config.capturePlaceholder,
    sessionDate,
    sessionLabel: formatLocalDateLabel(sessionDate),
    isStale: sessionDate !== todayKey,
    status: config.statuses.includes(rawStatus) ? rawStatus : inferredStatus,
    statusCapture: String(workflow.statusCapture || "").slice(0, 1200),
    items,
    completedCount,
    totalCount,
    progressPct: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
    isComplete: completedCount >= totalCount && totalCount > 0,
    startedAt: String(workflow.startedAt || ""),
    lastUpdatedAt: String(workflow.lastUpdatedAt || workflow.startedAt || ""),
    completedAt: String(workflow.completedAt || "")
  };
}

function createFreshHomeBaseWorkflowRecord(workflowKey) {
  const config = resolveHomeBaseWorkflowConfig(workflowKey);
  const now = new Date().toISOString();

  return buildHomeBaseWorkflowRecord(workflowKey, {
    sessionDate: getLocalDateKey(),
    status: config.inProgressStatus,
    statusCapture: "",
    items: config.items.map((item) => ({ id: item.id, checked: false, checkedAt: "", updatedAt: now })),
    startedAt: now,
    lastUpdatedAt: now,
    completedAt: ""
  });
}

function buildHomeBaseSummary(state = {}) {
  const activeWatchlist = state.activeWatchlist || null;
  const activeWatch = state.activeWatch || null;
  const activeReviewSnapshot = resolveHomeBaseActiveItem(state.reviewSnapshots || [], state.activeReviewSnapshotId);
  const activeReplayQueue = resolveHomeBaseActiveItem(state.replayQueues || [], state.activeReplayQueueId);
  const latestHandoff = (state.handoffNotes || [])[0] || null;
  const activeContinuityReport = resolveHomeBaseActiveItem(
    state.continuityInsightReports || [],
    state.activeContinuityInsightReportId
  );
  const activeContinuityCollection = resolveHomeBaseActiveItem(
    state.continuityInsightCollections || [],
    state.activeContinuityInsightCollectionId
  );
  const selectedSymbol = String(state.selectedSymbol || activeWatch?.symbol || "").trim();
  const selectedRoute = state.selectedRoute || null;
  const marketPosture = state.marketPosture || null;
  const liveDataStatus = state.liveDataStatus || null;
  const liveDataDiagnostics = state.liveDataDiagnostics || null;
  const executionStatus = state.executionStatus || null;
  const riskSummary = state.riskSummary || null;
  const recentActions = state.recentActions || [];
  const promotedCheckpoints = state.promotedContinuityInsightCheckpoints || [];
  const feedHealth = liveDataDiagnostics?.feedHealth || liveDataStatus?.feedHealth || "";
  const marketSignal = parseHomeBaseNumeric(
    activeWatch?.signalStrength || marketPosture?.signalStrength || activeWatch?.confidence || activeWatch?.last,
    70
  );
  const openRisk = parseHomeBaseNumeric(riskSummary?.openRisk, 1.4);
  const drawdown = parseHomeBaseNumeric(riskSummary?.drawdown, 0.7);

  const marketScore = clampHomeBaseScore(
    (selectedSymbol ? 48 : 24) +
      (marketPosture?.posture ? 10 : 0) +
      Math.min(16, Math.round(marketSignal / 6)) +
      (liveDataStatus?.freshness === "Fresh"
        ? 16
        : liveDataStatus?.freshness === "Warm"
          ? 12
          : liveDataStatus?.freshness === "Session Hold"
            ? 10
            : liveDataStatus?.freshness === "Stale"
              ? 4
              : 6) +
      (feedHealth === "Stable" ? 6 : feedHealth === "Degraded" ? -16 : 0) +
      (marketPosture?.posture === "Defensive" ? -10 : 0)
  );
  const watchlistScore = clampHomeBaseScore(
    (activeWatchlist ? 48 : 18) +
      (activeWatchlist?.sessionIntent ? 18 : 0) +
      Math.min(12, (activeWatchlist?.sessionTags || []).length * 3) +
      (activeWatchlist?.notes ? 10 : 0) +
      ((activeWatchlist?.symbols || []).length >= 4 ? 10 : (activeWatchlist?.symbols || []).length >= 1 ? 5 : 0) +
      ((activeWatchlist?.symbols || []).includes(selectedSymbol) ? 8 : 0)
  );
  const reviewScore = clampHomeBaseScore(
    22 +
      (activeReviewSnapshot ? 28 : 0) +
      (activeReplayQueue ? 24 : 0) +
      Math.min(12, (state.reviewSnapshots || []).length * 4) +
      Math.min(10, (state.replayQueues || []).length * 3) +
      (activeReplayQueue?.itemKeys?.length ? 8 : 0)
  );
  const executionScore = clampHomeBaseScore(
    getExecutionReadinessScore(selectedRoute?.state, executionStatus) +
      (selectedRoute?.name ? 10 : 0) +
      Math.min(10, (state.openPositions || []).length * 4) +
      Math.min(8, (state.recentOrders || []).length * 2) +
      (state.protectionState === "Locked" ? -10 : 0)
  );
  const riskScore = clampHomeBaseScore(
    (state.protectionState === "Guarded"
      ? 84
      : state.protectionState === "Armed"
        ? 74
        : state.protectionState === "Locked"
          ? 66
          : 58) +
      (state.riskMode === "Defensive" ? 6 : state.riskMode === "Balanced" ? 4 : -6) +
      (openRisk <= 1.6 ? 8 : openRisk <= 2.2 ? 4 : -8) +
      (drawdown <= 1 ? 8 : drawdown <= 1.8 ? 4 : -8)
  );
  const continuityScore = clampHomeBaseScore(
    18 +
      (latestHandoff ? 34 : 0) +
      (activeContinuityCollection ? 24 : 0) +
      (activeContinuityReport ? 18 : 0) +
      (activeReviewSnapshot ? 6 : 0) +
      (activeReplayQueue ? 8 : 0) +
      Math.min(10, (activeContinuityCollection?.checkpoints || []).length * 2) +
      Math.min(10, promotedCheckpoints.length * 2)
  );

  const marketCard = buildHomeBaseScorecard({
    key: "market",
    label: "Market Posture",
    focusLabel: selectedSymbol || "No symbol",
    score: marketScore,
    state:
      marketPosture?.posture ||
      activeWatch?.signalState ||
      activeWatch?.status ||
      liveDataStatus?.state ||
      "Monitoring",
    detail:
      selectedSymbol && (activeWatch?.bias || marketPosture?.bias)
        ? `${selectedSymbol} | ${activeWatch?.bias || marketPosture?.bias}`
        : selectedSymbol
          ? `${selectedSymbol} | ${liveDataStatus?.freshness || "Waiting for live posture"}`
          : "Select a symbol to anchor live market posture and feed context.",
    path: "/market-intelligence",
    actionLabel: "Open Market Board",
    source: "market-intelligence",
    resumeable: true,
    reopenable: true,
    rankScore: marketScore + (selectedSymbol ? 6 : 0)
  });
  const watchlistCard = buildHomeBaseScorecard({
    key: "watchlist",
    label: "Watchlist Intent",
    focusLabel: activeWatchlist?.name || "No active market set",
    score: watchlistScore,
    state: activeWatchlist?.sessionIntent || activeWatchlist?.name || "No watchlist intent",
    detail: activeWatchlist
      ? `${activeWatchlist.name} | ${(activeWatchlist.sessionTags || []).slice(0, 3).join(", ") || "No session tags"}`
      : "Capture a local watchlist intent and tags to keep session focus explicit.",
    path: "/market-intelligence",
    actionLabel: "Open Watchlists",
    source: "watchlist",
    resumeable: true,
    reopenable: true,
    rankScore: watchlistScore + (activeWatchlist?.sessionIntent ? 8 : 2)
  });
  const reviewCard = buildHomeBaseScorecard({
    key: "review",
    label: "Review State",
    focusLabel: activeReviewSnapshot?.name || activeReplayQueue?.name || "No active review stack",
    score: reviewScore,
    state: activeReviewSnapshot
      ? "Snapshot ready"
      : activeReplayQueue
        ? "Replay queue active"
        : (state.reviewSnapshots || []).length
          ? "Snapshots saved"
          : "Review waiting",
    detail: activeReviewSnapshot
      ? activeReviewSnapshot.summary || `${activeReviewSnapshot.name} is ready to resume.`
      : activeReplayQueue
        ? `${activeReplayQueue.name} | ${activeReplayQueue.itemKeys?.length || 0} replay items`
        : "Store a review snapshot or replay queue in Journal Vault for faster desk recovery.",
    path: "/journal-vault",
    actionLabel: activeReplayQueue ? "Open Replay Queue" : activeReviewSnapshot ? "Resume Review" : "Open Review Desk",
    source: activeReplayQueue ? "replay-queue" : activeReviewSnapshot ? "review-snapshot" : "review-desk",
    resumeable: Boolean(activeReplayQueue || activeReviewSnapshot || (state.reviewSnapshots || []).length),
    reopenable: Boolean(activeReplayQueue || activeReviewSnapshot),
    rankScore: reviewScore + (activeReplayQueue || activeReviewSnapshot ? 14 : 4)
  });
  const executionCard = buildHomeBaseScorecard({
    key: "execution",
    label: "Execution Readiness",
    focusLabel: selectedRoute?.name || executionStatus?.label || "Execution Center",
    score: executionScore,
    state: selectedRoute?.state || executionStatus?.label || "Paper-safe",
    detail: selectedRoute
      ? `${selectedRoute.name} | ${(state.openPositions || []).length} positions | ${executionStatus?.mode || "Paper mode"}`
      : `${(state.recentOrders || []).length} recent orders | ${executionStatus?.label || "Paper-safe execution"}`,
    path: "/execution-center",
    actionLabel: "Open Execution Center",
    source: "execution-center",
    resumeable: true,
    reopenable: true,
    rankScore: executionScore + (selectedRoute ? 10 : 3)
  });
  const riskCard = buildHomeBaseScorecard({
    key: "risk",
    label: "Risk Posture",
    focusLabel: `${state.riskMode || "Balanced"} | ${state.protectionState || "Armed"}`,
    score: riskScore,
    state: `${state.riskMode || "Balanced"} | ${state.protectionState || "Armed"}`,
    detail: `${riskSummary?.openRisk || "--"} open risk | ${riskSummary?.drawdown || "--"} drawdown`,
    path: "/risk-control",
    actionLabel: "Open Risk Console",
    source: "risk-control",
    resumeable: true,
    reopenable: true,
    rankScore: riskScore + (state.protectionState === "Locked" ? 6 : 2)
  });
  const continuityCard = buildHomeBaseScorecard({
    key: "continuity",
    label: "Continuity / Handoff",
    focusLabel:
      latestHandoff?.watchlistName ||
      activeContinuityCollection?.name ||
      activeContinuityReport?.name ||
      "No active continuity packet",
    score: continuityScore,
    state: latestHandoff
      ? "Handoff ready"
      : activeContinuityCollection
        ? "Collection active"
        : activeContinuityReport
          ? "Insight ready"
          : "Continuity waiting",
    detail: latestHandoff
      ? `${latestHandoff.watchlistName || "Handoff"} | ${latestHandoff.snapshotName || "No snapshot"} | ${latestHandoff.replayQueueName || "No queue"}`
      : activeContinuityCollection
        ? `${activeContinuityCollection.name} | ${(activeContinuityCollection.checkpoints || []).length} checkpoints`
        : activeContinuityReport
          ? activeContinuityReport.name
          : "Keep a handoff, continuity collection, or report ready for the next desk restart.",
    path: "/journal-vault",
    actionLabel: latestHandoff
      ? "Open Handoff"
      : activeContinuityCollection
        ? "Reopen Collection"
        : activeContinuityReport
          ? "Open Continuity Insight"
          : "Open Journal Vault",
    source: latestHandoff
      ? "handoff"
      : activeContinuityCollection
        ? "continuity-collection"
        : activeContinuityReport
          ? "continuity-report"
          : "journal-vault",
    resumeable: Boolean(latestHandoff || activeContinuityCollection || activeContinuityReport),
    reopenable: Boolean(latestHandoff || activeContinuityCollection || activeContinuityReport),
    rankScore:
      continuityScore +
      (latestHandoff ? 18 : activeContinuityCollection ? 12 : activeContinuityReport ? 8 : 2)
  });

  const scorecards = [
    marketCard,
    watchlistCard,
    reviewCard,
    executionCard,
    riskCard,
    continuityCard
  ];
  const contextRankings = scorecards
    .slice()
    .sort((left, right) => right.rankScore - left.rankScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  const moduleSwitches = buildHomeBaseModuleSwitches(scorecards);
  const resumeOptions = [];
  const resumeSeen = new Set();

  if (latestHandoff) {
    pushUniqueHomeBaseCommandAction(
      resumeOptions,
      resumeSeen,
      buildHomeBaseCommandAction({
        key: "resume-handoff",
        label: "Resume Handoff",
        focusLabel: latestHandoff.watchlistName || "Handoff Packet",
        detail: `${latestHandoff.sessionIntent || "No intent"} | ${latestHandoff.snapshotName || "No snapshot"} | ${latestHandoff.replayQueueName || "No queue"}`,
        tone: "success",
        path: "/journal-vault",
        source: "handoff",
        commandKey: "resume-handoff",
        actionLabel: "Open Handoff",
        priority: continuityCard.rankScore + 28
      })
    );
  }

  if (activeContinuityCollection) {
    pushUniqueHomeBaseCommandAction(
      resumeOptions,
      resumeSeen,
      buildHomeBaseCommandAction({
        key: "resume-continuity-collection",
        label: "Resume Continuity Collection",
        focusLabel: activeContinuityCollection.name || "Continuity Collection",
        detail:
          activeContinuityCollection.summary ||
          `${(activeContinuityCollection.checkpoints || []).length} checkpoints are ready for reopening.`,
        tone: continuityCard.tone,
        path: "/journal-vault",
        source: "continuity-collection",
        commandKey: "resume-continuity-collection",
        actionLabel: "Reopen Collection",
        priority: continuityCard.rankScore + 20
      })
    );
  }

  if (activeReplayQueue) {
    pushUniqueHomeBaseCommandAction(
      resumeOptions,
      resumeSeen,
      buildHomeBaseCommandAction({
        key: "resume-replay-queue",
        label: "Resume Replay Queue",
        focusLabel: activeReplayQueue.name || "Replay Queue",
        detail: `${activeReplayQueue.itemKeys?.length || 0} replay items are waiting in the active queue.`,
        tone: reviewCard.tone,
        path: "/journal-vault",
        source: "replay-queue",
        commandKey: "resume-replay-queue",
        actionLabel: "Open Replay Queue",
        priority: reviewCard.rankScore + 18
      })
    );
  }

  if (activeReviewSnapshot) {
    pushUniqueHomeBaseCommandAction(
      resumeOptions,
      resumeSeen,
      buildHomeBaseCommandAction({
        key: "resume-review-snapshot",
        label: "Resume Review Snapshot",
        focusLabel: activeReviewSnapshot.name || "Review Snapshot",
        detail: activeReviewSnapshot.summary || "Saved review snapshot is ready to resume.",
        tone: "info",
        path: "/journal-vault",
        source: "review-snapshot",
        commandKey: "resume-review-snapshot",
        actionLabel: "Resume Review",
        priority: reviewCard.rankScore + 14
      })
    );
  }

  if (activeContinuityReport) {
    pushUniqueHomeBaseCommandAction(
      resumeOptions,
      resumeSeen,
      buildHomeBaseCommandAction({
        key: "resume-continuity-report",
        label: "Resume Continuity Insight",
        focusLabel: activeContinuityReport.name || "Continuity Insight",
        detail: continuityCard.detail,
        tone: continuityCard.tone,
        path: "/journal-vault",
        source: "continuity-report",
        commandKey: "resume-continuity-report",
        actionLabel: "Open Insight",
        priority: continuityCard.rankScore + 10
      })
    );
  }

  pushUniqueHomeBaseCommandAction(
    resumeOptions,
    resumeSeen,
    buildHomeBaseCommandAction({
      key: "resume-execution-desk",
      label: "Execution Desk",
      focusLabel: executionCard.focusLabel,
      detail: executionCard.detail,
      tone: executionCard.tone,
      path: "/execution-center",
      source: "execution-center",
      commandKey: "open-execution-center",
      actionLabel: "Open Execution Center",
      priority: executionCard.rankScore + 6
    })
  );
  pushUniqueHomeBaseCommandAction(
    resumeOptions,
    resumeSeen,
    buildHomeBaseCommandAction({
      key: "resume-market-desk",
      label: "Market Desk",
      focusLabel: marketCard.focusLabel,
      detail: marketCard.detail,
      tone: marketCard.tone,
      path: "/market-intelligence",
      source: "market-intelligence",
      commandKey: "open-market-intelligence",
      actionLabel: "Open Market Board",
      priority: marketCard.rankScore + 4
    })
  );
  pushUniqueHomeBaseCommandAction(
    resumeOptions,
    resumeSeen,
    buildHomeBaseCommandAction({
      key: "resume-risk-desk",
      label: "Risk Desk",
      focusLabel: riskCard.focusLabel,
      detail: riskCard.detail,
      tone: riskCard.tone,
      path: "/risk-control",
      source: "risk-control",
      commandKey: "open-risk-control",
      actionLabel: "Open Risk Console",
      priority: riskCard.rankScore + 2
    })
  );

  const rankedResumeOptions = resumeOptions
    .slice()
    .sort((left, right) => right.priority - left.priority)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  const resumeTarget =
    rankedResumeOptions[0] ||
    buildHomeBaseCommandAction({
      key: "resume-execution-desk",
      label: "Execution Desk",
      focusLabel: "Execution Center",
      detail: "Execution Center is the default desk continuation lane.",
      tone: "warning",
      path: "/execution-center",
      source: "execution-center",
      commandKey: "open-execution-center",
      actionLabel: "Open Execution Center",
      priority: 50
    });
  const quickActions = [];
  const quickSeen = new Set();

  pushUniqueHomeBaseCommandAction(
    quickActions,
    quickSeen,
    buildHomeBaseCommandAction({
      key: "resume-best-context",
      label: "Resume Best Context",
      focusLabel: resumeTarget.focusLabel,
      detail: resumeTarget.detail,
      tone: resumeTarget.tone,
      path: resumeTarget.path,
      source: resumeTarget.source,
      commandKey: "resume-best-context",
      actionLabel: resumeTarget.actionLabel,
      priority: resumeTarget.priority + 12
    })
  );

  if (state.protectionState !== "Armed" || riskCard.score < 72) {
    pushUniqueHomeBaseCommandAction(
      quickActions,
      quickSeen,
      buildHomeBaseCommandAction({
        key: "review-risk-posture",
        label: state.protectionState === "Locked" ? "Review Risk Guard" : "Check Risk Posture",
        focusLabel: riskCard.focusLabel,
        detail: riskCard.detail,
        tone: riskCard.tone,
        path: "/risk-control",
        source: "risk-control",
        commandKey: "open-risk-control",
        actionLabel: "Open Risk Console",
        priority: riskCard.rankScore + (state.protectionState === "Locked" ? 26 : 18)
      })
    );
  }

  if (activeReplayQueue || activeReviewSnapshot) {
    pushUniqueHomeBaseCommandAction(
      quickActions,
      quickSeen,
      buildHomeBaseCommandAction({
        key: "resume-review-stack",
        label: "Resume Review Stack",
        focusLabel: reviewCard.focusLabel,
        detail: reviewCard.detail,
        tone: reviewCard.tone,
        path: "/journal-vault",
        source: activeReplayQueue ? "replay-queue" : "review-snapshot",
        commandKey: "resume-review-stack",
        actionLabel: activeReplayQueue ? "Open Replay Queue" : "Resume Review",
        priority: reviewCard.rankScore + 20
      })
    );
  }

  if (latestHandoff || activeContinuityCollection || activeContinuityReport) {
    pushUniqueHomeBaseCommandAction(
      quickActions,
      quickSeen,
      buildHomeBaseCommandAction({
        key: "open-continuity-posture",
        label: "Open Continuity Posture",
        focusLabel: continuityCard.focusLabel,
        detail: continuityCard.detail,
        tone: continuityCard.tone,
        path: "/journal-vault",
        source: continuityCard.source,
        commandKey: "open-continuity-posture",
        actionLabel: continuityCard.actionLabel,
        priority: continuityCard.rankScore + 16
      })
    );
  }

  pushUniqueHomeBaseCommandAction(
    quickActions,
    quickSeen,
    buildHomeBaseCommandAction({
      key: "open-execution-desk",
      label: "Check Execution Desk",
      focusLabel: executionCard.focusLabel,
      detail: executionCard.detail,
      tone: executionCard.tone,
      path: "/execution-center",
      source: "execution-center",
      commandKey: "open-execution-center",
      actionLabel: "Open Execution Center",
      priority: executionCard.rankScore + 12
    })
  );
  pushUniqueHomeBaseCommandAction(
    quickActions,
    quickSeen,
    buildHomeBaseCommandAction({
      key: "open-market-board",
      label: "Refresh Market Board",
      focusLabel: marketCard.focusLabel,
      detail: marketCard.detail,
      tone: marketCard.tone,
      path: "/market-intelligence",
      source: "market-intelligence",
      commandKey: "open-market-intelligence",
      actionLabel: "Open Market Board",
      priority: marketCard.rankScore + 10
    })
  );
  pushUniqueHomeBaseCommandAction(
    quickActions,
    quickSeen,
    buildHomeBaseCommandAction({
      key: "open-watchlist-intent",
      label: "Switch Market Set",
      focusLabel: watchlistCard.focusLabel,
      detail: watchlistCard.detail,
      tone: watchlistCard.tone,
      path: "/market-intelligence",
      source: "watchlist",
      commandKey: "open-watchlists",
      actionLabel: "Open Watchlists",
      priority: watchlistCard.rankScore + 8
    })
  );
  pushUniqueHomeBaseCommandAction(
    quickActions,
    quickSeen,
    buildHomeBaseCommandAction({
      key: "open-copilot-brief",
      label: "Open Copilot Brief",
      focusLabel: `${selectedSymbol || "Desk"} | ${selectedRoute?.name || "No route"}`,
      detail:
        state.aiGuidance?.nextAction ||
        state.aiGuidance?.executionSuggestion ||
        "Open AI Copilot for the current desk summary and next action guidance.",
      tone: "info",
      path: "/ai-copilot",
      source: "ai-copilot",
      commandKey: "open-ai-copilot",
      actionLabel: "Open AI Copilot",
      priority:
        ((executionCard.rankScore + riskCard.rankScore + continuityCard.rankScore) / 3) + 6
    })
  );
  moduleSwitches.slice(0, 2).forEach((module) => {
    pushUniqueHomeBaseCommandAction(
      quickActions,
      quickSeen,
      buildHomeBaseCommandAction({
        key: `switch-${module.key}`,
        label: `Switch To ${module.label}`,
        focusLabel: module.label,
        detail: module.reason,
        tone: module.tone,
        path: module.href,
        source: module.key,
        commandKey: "switch-module",
        actionLabel: `Open ${module.label}`,
        priority: module.priority + 4
      })
    );
  });
  const rankedQuickActions = quickActions
    .slice()
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 6)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  const overallScore = clampHomeBaseScore(
    (marketCard.score * 1.05 +
      watchlistCard.score * 0.9 +
      reviewCard.score +
      executionCard.score * 1.05 +
      riskCard.score +
      continuityCard.score * 1.05) /
      6.05
  );
  const overallTone = getHomeBaseScoreTone(overallScore);
  const latestAction = recentActions[0] || null;

  return {
    overallScore,
    overallTone,
    overallState: getHomeBaseScoreState(overallScore),
    scorecards,
    contextRankings,
    topContexts: contextRankings.slice(0, 3),
    quickActions: rankedQuickActions,
    resumeOptions: rankedResumeOptions,
    resumeTarget,
    moduleSwitches,
    summary: `${contextRankings[0]?.label || "Desk context"} leads the operating desk at ${contextRankings[0]?.score || overallScore}%. ${resumeTarget.actionLabel} is the cleanest next context.`,
    latestAction
  };
}

let lastHomeBaseSummarySelectorState = null;
let lastHomeBaseSummarySelectorSignature = "";
let lastHomeBaseSummarySelectorValue = null;

function buildHomeBaseSummarySelectorSignature(state = {}) {
  const selectedRoute = state.selectedRoute || null;
  const activeWatchlist = state.activeWatchlist || null;
  const activeWatch = state.activeWatch || null;
  const liveDataStatus = state.liveDataStatus || null;
  const liveDataDiagnostics = state.liveDataDiagnostics || null;
  const executionStatus = state.executionStatus || null;
  const riskSummary = state.riskSummary || null;
  const recentAction = (state.recentActions || [])[0] || null;

  return JSON.stringify({
    selectedSymbol: state.selectedSymbol || "",
    selectedRoute: selectedRoute ? [selectedRoute.name || "", selectedRoute.state || "", selectedRoute.asset || ""] : [],
    activeWatchlist: activeWatchlist
      ? [
          activeWatchlist.id || "",
          activeWatchlist.name || "",
          activeWatchlist.sessionIntent || "",
          activeWatchlist.notes || "",
          activeWatchlist.symbols || [],
          activeWatchlist.sessionTags || []
        ]
      : [],
    activeWatch: activeWatch
      ? [
          activeWatch.symbol || "",
          activeWatch.bias || "",
          activeWatch.signalState || "",
          activeWatch.status || "",
          activeWatch.signalStrength || "",
          activeWatch.confidence || "",
          activeWatch.last || ""
        ]
      : [],
    reviewSnapshots: (state.reviewSnapshots || []).map((item) => [item.id || "", item.name || "", item.summary || ""]),
    activeReviewSnapshotId: state.activeReviewSnapshotId || "",
    replayQueues: (state.replayQueues || []).map((item) => [item.id || "", item.name || "", (item.itemKeys || []).length]),
    activeReplayQueueId: state.activeReplayQueueId || "",
    latestHandoff: ((state.handoffNotes || []).slice(0, 1) || []).map((item) => [
      item.id || "",
      item.watchlistName || "",
      item.snapshotId || "",
      item.replayQueueId || "",
      item.sessionIntent || ""
    ]),
    continuityReports: (state.continuityInsightReports || []).map((item) => [
      item.id || "",
      item.name || "",
      item.summary || "",
      item.filters?.route || "",
      item.filters?.protectionState || "",
      item.filters?.symbol || "",
      (item.trendSnapshots || []).length
    ]),
    activeContinuityInsightReportId: state.activeContinuityInsightReportId || "",
    continuityCollections: (state.continuityInsightCollections || []).map((item) => [
      item.id || "",
      item.name || "",
      item.summary || "",
      (item.checkpoints || []).length
    ]),
    activeContinuityInsightCollectionId: state.activeContinuityInsightCollectionId || "",
    promotedCheckpoints: (state.promotedContinuityInsightCheckpoints || []).map((item) => [
      item.id || "",
      item.collectionId || "",
      item.reportId || "",
      item.label || ""
    ]),
    liveDataStatus: liveDataStatus
      ? [liveDataStatus.label || "", liveDataStatus.state || "", liveDataStatus.freshness || "", liveDataStatus.feedHealth || "", liveDataStatus.tone || ""]
      : [],
    liveDataDiagnostics: liveDataDiagnostics ? [liveDataDiagnostics.feedHealth || "", liveDataDiagnostics.providerState || ""] : [],
    executionStatus: executionStatus
      ? [
          executionStatus.label || "",
          executionStatus.mode || "",
          executionStatus.tone || "",
          executionStatus.pendingOrders || 0,
          executionStatus.openPositions || 0
        ]
      : [],
    riskSummary: riskSummary ? [riskSummary.openRisk || "", riskSummary.drawdown || "", riskSummary.guardStatus || ""] : [],
    riskMode: state.riskMode || "",
    protectionState: state.protectionState || "",
    openPositionsLength: (state.openPositions || []).length,
    recentOrdersLength: (state.recentOrders || []).length,
    aiGuidance: [state.aiGuidance?.nextAction || "", state.aiGuidance?.executionSuggestion || ""],
    recentAction: recentAction ? [recentAction.id || "", recentAction.title || "", recentAction.status || "", recentAction.detail || ""] : []
  });
}

export function selectHomeBaseSummary(state) {
  const signature = buildHomeBaseSummarySelectorSignature(state);

  if (signature === lastHomeBaseSummarySelectorSignature && lastHomeBaseSummarySelectorValue) {
    return lastHomeBaseSummarySelectorValue;
  }
  if (state === lastHomeBaseSummarySelectorState && lastHomeBaseSummarySelectorValue) {
    return lastHomeBaseSummarySelectorValue;
  }

  const nextSummary = buildHomeBaseSummary(state);
  lastHomeBaseSummarySelectorState = state;
  lastHomeBaseSummarySelectorSignature = signature;
  lastHomeBaseSummarySelectorValue = nextSummary;
  return nextSummary;
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
  pinnedContinuityInsightReportIds: [],
  pinnedContinuityInsightCollectionIds: [],
  pinnedContinuityInsightPairs: [],
  continuityAlertHistory: [],
  homeBaseDayOpenWorkflow: buildHomeBaseWorkflowRecord("open"),
  homeBaseDayCloseWorkflow: buildHomeBaseWorkflowRecord("close"),
  promotedContinuityInsightCheckpoints: [],
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
    promotedContinuityInsightCheckpoints: normalizePromotedContinuityInsightCheckpointRecords(
      state.promotedContinuityInsightCheckpoints || [],
      { ...state, continuityInsightReports, continuityInsightCollections }
    ),
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
    pinnedContinuityInsightReportIds: normalizePinnedIds(
      (state.pinnedContinuityInsightReportIds || []).filter((reportId) =>
        continuityInsightReports.some((report) => report.id === reportId)
      )
    ),
    pinnedContinuityInsightCollectionIds: normalizePinnedIds(
      (state.pinnedContinuityInsightCollectionIds || []).filter((collectionId) =>
        continuityInsightCollections.some((collection) => collection.id === collectionId)
      )
    ),
    pinnedContinuityInsightPairs: normalizePinnedContinuityInsightPairRecords(
      state.pinnedContinuityInsightPairs || [],
      { ...state, continuityInsightReports }
    ),
    continuityAlertHistory: (state.continuityAlertHistory || []).map((alert) =>
      buildContinuityAlertRecord(alert, alert)
    ),
    homeBaseDayOpenWorkflow: buildHomeBaseWorkflowRecord("open", state.homeBaseDayOpenWorkflow || {}),
    homeBaseDayCloseWorkflow: buildHomeBaseWorkflowRecord("close", state.homeBaseDayCloseWorkflow || {}),
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
        const nextState = rehydrateState(baseData, startupState);
        if (
          current.hydrated &&
          current.baseData === nextState.baseData &&
          current.selectedSymbol === nextState.selectedSymbol &&
          current.selectedRoute?.name === nextState.selectedRoute?.name &&
          current.chartTimeframe === nextState.chartTimeframe &&
          current.liveDataSource === nextState.liveDataSource &&
          current.executionProvider === nextState.executionProvider
        ) {
          return;
        }
        set(nextState);
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
        if (mappedSymbol === current.selectedSymbol) return;
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
        if (match.name === current.selectedRoute?.name && match.asset === current.selectedSymbol) return;

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
        if (liveDataSource === current.liveDataSource) return;
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
        if (timeframeKey === current.chartTimeframe) return;

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
        if (executionProvider === current.executionProvider) return;

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
        const nextCollections = (current.continuityInsightCollections || []).map((collection) =>
          buildContinuityInsightCollectionRecord(
            { continuityInsightReports: nextReports },
            collection.name,
            collection,
            collection
          )
        );
        const nextComparison = resolveContinuityInsightComparisonIds(
          nextReports,
          report.id,
          current.continuityInsightPrimaryReportId || current.activeContinuityInsightReportId || "",
          report.id
        );

        set({
          continuityInsightReports: nextReports,
          continuityInsightCollections: nextCollections,
          activeContinuityInsightReportId: report.id,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightReports: nextReports,
            continuityInsightCollections: nextCollections
          }),
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
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightReports: nextReports,
            continuityInsightCollections: nextCollections
          }),
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
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightReports: nextReports,
            continuityInsightCollections: nextCollections
          }),
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
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
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
        const nextCollections = (current.continuityInsightCollections || []).map((item) =>
          item.id === collectionId ? nextCollection : item
        );

        set({
          continuityInsightCollections: nextCollections,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
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
        const nextCollections = (current.continuityInsightCollections || []).filter(
          (item) => item.id !== collectionId
        );

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId:
            current.activeContinuityInsightCollectionId === collectionId
              ? nextCollections[0]?.id || ""
              : current.activeContinuityInsightCollectionId,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
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
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId: nextCollection.id,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
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
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
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
      saveContinuityInsightCollectionNotes(collectionId, notes) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        if (!existing) return;
        const nextNoteHistory = buildNextContinuityInsightCollectionNoteHistory(existing, notes);
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          { ...existing, notes, noteHistory: nextNoteHistory },
          existing
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId:
            current.activeContinuityInsightCollectionId === collectionId
              ? nextCollection.id
              : current.activeContinuityInsightCollectionId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity collection notes saved",
            `${nextCollection.name} notes were updated for longer-horizon local continuity review.`,
            "Logged"
          )
        });
      },
      restoreContinuityInsightCollectionNoteRevision(collectionId, noteRevisionId) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        const revision = (existing?.noteHistory || []).find((item) => item.id === noteRevisionId);
        if (!existing || !revision) return;

        const nextNoteHistory = buildNextContinuityInsightCollectionNoteHistory(existing, revision.note);
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          {
            ...existing,
            notes: revision.note,
            noteHistory: nextNoteHistory
          },
          existing
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId:
            current.activeContinuityInsightCollectionId === collectionId
              ? nextCollection.id
              : current.activeContinuityInsightCollectionId,
          recentActions: pushAction(
            current.recentActions,
            "Continuity note revision restored",
            `${nextCollection.name} reopened a saved note revision for longer-horizon review continuity.`,
            "Logged"
          )
        });
      },
      saveContinuityInsightCollectionCheckpoint(collectionId, reportId, payload = {}) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        if (!existing) return;
        const currentCheckpoint =
          (existing.checkpoints || []).find((checkpoint) => checkpoint.reportId === reportId) || null;
        const nextCheckpoint = buildContinuityInsightCollectionCheckpointRecord(
          existing.reportIds || [],
          { ...payload, reportId },
          currentCheckpoint
        );
        if (!nextCheckpoint) return;
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          {
            ...existing,
            checkpoints: [
              nextCheckpoint,
              ...(existing.checkpoints || []).filter((checkpoint) => checkpoint.reportId !== reportId)
            ]
          },
          existing
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId:
            current.activeContinuityInsightCollectionId === collectionId
              ? nextCollection.id
              : current.activeContinuityInsightCollectionId,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
          recentActions: pushAction(
            current.recentActions,
            currentCheckpoint ? "Continuity checkpoint updated" : "Continuity checkpoint pinned",
            `${nextCheckpoint.label} ${currentCheckpoint ? "was updated" : "was added"} inside ${nextCollection.name}.`,
            "Logged"
          )
        });
      },
      removeContinuityInsightCollectionCheckpoint(collectionId, checkpointId) {
        const current = get();
        const existing = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        const checkpoint = (existing?.checkpoints || []).find((item) => item.id === checkpointId);
        if (!existing || !checkpoint) return;
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existing.name,
          {
            ...existing,
            checkpoints: (existing.checkpoints || []).filter((item) => item.id !== checkpointId)
          },
          existing
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== collectionId)
        ];

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId:
            current.activeContinuityInsightCollectionId === collectionId
              ? nextCollection.id
              : current.activeContinuityInsightCollectionId,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
          recentActions: pushAction(
            current.recentActions,
            "Continuity checkpoint removed",
            `${checkpoint.label} was removed from ${nextCollection.name}.`,
            "Logged"
          )
        });
      },
      importContinuityInsightCollectionPack(pack, options = {}) {
        const current = get();
        const collection = pack?.collection && typeof pack.collection === "object" ? pack.collection : null;
        const importedReports = Array.isArray(pack?.reports) ? pack.reports.filter((report) => report && typeof report === "object") : [];
        if (!collection || !importedReports.length) return;

        const existingReports = current.continuityInsightReports || [];
        const reportFingerprintMap = new Map(
          existingReports.map((report) => [buildContinuityInsightReportFingerprint(report), report])
        );
        const rawReportIdMap = new Map();
        const nextImportedReports = [];

        importedReports.forEach((report) => {
          const fingerprint = buildContinuityInsightReportFingerprint(report);
          const existingReport = reportFingerprintMap.get(fingerprint) || null;
          const resolvedReport = existingReport || buildImportedContinuityInsightReportRecord(report);

          if (!existingReport) {
            nextImportedReports.push(resolvedReport);
            reportFingerprintMap.set(fingerprint, resolvedReport);
          }

          const sourceId = String(report.id || "").trim();
          if (sourceId) rawReportIdMap.set(sourceId, resolvedReport.id);
        });

        const nextReports = [...nextImportedReports, ...existingReports].slice(0, 32);
        const collectionReportIds = (
          Array.isArray(collection.reportIds) && collection.reportIds.length
            ? collection.reportIds.map((reportId) => rawReportIdMap.get(String(reportId || "").trim()) || "")
            : importedReports.map((report) => rawReportIdMap.get(String(report.id || "").trim()) || "")
        ).filter(Boolean);
        if (!collectionReportIds.length) return;

        const importedCollection = buildImportedContinuityInsightCollectionRecord(
          { continuityInsightReports: nextReports },
          {
            ...collection,
            reportIds: collectionReportIds
          }
        );
        const collectionFingerprint = buildContinuityInsightCollectionFingerprint(importedCollection);
        const existingCollection =
          (current.continuityInsightCollections || []).find(
            (item) => buildContinuityInsightCollectionFingerprint(item) === collectionFingerprint
          ) || null;
        const nextCollection = existingCollection
          ? buildImportedContinuityInsightCollectionRecord(
              { continuityInsightReports: nextReports },
              { ...existingCollection, ...importedCollection, id: existingCollection.id }
            )
          : importedCollection;
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== nextCollection.id)
        ].slice(0, 16);
        const shouldActivate = options.activate !== false;
        const nextComparison = shouldActivate
          ? resolveContinuityInsightComparisonIds(
              nextReports,
              nextCollection.primaryReportId || collectionReportIds[0] || current.continuityInsightPrimaryReportId || "",
              nextCollection.comparisonReportId || "",
              nextCollection.primaryReportId || current.activeContinuityInsightReportId || ""
            )
          : null;

        set({
          continuityInsightReports: nextReports,
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId: shouldActivate ? nextCollection.id : current.activeContinuityInsightCollectionId,
          ...(nextComparison
            ? {
                activeContinuityInsightReportId:
                  nextComparison.primaryReportId || current.activeContinuityInsightReportId,
                continuityInsightPrimaryReportId:
                  nextComparison.primaryReportId || current.continuityInsightPrimaryReportId,
                continuityInsightComparisonReportId: nextComparison.comparisonReportId
              }
            : {}),
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightReports: nextReports,
            continuityInsightCollections: nextCollections
          }),
          recentActions: pushAction(
            current.recentActions,
            "Continuity collection pack imported",
            `${nextCollection.name} restored ${collectionReportIds.length} saved reports into the local continuity library.`,
            "Logged"
          )
        });
      },
      togglePromotedContinuityInsightCheckpoint(collectionId, checkpointId) {
        const current = get();
        const nextPromotion = buildPromotedContinuityInsightCheckpointRecord(current, { collectionId, checkpointId });
        if (!nextPromotion) return;
        const existingPromotions = current.promotedContinuityInsightCheckpoints || [];
        const signature = `${nextPromotion.collectionId}::${nextPromotion.checkpointId}`;
        const alreadyPromoted = existingPromotions.some(
          (item) => `${item.collectionId}::${item.checkpointId}` === signature
        );
        const nextPromotions = alreadyPromoted
          ? existingPromotions.filter((item) => `${item.collectionId}::${item.checkpointId}` !== signature)
          : [nextPromotion, ...existingPromotions].slice(0, 12);

        set({
          promotedContinuityInsightCheckpoints: normalizePromotedContinuityInsightCheckpointRecords(
            nextPromotions,
            current
          ),
          recentActions: pushAction(
            current.recentActions,
            alreadyPromoted ? "Continuity checkpoint demoted" : "Continuity checkpoint promoted",
            `${nextPromotion.label} ${
              alreadyPromoted
                ? "was removed from shell favorites."
                : "was elevated into shell favorites for faster long-arc reopen."
            }`,
            "Logged"
          )
        });
      },
      openPromotedContinuityInsightCheckpoint(promotionId) {
        const current = get();
        const promotion = (current.promotedContinuityInsightCheckpoints || []).find((item) => item.id === promotionId);
        if (!promotion) return;
        const existingCollection =
          (current.continuityInsightCollections || []).find((item) => item.id === promotion.collectionId) || null;
        const report =
          (current.continuityInsightReports || []).find((item) => item.id === promotion.reportId) || null;
        if (!existingCollection || !report) return;

        const reopenedAt = new Date().toISOString();
        const nextCollection = buildContinuityInsightCollectionRecord(
          current,
          existingCollection.name,
          { ...existingCollection, lastOpenedAt: reopenedAt },
          existingCollection
        );
        const nextCollections = [
          nextCollection,
          ...(current.continuityInsightCollections || []).filter((item) => item.id !== promotion.collectionId)
        ];
        const nextComparison = resolveContinuityInsightComparisonIds(
          current.continuityInsightReports || [],
          report.id,
          nextCollection.reportIds.find((id) => id !== report.id) || current.continuityInsightComparisonReportId,
          report.id
        );

        set({
          continuityInsightCollections: nextCollections,
          activeContinuityInsightCollectionId: nextCollection.id,
          activeContinuityInsightReportId: report.id,
          continuityInsightPrimaryReportId: nextComparison.primaryReportId,
          continuityInsightComparisonReportId: nextComparison.comparisonReportId,
          promotedContinuityInsightCheckpoints: buildPromotedContinuityInsightCheckpointState(current, {
            continuityInsightCollections: nextCollections
          }),
          recentActions: pushAction(
            current.recentActions,
            "Promoted continuity checkpoint reopened",
            `${promotion.label} reopened ${nextCollection.name} from shell favorites for long-horizon review trust.`,
            "Logged"
          )
        });
      },
      togglePinnedContinuityInsightReport(reportId) {
        const current = get();
        const report = (current.continuityInsightReports || []).find((item) => item.id === reportId);
        if (!report) return;
        const nextPinnedIds = togglePinnedId(current.pinnedContinuityInsightReportIds || [], report.id);
        const isPinned = nextPinnedIds.includes(report.id);

        set({
          pinnedContinuityInsightReportIds: nextPinnedIds,
          recentActions: pushAction(
            current.recentActions,
            isPinned ? "Continuity insight report pinned" : "Continuity insight report unpinned",
            `${report.name} ${isPinned ? "is now pinned for one-click reopen" : "was removed from pinned continuity reports"}.`,
            "Logged"
          )
        });
      },
      togglePinnedContinuityInsightCollection(collectionId) {
        const current = get();
        const collection = (current.continuityInsightCollections || []).find((item) => item.id === collectionId);
        if (!collection) return;
        const nextPinnedIds = togglePinnedId(current.pinnedContinuityInsightCollectionIds || [], collection.id);
        const isPinned = nextPinnedIds.includes(collection.id);

        set({
          pinnedContinuityInsightCollectionIds: nextPinnedIds,
          recentActions: pushAction(
            current.recentActions,
            isPinned ? "Continuity collection pinned" : "Continuity collection unpinned",
            `${collection.name} ${isPinned ? "is now pinned for one-click continuity reopening" : "was removed from pinned continuity collections"}.`,
            "Logged"
          )
        });
      },
      togglePinnedContinuityInsightPair(primaryReportId, comparisonReportId = "") {
        const current = get();
        const nextPair = buildPinnedContinuityInsightPairRecord(current, primaryReportId, comparisonReportId);
        if (!nextPair) return;
        const signature = `${nextPair.primaryReportId}::${nextPair.comparisonReportId || ""}`;
        const existingPairs = current.pinnedContinuityInsightPairs || [];
        const alreadyPinned = existingPairs.some(
          (pair) => `${pair.primaryReportId}::${pair.comparisonReportId || ""}` === signature
        );
        const nextPairs = alreadyPinned
          ? existingPairs.filter((pair) => `${pair.primaryReportId}::${pair.comparisonReportId || ""}` !== signature)
          : [nextPair, ...existingPairs].slice(0, 8);

        set({
          pinnedContinuityInsightPairs: normalizePinnedContinuityInsightPairRecords(nextPairs, current),
          recentActions: pushAction(
            current.recentActions,
            alreadyPinned ? "Continuity pair unpinned" : "Continuity pair pinned",
            `${nextPair.label} ${alreadyPinned ? "was removed from pinned continuity comparisons" : "is now pinned for one-click delta reopen"}.`,
            "Logged"
          )
        });
      },
      openPinnedContinuityInsightPair(pairId) {
        const current = get();
        const pair = (current.pinnedContinuityInsightPairs || []).find((item) => item.id === pairId);
        if (!pair) return;
        get().setContinuityInsightComparisonPair(pair.primaryReportId, pair.comparisonReportId, {
          title: "Pinned continuity pair reopened",
          detail: `${pair.label} was reopened from shell favorites for local delta review.`
        });
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
      startHomeBaseWorkflow(workflowKey) {
        const current = get();
        const key = resolveHomeBaseWorkflowKey(workflowKey);
        const stateKey = resolveHomeBaseWorkflowStateKey(key);
        const nextWorkflow = createFreshHomeBaseWorkflowRecord(key);

        set({
          [stateKey]: nextWorkflow,
          recentActions: pushAction(
            current.recentActions,
            `${nextWorkflow.label} workflow started`,
            `${nextWorkflow.label} for ${nextWorkflow.sessionLabel} is now running from Home Base.`,
            "Logged"
          )
        });
      },
      toggleHomeBaseWorkflowItem(workflowKey, itemId) {
        const current = get();
        const key = resolveHomeBaseWorkflowKey(workflowKey);
        const stateKey = resolveHomeBaseWorkflowStateKey(key);
        const config = resolveHomeBaseWorkflowConfig(key);
        const previousWorkflow = buildHomeBaseWorkflowRecord(key, current[stateKey] || {});
        const now = new Date().toISOString();
        const nextItems = previousWorkflow.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                checked: !item.checked,
                checkedAt: !item.checked ? now : "",
                updatedAt: now
              }
            : item
        );
        const completedCount = nextItems.filter((item) => item.checked).length;
        const nextStatus =
          completedCount >= nextItems.length && nextItems.length
            ? config.completeStatus
            : completedCount > 0 || previousWorkflow.statusCapture.trim()
              ? config.inProgressStatus
              : config.defaultStatus;
        const nextWorkflow = buildHomeBaseWorkflowRecord(key, {
          ...previousWorkflow,
          items: nextItems,
          status: nextStatus,
          startedAt: previousWorkflow.startedAt || now,
          lastUpdatedAt: now,
          completedAt:
            completedCount >= nextItems.length && nextItems.length
              ? previousWorkflow.completedAt || now
              : ""
        });

        set({
          [stateKey]: nextWorkflow
        });
      },
      setHomeBaseWorkflowStatus(workflowKey, status) {
        const current = get();
        const key = resolveHomeBaseWorkflowKey(workflowKey);
        const stateKey = resolveHomeBaseWorkflowStateKey(key);
        const config = resolveHomeBaseWorkflowConfig(key);
        if (!config.statuses.includes(status)) return;

        const previousWorkflow = buildHomeBaseWorkflowRecord(key, current[stateKey] || {});
        const now = new Date().toISOString();
        const nextWorkflow = buildHomeBaseWorkflowRecord(key, {
          ...previousWorkflow,
          status,
          startedAt: previousWorkflow.startedAt || now,
          lastUpdatedAt: now,
          completedAt: status === config.completeStatus ? previousWorkflow.completedAt || now : ""
        });

        set({
          [stateKey]: nextWorkflow,
          recentActions: pushAction(
            current.recentActions,
            `${nextWorkflow.label} status updated`,
            `${nextWorkflow.label} is now ${status.toLowerCase()} from Home Base.`,
            "Logged"
          )
        });
      },
      setHomeBaseWorkflowCapture(workflowKey, statusCapture) {
        const current = get();
        const key = resolveHomeBaseWorkflowKey(workflowKey);
        const stateKey = resolveHomeBaseWorkflowStateKey(key);
        const config = resolveHomeBaseWorkflowConfig(key);
        const previousWorkflow = buildHomeBaseWorkflowRecord(key, current[stateKey] || {});
        const now = new Date().toISOString();
        const captureText = String(statusCapture || "").slice(0, 1200);
        const nextWorkflow = buildHomeBaseWorkflowRecord(key, {
          ...previousWorkflow,
          statusCapture: captureText,
          status:
            previousWorkflow.status === config.defaultStatus && captureText.trim()
              ? config.inProgressStatus
              : previousWorkflow.status,
          startedAt: previousWorkflow.startedAt || now,
          lastUpdatedAt: now
        });

        set({
          [stateKey]: nextWorkflow
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
          promotedContinuityInsightCheckpoints: current.promotedContinuityInsightCheckpoints,
          replayReviewMarks: current.replayReviewMarks,
          replayQueues: current.replayQueues,
          activeReplayQueueId: current.activeReplayQueueId,
          queueDriftBaselines: current.queueDriftBaselines,
          handoffNotes: current.handoffNotes,
          pinnedReviewSnapshotIds: current.pinnedReviewSnapshotIds,
          pinnedReplayQueueIds: current.pinnedReplayQueueIds,
          pinnedHandoffNoteIds: current.pinnedHandoffNoteIds,
          pinnedContinuityInsightReportIds: current.pinnedContinuityInsightReportIds,
          pinnedContinuityInsightCollectionIds: current.pinnedContinuityInsightCollectionIds,
          pinnedContinuityInsightPairs: current.pinnedContinuityInsightPairs,
          continuityAlertHistory: current.continuityAlertHistory,
          homeBaseDayOpenWorkflow: current.homeBaseDayOpenWorkflow,
          homeBaseDayCloseWorkflow: current.homeBaseDayCloseWorkflow,
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
          promotedContinuityInsightCheckpoints: current.promotedContinuityInsightCheckpoints,
          replayReviewMarks: current.replayReviewMarks,
          replayQueues: current.replayQueues,
          activeReplayQueueId: current.activeReplayQueueId,
          queueDriftBaselines: current.queueDriftBaselines,
          handoffNotes: current.handoffNotes,
          pinnedReviewSnapshotIds: current.pinnedReviewSnapshotIds,
          pinnedReplayQueueIds: current.pinnedReplayQueueIds,
          pinnedHandoffNoteIds: current.pinnedHandoffNoteIds,
          pinnedContinuityInsightReportIds: current.pinnedContinuityInsightReportIds,
          pinnedContinuityInsightCollectionIds: current.pinnedContinuityInsightCollectionIds,
          pinnedContinuityInsightPairs: current.pinnedContinuityInsightPairs,
          continuityAlertHistory: current.continuityAlertHistory,
          homeBaseDayOpenWorkflow: current.homeBaseDayOpenWorkflow,
          homeBaseDayCloseWorkflow: current.homeBaseDayCloseWorkflow,
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
        promotedContinuityInsightCheckpoints: state.promotedContinuityInsightCheckpoints,
        replayReviewMarks: state.replayReviewMarks,
        replayQueues: state.replayQueues,
        activeReplayQueueId: state.activeReplayQueueId,
        queueDriftBaselines: state.queueDriftBaselines,
        handoffNotes: state.handoffNotes,
        pinnedReviewSnapshotIds: state.pinnedReviewSnapshotIds,
        pinnedReplayQueueIds: state.pinnedReplayQueueIds,
        pinnedHandoffNoteIds: state.pinnedHandoffNoteIds,
        pinnedContinuityInsightReportIds: state.pinnedContinuityInsightReportIds,
        pinnedContinuityInsightCollectionIds: state.pinnedContinuityInsightCollectionIds,
        pinnedContinuityInsightPairs: state.pinnedContinuityInsightPairs,
        continuityAlertHistory: state.continuityAlertHistory,
        homeBaseDayOpenWorkflow: state.homeBaseDayOpenWorkflow,
        homeBaseDayCloseWorkflow: state.homeBaseDayCloseWorkflow,
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
