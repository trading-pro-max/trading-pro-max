"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProductInfinityBrief } from "./ProductInfinityBrief";
import { ProductPill } from "./ProductShell";
import {
  bodyTextStyle,
  fieldStyle,
  moduleHeroStyle,
  moduleInsetStyle,
  modulePanelStyle,
  monoValueStyle,
  sectionLabelStyle
} from "./product-module-style";
import {
  downloadJson,
  exportContinuityInsightCollectionPack,
  exportContinuityInsightReport,
  normalizeContinuityInsightCollectionPackPayload,
  sanitizeFilename
} from "./product-local-files";
import { createPillStyle, deskTheme } from "./product-theme";
import { normalizeSessionIntent, normalizeWatchlistTags, summarizeWatchlistContext } from "./product-watchlists";
import { useProductTradingStore } from "./product-trading-store";

function selectOptions(savedWatchlists = []) {
  const tags = new Set();
  const intents = new Set();
  savedWatchlists.forEach((watchlist) => {
    normalizeWatchlistTags(watchlist.sessionTags).forEach((tag) => tags.add(tag));
    const intent = normalizeSessionIntent(watchlist.sessionIntent);
    if (intent) intents.add(intent);
  });

  return {
    watchlists: [
      { id: "all", label: "All Market Sets" },
      { id: "active", label: "Active Market Set" },
      ...savedWatchlists.map((watchlist) => ({ id: watchlist.id, label: watchlist.name }))
    ],
    tags: ["All Tags", ...Array.from(tags)],
    intents: ["All Intents", ...Array.from(intents)]
  };
}

function resolveScope(savedWatchlists = [], activeWatchlist, filterWatchlistId, filterTag, filterIntent) {
  let scoped =
    filterWatchlistId === "all"
      ? savedWatchlists
      : filterWatchlistId === "active"
        ? activeWatchlist
          ? [activeWatchlist]
          : []
        : savedWatchlists.filter((watchlist) => watchlist.id === filterWatchlistId);

  if (filterTag !== "All Tags") {
    scoped = scoped.filter((watchlist) => normalizeWatchlistTags(watchlist.sessionTags).includes(filterTag));
  }
  if (filterIntent !== "All Intents") {
    scoped = scoped.filter((watchlist) => normalizeSessionIntent(watchlist.sessionIntent) === filterIntent);
  }

  return {
    watchlists: scoped,
    ids: new Set(scoped.map((watchlist) => watchlist.id)),
    symbols: new Set(scoped.flatMap((watchlist) => watchlist.symbols || [])),
    summary:
      filterWatchlistId === "all"
        ? `${filterTag === "All Tags" ? "All market sets" : `Tag ${filterTag}`}${filterIntent === "All Intents" ? "" : ` | Intent ${filterIntent}`}`
        : filterWatchlistId === "active"
          ? activeWatchlist?.name || "No active market set"
          : scoped[0]?.name || "Filtered market set"
  };
}

function filterRecords(records = [], scope, filterWatchlistId, filterTag, filterIntent, symbolAccessor) {
  if (filterWatchlistId === "all" && filterTag === "All Tags" && filterIntent === "All Intents") return records;
  if (!scope.watchlists.length) return [];

  return records.filter((record) => {
    const symbol = symbolAccessor(record);
    const recordTags = normalizeWatchlistTags(record.sessionTags);
    const recordIntent = normalizeSessionIntent(record.sessionIntent);
    const tagMatch = filterTag === "All Tags" ? true : recordTags.includes(filterTag);
    const intentMatch = filterIntent === "All Intents" ? true : recordIntent ? recordIntent === filterIntent : scope.watchlists.some((watchlist) => normalizeSessionIntent(watchlist.sessionIntent) === filterIntent);
    const watchlistMatch = record.watchlistId ? scope.ids.has(record.watchlistId) : false;
    const symbolMatch = symbol ? scope.symbols.has(symbol) : false;

    return tagMatch && intentMatch && (watchlistMatch || symbolMatch);
  });
}

function annotationPills(record, watchlistLookup, activeWatchlist, chartOverlayModel, protectionState, selectedSymbol, selectedRoute) {
  const watchlist = watchlistLookup.get(record.watchlistId || "") || activeWatchlist || null;
  const annotations = [];
  if (watchlist?.name) annotations.push({ label: watchlist.name, tone: "info" });
  if (watchlist?.sessionIntent) annotations.push({ label: `Intent ${watchlist.sessionIntent}`, tone: "warning" });
  if (watchlist?.preset?.preferredTimeframe) annotations.push({ label: `TF ${watchlist.preset.preferredTimeframe}`, tone: "neutral" });
  if (watchlist?.preset?.preferredRoute) annotations.push({ label: `Preset ${watchlist.preset.preferredRoute}`, tone: "neutral" });
  if (record.symbol === selectedSymbol) annotations.push({ label: "Active Symbol", tone: "success" });
  if (chartOverlayModel?.summaries?.[0]?.value) annotations.push({ label: chartOverlayModel.summaries[0].value, tone: chartOverlayModel.summaries[0].tone || "info" });
  if (protectionState) annotations.push({ label: `Protection ${protectionState}`, tone: protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "success" });
  if (selectedRoute?.name) annotations.push({ label: `Route ${selectedRoute.name}`, tone: "neutral" });
  return annotations.slice(0, 6);
}

function exportButtonStyle(tone = "info") {
  const tones = {
    info: {
      background: "linear-gradient(180deg, rgba(56, 189, 248, 0.98) 0%, rgba(2, 132, 199, 0.96) 100%)",
      color: "#03111b",
      shadow: "0 18px 42px rgba(56, 189, 248, 0.2)"
    },
    success: {
      background: "linear-gradient(180deg, rgba(34, 197, 94, 0.98) 0%, rgba(21, 128, 61, 0.96) 100%)",
      color: "#04130a",
      shadow: "0 20px 46px rgba(34, 197, 94, 0.24)"
    },
    neutral: {
      background: "linear-gradient(180deg, rgba(71, 85, 105, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%)",
      color: deskTheme.colors.text,
      shadow: "0 18px 42px rgba(15, 23, 42, 0.22)"
    }
  };
  const palette = tones[tone] || tones.info;

  return {
    cursor: "pointer",
    border: 0,
    background: palette.background,
    color: palette.color,
    padding: "12px 14px",
    borderRadius: deskTheme.radii.md,
    fontWeight: 900,
    boxShadow: palette.shadow
  };
}

function saveNoteButtonStyle() {
  return {
    cursor: "pointer",
    border: 0,
    background: "linear-gradient(180deg, rgba(34, 197, 94, 0.98) 0%, rgba(21, 128, 61, 0.96) 100%)",
    color: "#04130a",
    padding: "14px 18px",
    borderRadius: deskTheme.radii.md,
    fontWeight: 900,
    alignSelf: "start",
    boxShadow: "0 20px 46px rgba(34, 197, 94, 0.24)"
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countByStatus(records = [], statuses = []) {
  const allowed = new Set(statuses);
  return records.filter((record) => allowed.has(record.status)).length;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreMeta(score) {
  if (score >= 85) return { tone: "success", label: "Healthy" };
  if (score >= 70) return { tone: "info", label: "Stable" };
  if (score >= 55) return { tone: "warning", label: "Mixed" };
  return { tone: "danger", label: "Needs Review" };
}

function buildReplayScoringSummary({
  notes = [],
  actions = [],
  orders = [],
  events = [],
  alerts = [],
  activeWatchlist,
  selectedRoute,
  protectionState
}) {
  const completedOrders = countByStatus(orders, ["Filled", "Closed"]);
  const rejectedOrders = countByStatus(orders, ["Rejected"]) + countByStatus(events, ["Rejected"]);
  const partialOrders = countByStatus(events, ["Partially Filled"]);
  const protectedOrders = orders.filter((order) => order.stop && order.stop !== "--").length;
  const routeTarget = String(activeWatchlist?.preset?.preferredRoute || selectedRoute?.name || "").trim();
  const routeMatches = routeTarget
    ? orders.filter((order) => String(order.route || "").trim() === routeTarget).length
    : orders.length;
  const criticalAlerts = alerts.filter((alert) => (alert.severity || "").toLowerCase() === "critical").length;
  const protectionFlags = alerts.filter((alert) =>
    /protect|lock|risk/i.test(`${alert.label || ""} ${alert.reason || ""} ${alert.recommendedAction || ""}`)
  ).length;
  const consistencyPool = [...notes, ...actions, ...orders, ...events];
  const dominantIntent = activeWatchlist?.sessionIntent
    ? normalizeSessionIntent(activeWatchlist.sessionIntent)
    : normalizeSessionIntent(consistencyPool.map((record) => record.sessionIntent).find(Boolean));
  const intentMatches = dominantIntent
    ? consistencyPool.filter((record) => normalizeSessionIntent(record.sessionIntent) === dominantIntent).length
    : consistencyPool.length;
  const watchlistMatches = activeWatchlist?.id
    ? consistencyPool.filter((record) => record.watchlistId === activeWatchlist.id).length
    : consistencyPool.length;

  const totalOrders = Math.max(orders.length, 1);
  const totalConsistency = Math.max(consistencyPool.length, 1);

  const paperOrderQuality = clampScore(48 + (completedOrders / totalOrders) * 42 - rejectedOrders * 10 - partialOrders * 4);
  const protectionAdherence = clampScore(
    52 + (protectedOrders / totalOrders) * 28 - criticalAlerts * 10 - protectionFlags * 5 + (protectionState === "Locked" ? 6 : 0)
  );
  const routeDiscipline = clampScore(45 + (routeMatches / totalOrders) * 46 - rejectedOrders * 6);
  const sessionConsistency = clampScore(
    44 + (intentMatches / totalConsistency) * 28 + (watchlistMatches / totalConsistency) * 28 - criticalAlerts * 4
  );

  return [
    {
      key: "paper-order-quality",
      label: "Paper Order Quality",
      score: paperOrderQuality,
      detail: `${completedOrders} completed, ${partialOrders} partial, and ${rejectedOrders} reject-linked outcomes across ${orders.length || 0} paper orders.`,
      ...scoreMeta(paperOrderQuality)
    },
    {
      key: "protection-adherence",
      label: "Protection Adherence",
      score: protectionAdherence,
      detail: `${protectedOrders} protected orders, ${criticalAlerts} critical alerts, and ${protectionFlags} protection-linked warnings in scope.`,
      ...scoreMeta(protectionAdherence)
    },
    {
      key: "route-discipline",
      label: "Route Discipline",
      score: routeDiscipline,
      detail: `${routeMatches} orders matched ${routeTarget || "the current route focus"} with ${rejectedOrders} reject-linked interruptions.`,
      ...scoreMeta(routeDiscipline)
    },
    {
      key: "session-consistency",
      label: "Session Consistency",
      score: sessionConsistency,
      detail: `${intentMatches} replay records aligned with ${dominantIntent || "the dominant session intent"} and ${watchlistMatches} aligned with the active market-set context.`,
      ...scoreMeta(sessionConsistency)
    }
  ];
}

function normalizeReplayPackPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  return {
    product: String(payload.product || "Trading Pro Max"),
    kind: String(payload.kind || "journal-export-pack"),
    exportedAt: String(payload.exportedAt || ""),
    scope: {
      watchlistLabel: String(payload.scope?.activeWatchlistName || payload.scope?.summary || "Unknown market set"),
      tag: String(payload.scope?.tag || "All Tags"),
      sessionIntent: String(payload.scope?.sessionIntent || "All Intents"),
      summary: String(payload.scope?.summary || "")
    },
    replay: {
      notes: asArray(payload.replay?.notes),
      actions: asArray(payload.replay?.actions),
      orders: asArray(payload.replay?.orders),
      executionEvents: asArray(payload.replay?.executionEvents),
      alerts: asArray(payload.replay?.alerts)
    }
  };
}

function buildPackOutcomeSummary(pack) {
  if (!pack) return null;

  const orders = pack.replay.orders;
  const executionEvents = pack.replay.executionEvents;
  const alerts = pack.replay.alerts;
  const completed = countByStatus(orders, ["Filled", "Closed"]);
  const rejected = countByStatus(orders, ["Rejected"]) + countByStatus(executionEvents, ["Rejected"]);
  const partial = countByStatus(executionEvents, ["Partially Filled"]);
  const criticalAlerts = alerts.filter((alert) => (alert.severity || "").toLowerCase() === "critical").length;

  return {
    orderCount: orders.length,
    completed,
    rejected,
    partial,
    noteCount: pack.replay.notes.length,
    actionCount: pack.replay.actions.length,
    alertCount: alerts.length,
    criticalAlerts,
    replayScore: clampScore(52 + completed * 6 - rejected * 8 - criticalAlerts * 7 - partial * 3)
  };
}

function compareMetric(label, baseline, comparison, options = {}) {
  const delta = comparison - baseline;
  const preferLower = Boolean(options.preferLower);
  const improved = preferLower ? delta < 0 : delta > 0;
  const unchanged = delta === 0;

  return {
    label,
    baseline,
    comparison,
    tone: unchanged ? "neutral" : improved ? "success" : "warning",
    summary: unchanged ? "No change" : `${delta > 0 ? "+" : ""}${delta} vs baseline`
  };
}

function buildReviewSnapshot(baselinePack, comparisonPack) {
  if (!baselinePack || !comparisonPack) return null;

  const baseline = buildPackOutcomeSummary(baselinePack);
  const comparison = buildPackOutcomeSummary(comparisonPack);
  if (!baseline || !comparison) return null;

  return {
    scopeRows: [
      {
        label: "Market Set",
        baseline: baselinePack.scope.watchlistLabel,
        comparison: comparisonPack.scope.watchlistLabel,
        changed: baselinePack.scope.watchlistLabel !== comparisonPack.scope.watchlistLabel
      },
      {
        label: "Tag",
        baseline: baselinePack.scope.tag,
        comparison: comparisonPack.scope.tag,
        changed: baselinePack.scope.tag !== comparisonPack.scope.tag
      },
      {
        label: "Session Intent",
        baseline: baselinePack.scope.sessionIntent,
        comparison: comparisonPack.scope.sessionIntent,
        changed: baselinePack.scope.sessionIntent !== comparisonPack.scope.sessionIntent
      }
    ],
    metrics: [
      compareMetric("Orders", baseline.orderCount, comparison.orderCount),
      compareMetric("Completed", baseline.completed, comparison.completed),
      compareMetric("Rejected", baseline.rejected, comparison.rejected, { preferLower: true }),
      compareMetric("Critical Alerts", baseline.criticalAlerts, comparison.criticalAlerts, { preferLower: true }),
      compareMetric("Replay Score", baseline.replayScore, comparison.replayScore)
    ]
  };
}

const replayVerdictOptions = ["strong", "weak", "disciplined", "risky", "review-again"];

function buildReplayMarkKey(recordType, record = {}) {
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

function formatVerdictLabel(verdict) {
  return String(verdict || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reviewToggleStyle(active = false, tone = "neutral") {
  return {
    cursor: "pointer",
    borderRadius: deskTheme.radii.md,
    border: `1px solid ${active ? deskTheme.colors.lineStrong : deskTheme.colors.line}`,
    background:
      tone === "success"
        ? active
          ? "rgba(34, 197, 94, 0.18)"
          : "rgba(15, 23, 42, 0.86)"
        : tone === "warning"
          ? active
            ? "rgba(245, 158, 11, 0.18)"
            : "rgba(15, 23, 42, 0.86)"
          : tone === "danger"
            ? active
              ? "rgba(248, 113, 113, 0.18)"
              : "rgba(15, 23, 42, 0.86)"
            : active
              ? "rgba(56, 189, 248, 0.18)"
              : "rgba(15, 23, 42, 0.86)",
    color: deskTheme.colors.text,
    padding: "7px 10px",
    fontWeight: 800,
    fontSize: 11
  };
}

function deriveQueueItems(queue, replayReviewMarks = {}) {
  if (!queue) return [];
  return (queue.itemKeys || []).map((key) => replayReviewMarks?.[key]).filter(Boolean);
}

function deriveQueueVerdicts(queueItems = []) {
  return Array.from(
    new Set(
      queueItems.flatMap((item) => item.verdicts || [])
    )
  );
}

function dominantAlignment(values = []) {
  if (!values.length) return 1;
  const counts = values.reduce((accumulator, value) => {
    const key = String(value || "").trim();
    if (!key) return accumulator;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const peak = Object.values(counts).reduce((highest, count) => Math.max(highest, Number(count) || 0), 0);

  return peak ? peak / values.length : 1;
}

function buildQueueScoringRollup(queue, queueItems = []) {
  if (!queue) return null;

  const itemCount = Math.max(queueItems.length, 1);
  const verdictCounts = queueItems.reduce((accumulator, item) => {
    (item.verdicts || []).forEach((verdict) => {
      accumulator[verdict] = (accumulator[verdict] || 0) + 1;
    });
    return accumulator;
  }, {});
  const statuses = queueItems.map((item) => String(item.status || "").toLowerCase());
  const routedItems = queueItems.map((item) => String(item.route || "").trim()).filter(Boolean);
  const intents = queueItems.map((item) => normalizeSessionIntent(item.sessionIntent)).filter(Boolean);
  const watchlistIds = queueItems.map((item) => String(item.watchlistId || "").trim()).filter(Boolean);
  const riskyCount = verdictCounts.risky || 0;
  const disciplinedCount = verdictCounts.disciplined || 0;
  const strongCount = verdictCounts.strong || 0;
  const weakCount = verdictCounts.weak || 0;
  const reviewAgainCount = verdictCounts["review-again"] || 0;
  const protectedCount = statuses.filter((status) => /protect|closed|filled/.test(status)).length;
  const rejectedCount = statuses.filter((status) => /reject|critical/.test(status)).length;
  const routeAlignment = dominantAlignment(routedItems);
  const intentAlignment = dominantAlignment(intents);
  const watchlistAlignment = dominantAlignment(watchlistIds);

  const discipline = clampScore(52 + disciplinedCount * 12 + strongCount * 6 - riskyCount * 11 - weakCount * 7 - reviewAgainCount * 5);
  const riskPosture = clampScore(55 + protectedCount * 8 - riskyCount * 10 - rejectedCount * 10);
  const replayOutcomeQuality = clampScore(50 + strongCount * 10 - weakCount * 9 - rejectedCount * 8 - reviewAgainCount * 6);
  const consistency = clampScore(42 + routeAlignment * 22 + intentAlignment * 18 + watchlistAlignment * 18 - reviewAgainCount * 4);
  const overall = clampScore((discipline + riskPosture + replayOutcomeQuality + consistency) / 4);

  return {
    queueId: queue.id,
    queueName: queue.name,
    itemCount,
    overall,
    tone: scoreMeta(overall).tone,
    state: scoreMeta(overall).label,
    summary: `${queueItems.length} replay items | ${strongCount} strong | ${riskyCount} risky | ${rejectedCount} reject-linked`,
    metrics: [
      { key: "discipline", label: "Discipline", score: discipline, tone: scoreMeta(discipline).tone },
      { key: "risk-posture", label: "Risk Posture", score: riskPosture, tone: scoreMeta(riskPosture).tone },
      { key: "outcome-quality", label: "Outcome Quality", score: replayOutcomeQuality, tone: scoreMeta(replayOutcomeQuality).tone },
      { key: "consistency", label: "Consistency", score: consistency, tone: scoreMeta(consistency).tone }
    ]
  };
}

function buildHandoffExportBundle(note, context) {
  if (!note) return null;

  const snapshot = (context.reviewSnapshots || []).find((item) => item.id === note.snapshotId) || null;
  const replayQueue = (context.replayQueues || []).find((item) => item.id === note.replayQueueId) || null;
  const replayQueueItems = deriveQueueItems(replayQueue, context.replayReviewMarks);
  const queueRollup = buildQueueScoringRollup(replayQueue, replayQueueItems);

  return {
    product: "Trading Pro Max",
    kind: "handoff-export-bundle",
    version: "local-handoff-bundle-v1",
    exportedAt: new Date().toISOString(),
    handoffNote: note,
    sessionIntent: note.sessionIntent || "",
    replayVerdictTags: note.verdicts || [],
    savedSnapshot: snapshot,
    replayQueue: replayQueue
      ? {
          ...replayQueue,
          items: replayQueueItems,
          scoreRollup: queueRollup
        }
      : null,
    context: {
      selectedSymbol: context.selectedSymbol || "",
      selectedRoute: context.selectedRoute?.name || "",
      protectionState: context.protectionState || "",
      activeWatchlistName: context.activeWatchlist?.name || "",
      activeWatchlistContext: context.activeContext,
      chartOverlaySummaries: context.chartOverlayModel?.summaries || []
    }
  };
}

function normalizeHandoffBundlePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (String(payload.kind || "") !== "handoff-export-bundle") return null;

  return {
    product: String(payload.product || "Trading Pro Max"),
    kind: "handoff-export-bundle",
    version: String(payload.version || "local-handoff-bundle-v1"),
    exportedAt: String(payload.exportedAt || ""),
    handoffNote: payload.handoffNote && typeof payload.handoffNote === "object" ? payload.handoffNote : {},
    replayVerdictTags: asArray(payload.replayVerdictTags),
    sessionIntent: String(payload.sessionIntent || ""),
    savedSnapshot: payload.savedSnapshot && typeof payload.savedSnapshot === "object" ? payload.savedSnapshot : null,
    replayQueue: payload.replayQueue && typeof payload.replayQueue === "object" ? payload.replayQueue : null,
    context: payload.context && typeof payload.context === "object" ? payload.context : {}
  };
}

function buildVerdictPatternRows(primaryItems = [], comparisonItems = []) {
  const countVerdicts = (items, verdict) =>
    items.reduce((total, item) => total + ((item.verdicts || []).includes(verdict) ? 1 : 0), 0);

  return replayVerdictOptions.map((verdict) => {
    const primary = countVerdicts(primaryItems, verdict);
    const comparison = countVerdicts(comparisonItems, verdict);
    const delta = primary - comparison;

    return {
      key: verdict,
      label: formatVerdictLabel(verdict),
      primary,
      comparison,
      tone: delta === 0 ? "neutral" : delta > 0 ? (verdict === "strong" || verdict === "disciplined" ? "success" : "warning") : verdict === "risky" || verdict === "review-again" ? "success" : "warning",
      summary: delta === 0 ? "No shift" : `${delta > 0 ? "+" : ""}${delta} vs comparison`
    };
  });
}

function buildQueueDrilldown(primaryRollup, comparisonRollup, primaryItems = [], comparisonItems = []) {
  if (!primaryRollup) return null;

  return {
    primary: primaryRollup,
    comparison: comparisonRollup,
    metricShifts: primaryRollup.metrics.map((metric) => {
      const comparisonMetric = comparisonRollup?.metrics?.find((item) => item.key === metric.key);
      const comparisonScore = comparisonMetric?.score ?? metric.score;
      const delta = metric.score - comparisonScore;
      return {
        key: metric.key,
        label: metric.label,
        primary: metric.score,
        comparison: comparisonScore,
        tone: delta === 0 ? "neutral" : delta > 0 ? "success" : "warning",
        summary: delta === 0 ? "No shift" : `${delta > 0 ? "+" : ""}${delta} vs comparison`
      };
    }),
    verdictPatterns: buildVerdictPatternRows(primaryItems, comparisonItems),
    overallShift: comparisonRollup ? primaryRollup.overall - comparisonRollup.overall : 0
  };
}

function joinReadable(values = [], emptyLabel = "None") {
  const normalized = Array.from(
    new Set(
      asArray(values)
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  return normalized.length ? normalized.join(", ") : emptyLabel;
}

function buildHandoffPreviewRows(bundle, current) {
  if (!bundle) return [];

  const importedVerdicts = asArray(bundle.replayVerdictTags || bundle.handoffNote?.verdicts || []);
  const currentVerdicts = asArray(current.activeReplayQueueVerdicts || []);
  const currentSnapshotLabel = current.activeReviewSnapshot?.name || "No active snapshot";
  const importedSnapshotLabel = bundle.savedSnapshot?.name || bundle.savedSnapshot?.summary || "No snapshot in packet";
  const currentQueueLabel = current.activeReplayQueue?.name || "No active queue";
  const importedQueueLabel = bundle.replayQueue?.name || "No replay queue in packet";
  const currentIntent = current.activeWatchlist?.sessionIntent || "No session intent";
  const importedIntent = bundle.sessionIntent || bundle.handoffNote?.sessionIntent || "No session intent";
  const currentSymbol = current.selectedSymbol || "No symbol";
  const importedSymbol = bundle.context?.selectedSymbol || bundle.handoffNote?.selectedSymbol || "No symbol";
  const currentRoute = current.selectedRoute?.name || "No route";
  const importedRoute = bundle.context?.selectedRoute || bundle.handoffNote?.selectedRoute || "No route";

  return [
    {
      key: "snapshot",
      label: "Snapshot Context",
      current: currentSnapshotLabel,
      imported: importedSnapshotLabel,
      changed: currentSnapshotLabel !== importedSnapshotLabel
    },
    {
      key: "queue",
      label: "Replay Queue",
      current: currentQueueLabel,
      imported: `${importedQueueLabel}${bundle.replayQueue?.items?.length ? ` | ${bundle.replayQueue.items.length} items` : ""}`,
      changed: currentQueueLabel !== importedQueueLabel
    },
    {
      key: "verdicts",
      label: "Verdict Tags",
      current: joinReadable(currentVerdicts, "No active verdict tags"),
      imported: joinReadable(importedVerdicts, "No packet verdict tags"),
      changed: joinReadable(currentVerdicts, "") !== joinReadable(importedVerdicts, "")
    },
    {
      key: "symbol",
      label: "Symbol Context",
      current: currentSymbol,
      imported: importedSymbol,
      changed: currentSymbol !== importedSymbol
    },
    {
      key: "route",
      label: "Route Context",
      current: currentRoute,
      imported: importedRoute,
      changed: currentRoute !== importedRoute
    },
    {
      key: "intent",
      label: "Session Intent",
      current: currentIntent,
      imported: importedIntent,
      changed: currentIntent !== importedIntent
    }
  ];
}

function buildSymbolPerformanceMap(items = []) {
  return items.reduce((accumulator, item) => {
    const symbol = String(item.symbol || "").trim() || "No Symbol";
    const current = accumulator[symbol] || {
      symbol,
      itemCount: 0,
      strong: 0,
      weak: 0,
      disciplined: 0,
      risky: 0,
      reviewAgain: 0,
      protected: 0,
      rejected: 0,
      routes: new Set(),
      statuses: new Set()
    };

    current.itemCount += 1;
    (item.verdicts || []).forEach((verdict) => {
      if (verdict === "strong") current.strong += 1;
      if (verdict === "weak") current.weak += 1;
      if (verdict === "disciplined") current.disciplined += 1;
      if (verdict === "risky") current.risky += 1;
      if (verdict === "review-again") current.reviewAgain += 1;
    });

    const status = String(item.status || "").toLowerCase();
    if (/protect|closed|filled/.test(status)) current.protected += 1;
    if (/reject|critical/.test(status)) current.rejected += 1;
    if (item.route) current.routes.add(String(item.route));
    if (item.status) current.statuses.add(String(item.status));
    accumulator[symbol] = current;
    return accumulator;
  }, {});
}

function finalizeSymbolPerformanceRows(primaryItems = [], comparisonItems = []) {
  const primaryMap = buildSymbolPerformanceMap(primaryItems);
  const comparisonMap = buildSymbolPerformanceMap(comparisonItems);
  const keys = Array.from(new Set([...Object.keys(primaryMap), ...Object.keys(comparisonMap)]));

  return keys
    .map((symbol) => {
      const primary = primaryMap[symbol] || {
        symbol,
        itemCount: 0,
        strong: 0,
        weak: 0,
        disciplined: 0,
        risky: 0,
        reviewAgain: 0,
        protected: 0,
        rejected: 0,
        routes: new Set(),
        statuses: new Set()
      };
      const comparison = comparisonMap[symbol] || {
        symbol,
        itemCount: 0,
        strong: 0,
        weak: 0,
        disciplined: 0,
        risky: 0,
        reviewAgain: 0,
        protected: 0,
        rejected: 0,
        routes: new Set(),
        statuses: new Set()
      };
      const primaryScore = clampScore(50 + primary.strong * 10 + primary.disciplined * 8 - primary.risky * 9 - primary.weak * 7 - primary.reviewAgain * 6 - primary.rejected * 8 + primary.protected * 5);
      const comparisonScore = clampScore(50 + comparison.strong * 10 + comparison.disciplined * 8 - comparison.risky * 9 - comparison.weak * 7 - comparison.reviewAgain * 6 - comparison.rejected * 8 + comparison.protected * 5);
      const delta = primaryScore - comparisonScore;

      return {
        symbol,
        primaryScore,
        comparisonScore,
        delta,
        tone: delta === 0 ? "neutral" : delta > 0 ? "success" : "warning",
        verdictPattern: `${primary.strong} strong | ${primary.disciplined} disciplined | ${primary.risky} risky | ${primary.weak} weak`,
        riskContext:
          primary.protected > 0
            ? `${primary.protected} protection-linked`
            : primary.rejected > 0
              ? `${primary.rejected} reject-linked`
              : primary.risky > 0
                ? `${primary.risky} risky tags`
                : "No elevated risk markers",
        routeContext: joinReadable(Array.from(primary.routes), "No route context"),
        statusContext: joinReadable(Array.from(primary.statuses), "No status context"),
        itemCount: primary.itemCount
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || right.primaryScore - left.primaryScore)
    .slice(0, 8);
}

function buildQueueClusterSummary(items = [], kind) {
  if (!items.length) return [];

  if (kind === "watchlist") {
    const groups = items.reduce((accumulator, item) => {
      const key = String(item.watchlistName || item.watchlistId || "Unassigned Market Set").trim();
      const current = accumulator[key] || { key, count: 0, symbols: new Set() };
      current.count += 1;
      if (item.symbol) current.symbols.add(String(item.symbol));
      accumulator[key] = current;
      return accumulator;
    }, {});

    return Object.values(groups)
      .map((group) => ({
        label: group.key,
        detail: `${group.count} items | ${joinReadable(Array.from(group.symbols).slice(0, 4), "No symbols")}`
      }))
      .sort((left, right) => Number.parseInt(right.detail, 10) - Number.parseInt(left.detail, 10))
      .slice(0, 4);
  }

  if (kind === "intent") {
    const groups = items.reduce((accumulator, item) => {
      const key = normalizeSessionIntent(item.sessionIntent) || "No intent";
      const current = accumulator[key] || { key, count: 0, symbols: new Set() };
      current.count += 1;
      if (item.symbol) current.symbols.add(String(item.symbol));
      accumulator[key] = current;
      return accumulator;
    }, {});

    return Object.values(groups)
      .map((group) => ({
        label: group.key,
        detail: `${group.count} items | ${joinReadable(Array.from(group.symbols).slice(0, 4), "No symbols")}`
      }))
      .sort((left, right) => Number.parseInt(right.detail, 10) - Number.parseInt(left.detail, 10))
      .slice(0, 4);
  }

  const symbolRows = finalizeSymbolPerformanceRows(items, []);
  const buckets = {
    "High Quality": [],
    "Mixed Quality": [],
    "Needs Review": []
  };

  symbolRows.forEach((row) => {
    if (row.primaryScore >= 80) {
      buckets["High Quality"].push(row.symbol);
    } else if (row.primaryScore >= 60) {
      buckets["Mixed Quality"].push(row.symbol);
    } else {
      buckets["Needs Review"].push(row.symbol);
    }
  });

  return Object.entries(buckets)
    .filter(([, symbols]) => symbols.length)
    .map(([label, symbols]) => ({
      label,
      detail: joinReadable(symbols.slice(0, 5), "No symbols")
    }))
    .slice(0, 3);
}

function formatTimelineTimestamp(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "Local session";
  return parsed.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildContinuityTimelineRows({
  handoffNotes = [],
  reviewSnapshots = [],
  replayQueues = [],
  continuityAlertHistory = [],
  replayReviewMarks = {},
  activeReviewSnapshotId = "",
  activeReplayQueueId = "",
  pinnedReviewSnapshotIds = [],
  pinnedReplayQueueIds = [],
  pinnedHandoffNoteIds = []
}) {
  const rows = [
    ...continuityAlertHistory.map((alert, index) => ({
      key: `continuity-alert-${alert.id}`,
      type: "Continuity Alert",
      label: alert.severity || "Continuity Alert",
      timestamp: alert.updatedAt || alert.createdAt,
      tone: alert.tone || "warning",
      state: index === 0 ? "Latest Alert" : "Recorded",
      detail: alert.reason || "Continuity drift detected.",
      context: `${alert.snapshotName || "No snapshot"} | ${alert.queueName || "No queue"} | ${alert.symbol || "No symbol"}`,
      watchlistLabels: alert.watchlistName ? [alert.watchlistName] : [],
      sessionIntents: alert.sessionIntent ? [normalizeSessionIntent(alert.sessionIntent)] : [],
      symbols: alert.symbol ? [alert.symbol] : []
    })),
    ...handoffNotes.map((note, index) => ({
      key: `handoff-${note.id}`,
      type: "Handoff Packet",
      label: note.watchlistName || "Local Handoff",
      timestamp: note.createdAt,
      tone: pinnedHandoffNoteIds.includes(note.id) ? "success" : index === 0 ? "info" : "neutral",
      state: pinnedHandoffNoteIds.includes(note.id) ? "Pinned" : index === 0 ? "Latest" : "Saved",
      detail: `${note.snapshotName || "No snapshot"} | ${note.replayQueueName || "No queue"}`,
      context: `${note.sessionIntent || "No intent"} | ${note.selectedSymbol || "No symbol"} | ${note.selectedRoute || "No route"}`,
      watchlistLabels: [note.watchlistName || "Current Market Set"],
      sessionIntents: note.sessionIntent ? [normalizeSessionIntent(note.sessionIntent)] : [],
      symbols: note.selectedSymbol ? [note.selectedSymbol] : []
    })),
    ...reviewSnapshots.map((snapshot) => ({
      ...(function deriveSnapshotMeta() {
        const baselinePack = snapshot.baselinePack || {};
        const comparisonPack = snapshot.comparisonPack || {};
        const watchlistLabels = Array.from(
          new Set(
            [
              baselinePack.scope?.activeWatchlistName,
              comparisonPack.scope?.activeWatchlistName,
              baselinePack.scope?.watchlistLabel,
              comparisonPack.scope?.watchlistLabel
            ]
              .map((item) => String(item || "").trim())
              .filter(Boolean)
          )
        );
        const sessionIntents = Array.from(
          new Set(
            [baselinePack.scope?.sessionIntent, comparisonPack.scope?.sessionIntent]
              .map((item) => normalizeSessionIntent(item))
              .filter(Boolean)
          )
        );
        const symbols = Array.from(
          new Set(
            [baselinePack.runtime?.selectedSymbol, comparisonPack.runtime?.selectedSymbol]
              .map((item) => String(item || "").trim())
              .filter(Boolean)
          )
        );

        return {
          watchlistLabels,
          sessionIntents,
          symbols
        };
      })(),
      key: `snapshot-${snapshot.id}`,
      type: "Snapshot",
      label: snapshot.name,
      timestamp: snapshot.savedAt,
      tone: snapshot.id === activeReviewSnapshotId ? "info" : pinnedReviewSnapshotIds.includes(snapshot.id) ? "warning" : "neutral",
      state: snapshot.id === activeReviewSnapshotId ? "Active" : pinnedReviewSnapshotIds.includes(snapshot.id) ? "Pinned" : "Saved",
      detail: snapshot.summary || "Local comparison baseline",
      context: `${snapshot.baselinePack?.scope?.watchlistLabel || "Baseline"} vs ${snapshot.comparisonPack?.scope?.watchlistLabel || "Comparison"}`
    })),
    ...replayQueues.map((queue) => {
      const queueItems = deriveQueueItems(queue, replayReviewMarks);
      const watchlistLabels = Array.from(
        new Set(
          queueItems
            .map((item) => String(item.watchlistName || item.watchlistId || "").trim())
            .filter(Boolean)
        )
      );
      const sessionIntents = Array.from(
        new Set(
          queueItems
            .map((item) => normalizeSessionIntent(item.sessionIntent))
            .filter(Boolean)
        )
      );
      const symbols = Array.from(
        new Set(
          queueItems
            .map((item) => String(item.symbol || "").trim())
            .filter(Boolean)
        )
      );

      return {
        key: `queue-${queue.id}`,
        type: "Replay Queue",
        label: queue.name,
        timestamp: queue.updatedAt || queue.createdAt,
        tone: queue.id === activeReplayQueueId ? "warning" : pinnedReplayQueueIds.includes(queue.id) ? "info" : "neutral",
        state: queue.id === activeReplayQueueId ? "Active" : pinnedReplayQueueIds.includes(queue.id) ? "Pinned" : "Saved",
        detail: `${queue.itemKeys?.length || 0} replay items | Updated ${formatTimelineTimestamp(queue.updatedAt || queue.createdAt)}`,
        context: `${watchlistLabels[0] || "No market set"} | ${sessionIntents[0] || "No intent"} | ${symbols[0] || "No symbol"}`,
        watchlistLabels,
        sessionIntents,
        symbols
      };
    })
  ];

  return rows
    .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())
    .slice(0, 16);
}

function buildContinuityTimelineOptions(rows = [], activeWatchlist) {
  const watchlists = Array.from(
    new Set(rows.flatMap((row) => row.watchlistLabels || []).filter(Boolean))
  );
  const intents = Array.from(
    new Set(rows.flatMap((row) => row.sessionIntents || []).filter(Boolean))
  );
  const symbols = Array.from(
    new Set(rows.flatMap((row) => row.symbols || []).filter(Boolean))
  );

  return {
    watchlists: ["All Market Sets", activeWatchlist?.name || ""].filter((value, index, array) => value && array.indexOf(value) === index).concat(watchlists.filter((value) => value !== activeWatchlist?.name)),
    intents: ["All Intents", ...intents],
    symbols: ["All Symbols", ...symbols]
  };
}

function filterContinuityTimelineRows(rows = [], activeWatchlist, filterWatchlist, filterIntent, filterSymbol) {
  const activeWatchlistLabel = String(activeWatchlist?.name || "").trim();

  return rows.filter((row) => {
    const watchlistMatch =
      filterWatchlist === "All Market Sets"
        ? true
        : filterWatchlist === activeWatchlistLabel
          ? (row.watchlistLabels || []).includes(activeWatchlistLabel)
          : (row.watchlistLabels || []).includes(filterWatchlist);
    const intentMatch =
      filterIntent === "All Intents" ? true : (row.sessionIntents || []).includes(normalizeSessionIntent(filterIntent));
    const symbolMatch =
      filterSymbol === "All Symbols" ? true : (row.symbols || []).includes(filterSymbol);

    return watchlistMatch && intentMatch && symbolMatch;
  });
}

function buildQueueDriftExportSummary({
  primaryQueue,
  comparisonQueue,
  queueDrilldown,
  queueDriftSummaryRows = [],
  symbolDrilldownRows = [],
  queueClusterSnapshots = [],
  activeWatchlist,
  selectedSymbol,
  selectedRoute,
  protectionState
}) {
  if (!primaryQueue || !queueDrilldown?.primary) return null;

  return {
    product: "Trading Pro Max",
    kind: "queue-drift-summary-pack",
    version: "local-queue-drift-v1",
    exportedAt: new Date().toISOString(),
    context: {
      activeWatchlist: activeWatchlist?.name || "",
      sessionIntent: activeWatchlist?.sessionIntent || "",
      selectedSymbol: selectedSymbol || "",
      selectedRoute: selectedRoute?.name || "",
      protectionState: protectionState || ""
    },
    primaryQueue: {
      id: primaryQueue.id,
      name: primaryQueue.name,
      summary: queueDrilldown.primary.summary,
      overall: queueDrilldown.primary.overall
    },
    comparisonQueue: comparisonQueue
      ? {
          id: comparisonQueue.id,
          name: comparisonQueue.name,
          summary: queueDrilldown.comparison?.summary || "",
          overall: queueDrilldown.comparison?.overall || 0
        }
      : null,
    metricShifts: queueDrilldown.metricShifts || [],
    verdictPatterns: queueDrilldown.verdictPatterns || [],
    driftSummaries: queueDriftSummaryRows,
    symbolDrilldowns: symbolDrilldownRows,
    clusterSnapshots: queueClusterSnapshots
  };
}

function normalizeQueueDriftSummaryPack(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (String(payload.kind || "") !== "queue-drift-summary-pack") return null;

  return {
    product: String(payload.product || "Trading Pro Max"),
    kind: "queue-drift-summary-pack",
    version: String(payload.version || "local-queue-drift-v1"),
    exportedAt: String(payload.exportedAt || ""),
    context: payload.context && typeof payload.context === "object" ? payload.context : {},
    primaryQueue: payload.primaryQueue && typeof payload.primaryQueue === "object" ? payload.primaryQueue : null,
    comparisonQueue: payload.comparisonQueue && typeof payload.comparisonQueue === "object" ? payload.comparisonQueue : null,
    metricShifts: asArray(payload.metricShifts),
    verdictPatterns: asArray(payload.verdictPatterns),
    driftSummaries: asArray(payload.driftSummaries),
    symbolDrilldowns: asArray(payload.symbolDrilldowns),
    clusterSnapshots: asArray(payload.clusterSnapshots)
  };
}

function buildImportedQueueDriftComparisonRows(currentRows = [], importedPack) {
  if (!importedPack) return [];

  const importedMap = new Map(
    asArray(importedPack.driftSummaries).map((item) => [String(item.key || ""), item])
  );

  return currentRows.map((row) => {
    const baseline = importedMap.get(row.key) || null;
    const baselineScore = Number(baseline?.primary ?? row.primary);
    const delta = row.primary - baselineScore;

    return {
      key: row.key,
      label: row.label,
      current: row.primary,
      baseline: baselineScore,
      tone: delta === 0 ? "neutral" : delta > 0 ? "success" : "warning",
      detail: row.detail,
      baselineDetail: baseline?.detail || "No imported baseline detail",
      summary: delta === 0 ? "Aligned with imported baseline" : `${delta > 0 ? "+" : ""}${delta} vs imported baseline`
    };
  });
}

function buildSavedBaselineComparisonRows(primaryBaseline, comparisonBaseline) {
  if (!primaryBaseline?.pack || !comparisonBaseline?.pack) return [];

  const primaryMap = new Map(
    asArray(primaryBaseline.pack.driftSummaries).map((item) => [String(item.key || ""), item])
  );
  const comparisonMap = new Map(
    asArray(comparisonBaseline.pack.driftSummaries).map((item) => [String(item.key || ""), item])
  );
  const keys = Array.from(new Set([...primaryMap.keys(), ...comparisonMap.keys()])).filter(Boolean);

  return keys.map((key) => {
    const primary = primaryMap.get(key) || null;
    const comparison = comparisonMap.get(key) || null;
    const left = Number(primary?.primary ?? 0);
    const right = Number(comparison?.primary ?? 0);
    const delta = left - right;

    return {
      key,
      label: primary?.label || comparison?.label || "Drift Metric",
      primary: left,
      comparison: right,
      tone: delta === 0 ? "neutral" : delta > 0 ? "success" : "warning",
      detail: primary?.detail || "No primary baseline detail",
      comparisonDetail: comparison?.detail || "No comparison baseline detail",
      summary:
        delta === 0
          ? "Aligned across saved baselines"
          : `${delta > 0 ? "+" : ""}${delta} in ${primaryBaseline.name} vs ${comparisonBaseline.name}`
    };
  });
}

function buildContinuityAlertRollups(alerts = [], accessor, fallbackLabel) {
  const groups = alerts.reduce((accumulator, alert) => {
    const key = String(accessor(alert) || "").trim() || fallbackLabel;
    const current = accumulator[key] || {
      label: key,
      count: 0,
      critical: 0,
      warning: 0,
      latestAt: "",
      latestReason: "",
      recommendedAction: ""
    };

    current.count += 1;
    if (String(alert.severity || "").toLowerCase() === "critical") {
      current.critical += 1;
    } else {
      current.warning += 1;
    }

    const candidateTime = new Date(alert.updatedAt || alert.createdAt || 0).getTime();
    const existingTime = new Date(current.latestAt || 0).getTime();
    if (!current.latestAt || candidateTime >= existingTime) {
      current.latestAt = alert.updatedAt || alert.createdAt || "";
      current.latestReason = alert.reason || "No continuity reason recorded.";
      current.recommendedAction = alert.recommendedAction || "";
    }

    accumulator[key] = current;
    return accumulator;
  }, {});

  return Object.values(groups)
    .map((group) => ({
      ...group,
      tone: group.critical > 0 ? "danger" : group.count >= 3 ? "warning" : "info",
      summary:
        group.critical > 0
          ? `${group.critical} critical continuity drifts`
          : `${group.count} recorded continuity drifts`
    }))
    .sort((left, right) => right.count - left.count || new Date(right.latestAt || 0).getTime() - new Date(left.latestAt || 0).getTime())
    .slice(0, 6);
}

function buildContinuityMacroAnalytics(macros = []) {
  const now = Date.now();
  const rows = (macros || []).map((macro) => {
    const usageHistory = asArray(macro.usageHistory)
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => right - left);
    const countWithin = (days) => usageHistory.filter((value) => value >= now - days * 24 * 60 * 60 * 1000).length;
    const usageCount = Number(macro.usageCount || usageHistory.length || 0);
    return {
      id: macro.id,
      name: macro.name,
      usageCount,
      lastUsedAt: macro.lastUsedAt || (usageHistory[0] ? new Date(usageHistory[0]).toISOString() : ""),
      last24h: countWithin(1),
      last7d: countWithin(7),
      last30d: countWithin(30),
      tone: usageCount === 0 ? "neutral" : usageCount >= 6 ? "success" : usageCount >= 3 ? "info" : "warning",
      presetName: macro.presetName || "Ad hoc view",
      replayQueueName: macro.replayQueueName || "No queue",
      sessionIntent: macro.sessionIntent || "No intent"
    };
  });

  return {
    mostUsed: [...rows].sort((left, right) => right.usageCount - left.usageCount || new Date(right.lastUsedAt || 0).getTime() - new Date(left.lastUsedAt || 0).getTime()).slice(0, 4),
    lastUsed: [...rows].filter((row) => row.lastUsedAt).sort((left, right) => new Date(right.lastUsedAt || 0).getTime() - new Date(left.lastUsedAt || 0).getTime()).slice(0, 4),
    leastUsed: [...rows].sort((left, right) => left.usageCount - right.usageCount || new Date(left.lastUsedAt || 0).getTime() - new Date(right.lastUsedAt || 0).getTime()).slice(0, 4),
    frequencyRows: [...rows].sort((left, right) => right.last7d - left.last7d || right.last30d - left.last30d || right.usageCount - left.usageCount).slice(0, 6)
  };
}

function buildBaselineClusterLaneRows(primaryBaseline, comparisonBaseline) {
  if (!primaryBaseline?.pack || !comparisonBaseline?.pack) return [];

  const flattenClusters = (baseline, key) =>
    asArray(baseline?.pack?.clusterSnapshots)
      .flatMap((snapshot) => asArray(snapshot?.[key]))
      .map((cluster) => `${cluster.label}: ${cluster.detail}`)
      .slice(0, 6);
  const joinClusters = (items) => joinReadable(items, "No cluster data");

  return [
    {
      key: "watchlist",
      label: "Watchlist Clusters",
      primary: joinClusters(flattenClusters(primaryBaseline, "watchlistClusters")),
      comparison: joinClusters(flattenClusters(comparisonBaseline, "watchlistClusters"))
    },
    {
      key: "intent",
      label: "Session Intent Clusters",
      primary: joinClusters(flattenClusters(primaryBaseline, "intentClusters")),
      comparison: joinClusters(flattenClusters(comparisonBaseline, "intentClusters"))
    },
    {
      key: "quality",
      label: "Replay Quality Clusters",
      primary: joinClusters(flattenClusters(primaryBaseline, "qualityClusters")),
      comparison: joinClusters(flattenClusters(comparisonBaseline, "qualityClusters"))
    },
    {
      key: "verdicts",
      label: "Verdict Concentration",
      primary: joinReadable(
        asArray(primaryBaseline?.pack?.verdictPatterns).map((pattern) => `${pattern.label}: ${pattern.summary || pattern.primary || "No verdict summary"}`),
        "No verdict concentration"
      ),
      comparison: joinReadable(
        asArray(comparisonBaseline?.pack?.verdictPatterns).map((pattern) => `${pattern.label}: ${pattern.summary || pattern.primary || "No verdict summary"}`),
        "No verdict concentration"
      )
    }
  ].map((row) => ({
    ...row,
    tone: row.primary === row.comparison ? "neutral" : "info",
    summary: row.primary === row.comparison ? "Cluster mix aligned across baselines" : "Cluster mix differs across saved baselines"
  }));
}

function buildContinuityTrendSnapshots(alerts = []) {
  const ordered = [...(alerts || [])].sort(
    (left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime()
  );
  const recent = ordered.slice(0, 6);
  const previous = ordered.slice(6, 12);
  const severityValue = (alert) => (String(alert.severity || "").toLowerCase() === "critical" ? 2 : 1);
  const averageSeverity = (items) =>
    items.length ? items.reduce((total, item) => total + severityValue(item), 0) / items.length : 0;
  const recentAverage = averageSeverity(recent);
  const previousAverage = averageSeverity(previous);
  const delta = recentAverage - previousAverage;
  const recentCritical = recent.filter((item) => String(item.severity || "").toLowerCase() === "critical").length;
  const previousCritical = previous.filter((item) => String(item.severity || "").toLowerCase() === "critical").length;
  const recentScopes = new Set(
    recent.flatMap((item) => [item.symbol, item.route, normalizeSessionIntent(item.sessionIntent)].filter(Boolean))
  ).size;
  const previousScopes = new Set(
    previous.flatMap((item) => [item.symbol, item.route, normalizeSessionIntent(item.sessionIntent)].filter(Boolean))
  ).size;

  const resolveTrend = (value) => {
    if (value <= -0.2) return { state: "Improving", tone: "success" };
    if (value >= 0.2) return { state: "Worsening", tone: "danger" };
    return { state: "Stable", tone: "info" };
  };
  const severityTrend = resolveTrend(delta);
  const criticalTrend = resolveTrend(recentCritical - previousCritical);
  const scopeTrend = resolveTrend(recentScopes - previousScopes);

  return [
    {
      key: "severity",
      label: "Severity Trend",
      state: severityTrend.state,
      tone: severityTrend.tone,
      detail: `Recent drift severity is ${severityTrend.state.toLowerCase()} across the latest ${recent.length || 0} alerts versus the prior ${previous.length || 0}.`,
      reasoning:
        previous.length
          ? `Average severity moved from ${previousAverage.toFixed(2)} to ${recentAverage.toFixed(2)}.`
          : "More history will sharpen the recent-vs-prior severity trend."
    },
    {
      key: "critical-pressure",
      label: "Critical Pressure",
      state: criticalTrend.state,
      tone: criticalTrend.tone,
      detail: `${recentCritical} critical drifts in the latest review window versus ${previousCritical} in the prior window.`,
      reasoning:
        recentCritical === previousCritical
          ? "Critical continuity pressure is holding steady across the last two review windows."
          : recentCritical > previousCritical
            ? "Critical drift pressure is rising and should be reviewed before the next handoff."
            : "Critical drift pressure is easing relative to the prior review window."
    },
    {
      key: "scope-spread",
      label: "Scope Spread",
      state: scopeTrend.state,
      tone: scopeTrend.tone,
      detail: `${recentScopes} unique symbol/route/intent scopes were impacted recently versus ${previousScopes} previously.`,
      reasoning:
        recentScopes === previousScopes
          ? "Continuity drift is hitting a similar spread of desk contexts."
          : recentScopes > previousScopes
            ? "Drift is touching a broader mix of symbols, routes, or intents than before."
            : "Drift is concentrating into a narrower set of desk contexts."
    }
  ];
}

function buildContinuityTrendFilterOptions(alerts = []) {
  const routes = new Set();
  const protections = new Set();
  const symbols = new Set();

  alerts.forEach((alert) => {
    if (alert?.route) routes.add(String(alert.route));
    if (alert?.protectionState) protections.add(String(alert.protectionState));
    if (alert?.symbol) symbols.add(String(alert.symbol));
  });

  return {
    routes: ["All Routes", ...Array.from(routes)],
    protections: ["All Protection", ...Array.from(protections)],
    symbols: ["All Symbols", ...Array.from(symbols)]
  };
}

function filterContinuityTrendAlerts(alerts = [], routeFilter, protectionFilter, symbolFilter) {
  return (alerts || []).filter((alert) => {
    const routeMatch = routeFilter === "All Routes" ? true : String(alert?.route || "") === routeFilter;
    const protectionMatch =
      protectionFilter === "All Protection" ? true : String(alert?.protectionState || "") === protectionFilter;
    const symbolMatch = symbolFilter === "All Symbols" ? true : String(alert?.symbol || "") === symbolFilter;

    return routeMatch && protectionMatch && symbolMatch;
  });
}

function buildReplayVerdictCountMap(queueItems = []) {
  return queueItems.reduce(
    (accumulator, item) => {
      (item.verdicts || []).forEach((verdict) => {
        accumulator[verdict] = (accumulator[verdict] || 0) + 1;
      });
      return accumulator;
    },
    {
      strong: 0,
      disciplined: 0,
      risky: 0,
      weak: 0,
      "review-again": 0
    }
  );
}

function buildMacroOutcomeCorrelationRows(macros = [], replayQueues = [], replayReviewMarks = {}) {
  return (macros || [])
    .map((macro) => {
      const queue = (replayQueues || []).find((item) => item.id === macro.replayQueueId) || null;
      const queueItems = deriveQueueItems(queue, replayReviewMarks);
      const rollup = buildQueueScoringRollup(queue, queueItems);
      const metrics = new Map((rollup?.metrics || []).map((metric) => [metric.key, metric]));
      const verdicts = buildReplayVerdictCountMap(queueItems);
      const usageCount = Number(macro.usageCount || macro.usageHistory?.length || 0);
      const overall = Number(rollup?.overall || 0);
      let relationship = "Limited usage evidence";
      let tone = rollup?.tone || "neutral";

      if (usageCount >= 4 && overall >= 78) {
        relationship = "Frequently used with stronger replay outcomes";
        tone = "success";
      } else if (usageCount >= 4 && overall < 65) {
        relationship = "Frequently used but drifting in replay quality";
        tone = "warning";
      } else if (usageCount < 4 && overall >= 78) {
        relationship = "Underused despite stronger replay outcomes";
        tone = "info";
      } else if (!queue) {
        relationship = "No replay queue linked yet";
        tone = "neutral";
      }

      return {
        id: macro.id,
        name: macro.name,
        tone,
        relationship,
        usageCount,
        lastUsedAt: macro.lastUsedAt || "",
        queueName: queue?.name || macro.replayQueueName || "No queue",
        replayQuality: Number(metrics.get("outcome-quality")?.score || 0),
        discipline: Number(metrics.get("discipline")?.score || 0),
        protectionAdherence: Number(metrics.get("risk-posture")?.score || 0),
        consistency: Number(metrics.get("consistency")?.score || 0),
        verdictMix: `${verdicts.strong} strong | ${verdicts.disciplined} disciplined | ${verdicts.risky} risky | ${verdicts.weak} weak`
      };
    })
    .sort((left, right) => {
      const usageDelta = Number(right.usageCount || 0) - Number(left.usageCount || 0);
      if (usageDelta !== 0) return usageDelta;
      return right.replayQuality - left.replayQuality;
    });
}

function buildContinuityInsightReasoning({ macroOutcomeRows = [], driftClusters = [], trendSnapshots = [] }) {
  const lines = [];
  const topMacro = macroOutcomeRows[0];
  const topCluster = (driftClusters || []).find((lane) => lane.summary);
  const topTrend = (trendSnapshots || []).find((snapshot) => snapshot.reasoning);

  if (topMacro) {
    lines.push(
      `${topMacro.name} has ${topMacro.usageCount} launches and is currently showing ${topMacro.relationship.toLowerCase()}.`
    );
  }
  if (topCluster) {
    lines.push(`${topCluster.label} is the strongest current drift lane: ${topCluster.summary}.`);
  }
  if (topTrend) {
    lines.push(`${topTrend.label} is ${String(topTrend.state || "").toLowerCase()}: ${topTrend.reasoning}`);
  }

  if (!lines.length) {
    lines.push("Continuity insight is waiting for more local drift and macro history before stronger reasoning can be formed.");
  }

  return lines.slice(0, 4);
}

function normalizeContinuityInsightReportPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const report =
    payload.kind === "continuity-insight-report" && payload.report && typeof payload.report === "object"
      ? payload.report
      : payload;

  if (!report || typeof report !== "object") return null;

  return {
    name: String(report.name || payload.name || "Continuity Insight Report"),
    filters: {
      route: String(report.filters?.route || "All Routes"),
      protectionState: String(report.filters?.protectionState || "All Protection"),
      symbol: String(report.filters?.symbol || "All Symbols")
    },
    primaryBaselineId: String(report.primaryBaselineId || ""),
    comparisonBaselineId: String(report.comparisonBaselineId || ""),
    macroAnalytics: {
      mostUsed: asArray(report.macroAnalytics?.mostUsed),
      lastUsed: asArray(report.macroAnalytics?.lastUsed),
      leastUsed: asArray(report.macroAnalytics?.leastUsed),
      frequencyRows: asArray(report.macroAnalytics?.frequencyRows)
    },
    driftClusters: asArray(report.driftClusters),
    trendSnapshots: asArray(report.trendSnapshots),
    executionContexts: {
      symbols: asArray(report.executionContexts?.symbols),
      routes: asArray(report.executionContexts?.routes),
      protections: asArray(report.executionContexts?.protections)
    },
    reasoning: asArray(report.reasoning)
  };
}

function summarizeTrendPosture(trendSnapshots = []) {
  const counts = (trendSnapshots || []).reduce(
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
  const state = dominant[1]
    ? dominant[0] === "improving"
      ? "Improving"
      : dominant[0] === "worsening"
        ? "Worsening"
        : "Stable"
    : "Stable";
  const tone = state === "Improving" ? "success" : state === "Worsening" ? "warning" : "info";

  return {
    state,
    tone,
    detail: `${counts.improving} improving | ${counts.stable} stable | ${counts.worsening} worsening`
  };
}

function buildContinuityCollectionPlaybackFrames(collection) {
  if (!collection) return [];

  return asArray(collection.reports)
    .filter(Boolean)
    .slice()
    .sort(
      (left, right) =>
        new Date(left.updatedAt || left.createdAt || 0).getTime() -
        new Date(right.updatedAt || right.createdAt || 0).getTime()
    )
    .map((report, index, reports) => {
      const trend = summarizeTrendPosture(report.trendSnapshots);
      const previous = reports[index - 1] || null;
      const previousTrend = previous ? summarizeTrendPosture(previous.trendSnapshots) : null;
      const topDrift = asArray(report.driftClusters)[0] || null;
      const symbolCoverage = asArray(report.executionContexts?.symbols)
        .map((row) => String(row?.label || "").trim())
        .filter(Boolean)
        .slice(0, 4);
      const routeCoverage = asArray(report.executionContexts?.routes)
        .map((row) => String(row?.label || "").trim())
        .filter(Boolean)
        .slice(0, 4);
      const protectionCoverage = asArray(report.executionContexts?.protections)
        .map((row) => String(row?.label || "").trim())
        .filter(Boolean)
        .slice(0, 4);

      return {
        id: report.id,
        report,
        trend,
        timestamp: report.updatedAt || report.createdAt || "",
        label: report.name,
        evolution:
          !previousTrend || previousTrend.state === trend.state
            ? `${trend.state} posture is holding through this step.`
            : `${previousTrend.state} -> ${trend.state} posture shift across the collection timeline.`,
        topDrift: topDrift?.summary || "No drift cluster summary recorded for this report.",
        topReasoning: asArray(report.reasoning)[0] || "No saved reasoning line recorded for this report.",
        coverage: {
          symbols: symbolCoverage,
          routes: routeCoverage,
          protections: protectionCoverage
        }
      };
    });
}

function compareCollectionPlaybackField(currentValue, previousValue, label, options = {}) {
  const currentNormalized = Array.isArray(currentValue)
    ? currentValue.filter(Boolean).join(", ")
    : String(currentValue || "").trim();
  const previousNormalized = Array.isArray(previousValue)
    ? previousValue.filter(Boolean).join(", ")
    : String(previousValue || "").trim();
  const currentLabel = currentNormalized || options.currentFallback || "None";
  const previousLabel = previousNormalized || options.previousFallback || "None";
  const changed = currentLabel !== previousLabel;

  return {
    label,
    changed,
    tone: changed ? options.changedTone || "warning" : "neutral",
    current: currentLabel,
    previous: previousLabel,
    summary: changed ? `${previousLabel} -> ${currentLabel}` : "No change"
  };
}

function buildContinuityCollectionPlaybackDiff(frame, previousFrame) {
  if (!frame) return [];

  const currentReport = frame.report || {};
  const previousReport = previousFrame?.report || {};
  const currentTrend = frame.trend || summarizeTrendPosture(currentReport.trendSnapshots);
  const previousTrend = previousFrame?.trend || summarizeTrendPosture(previousReport.trendSnapshots);
  const reasoningAdded = asArray(currentReport.reasoning).filter((line) => !asArray(previousReport.reasoning).includes(line));
  const reasoningRemoved = asArray(previousReport.reasoning).filter((line) => !asArray(currentReport.reasoning).includes(line));

  return [
    compareCollectionPlaybackField(
      currentReport.filters?.symbol || frame.coverage?.symbols || [],
      previousReport.filters?.symbol || previousFrame?.coverage?.symbols || [],
      "Symbol Delta",
      { changedTone: "info", currentFallback: "All Symbols", previousFallback: "All Symbols" }
    ),
    compareCollectionPlaybackField(
      currentReport.filters?.route || frame.coverage?.routes || [],
      previousReport.filters?.route || previousFrame?.coverage?.routes || [],
      "Route Delta",
      { changedTone: "warning", currentFallback: "All Routes", previousFallback: "All Routes" }
    ),
    compareCollectionPlaybackField(
      currentReport.filters?.protectionState || frame.coverage?.protections || [],
      previousReport.filters?.protectionState || previousFrame?.coverage?.protections || [],
      "Protection Posture Delta",
      { changedTone: "success", currentFallback: "All Protection", previousFallback: "All Protection" }
    ),
    {
      label: "Drift Posture Delta",
      changed: currentTrend.state !== previousTrend.state || frame.topDrift !== (previousFrame?.topDrift || "No drift cluster summary recorded for this report."),
      tone: currentTrend.state === previousTrend.state ? "neutral" : currentTrend.state === "Improving" ? "success" : "warning",
      current: `${currentTrend.state} | ${frame.topDrift}`,
      previous: previousFrame ? `${previousTrend.state} | ${previousFrame.topDrift}` : "No prior step",
      summary:
        !previousFrame
          ? "First step in collection timeline"
          : currentTrend.state === previousTrend.state && frame.topDrift === previousFrame.topDrift
            ? "No posture change"
            : `${previousTrend.state} -> ${currentTrend.state}`
    },
    {
      label: "Reasoning Shift Delta",
      changed: Boolean(reasoningAdded.length || reasoningRemoved.length),
      tone: reasoningAdded.length ? "info" : reasoningRemoved.length ? "warning" : "neutral",
      current: reasoningAdded.length ? `Added: ${reasoningAdded.slice(0, 2).join(" | ")}` : "No new reasoning lines",
      previous: reasoningRemoved.length ? `Dropped: ${reasoningRemoved.slice(0, 2).join(" | ")}` : "No dropped reasoning lines",
      summary:
        !previousFrame
          ? "First step in collection timeline"
          : !reasoningAdded.length && !reasoningRemoved.length
            ? "No reasoning shift"
            : `${reasoningAdded.length} added | ${reasoningRemoved.length} removed`
    }
  ];
}

function buildContinuityCollectionImportPreview(pack, currentReports = [], currentCollections = []) {
  if (!pack?.collection || !Array.isArray(pack.reports)) return null;

  const reportFingerprints = new Set(currentReports.map((report) => JSON.stringify({
    name: String(report.name || "").trim().toLowerCase(),
    route: String(report.filters?.route || "").trim().toLowerCase(),
    protectionState: String(report.filters?.protectionState || "").trim().toLowerCase(),
    symbol: String(report.filters?.symbol || "").trim().toLowerCase(),
    createdAt: String(report.createdAt || "").trim(),
    updatedAt: String(report.updatedAt || "").trim()
  })));
  const importedMatches = pack.reports.filter((report) =>
    reportFingerprints.has(JSON.stringify({
      name: String(report.name || "").trim().toLowerCase(),
      route: String(report.filters?.route || "").trim().toLowerCase(),
      protectionState: String(report.filters?.protectionState || "").trim().toLowerCase(),
      symbol: String(report.filters?.symbol || "").trim().toLowerCase(),
      createdAt: String(report.createdAt || "").trim(),
      updatedAt: String(report.updatedAt || "").trim()
    }))
  ).length;
  const collectionMatch = currentCollections.find((collection) =>
    String(collection.name || "").trim().toLowerCase() === String(pack.collection.name || "").trim().toLowerCase() &&
    Array.isArray(collection.reportIds) &&
    collection.reportIds.length === (pack.collection.reportIds || []).length
  ) || null;
  const timestamps = pack.reports
    .map((report) => new Date(report.updatedAt || report.createdAt || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  return {
    name: pack.collection.name || "Insight Collection",
    reportCount: pack.reports.length,
    timestamps: {
      earliest: timestamps.length ? new Date(timestamps[0]).toISOString() : "",
      latest: timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : ""
    },
    mergeBehavior: collectionMatch
      ? "Merge into the matching local collection and reuse matching reports where fingerprints align."
      : "Add a new local collection and reuse matching reports where fingerprints align.",
    contentSummary:
      pack.collection.summary ||
      `${pack.reports.length} reports | ${(pack.collection.coverage?.symbols || []).length} symbols | ${(pack.collection.coverage?.routes || []).length} routes | ${(pack.collection.coverage?.protections || []).length} postures`,
    notes: pack.collection.notes || "",
    noteHistoryCount: asArray(pack.collection.noteHistory).length || asArray(pack.bundle?.noteHistory).length,
    checkpointCount: Array.isArray(pack.collection.checkpoints) ? pack.collection.checkpoints.length : 0,
    selectedCheckpointCount: asArray(pack.bundle?.selectedCheckpoints).length,
    bundleSummary: String(pack.bundle?.summary || ""),
    healthSummary: String(pack.bundle?.health?.summary || ""),
    matchedReports: importedMatches,
    newReports: Math.max(pack.reports.length - importedMatches, 0),
    collectionMatchName: collectionMatch?.name || ""
  };
}

function toggleCollectionSelection(ids = [], targetId) {
  const key = String(targetId || "").trim();
  if (!key) return Array.isArray(ids) ? ids : [];
  const current = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [ids])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  return current.includes(key) ? current.filter((item) => item !== key) : [key, ...current];
}

function buildContinuityCollectionHealth(collection, promotedCheckpoints = []) {
  const playbackFrames = buildContinuityCollectionPlaybackFrames(collection);
  if (!playbackFrames.length) {
    return {
      overall: 0,
      tone: "neutral",
      state: "Empty",
      summary: "No saved reports are available yet for collection-wide health scoring.",
      metrics: []
    };
  }

  const reports = playbackFrames.map((frame) => frame.report).filter(Boolean);
  const trendStates = playbackFrames.map((frame) => frame.trend.state);
  const trendSwitches = trendStates.reduce(
    (count, state, index) => (index > 0 && state !== trendStates[index - 1] ? count + 1 : count),
    0
  );
  const improvingCount = trendStates.filter((state) => state === "Improving").length;
  const stableCount = trendStates.filter((state) => state === "Stable").length;
  const worseningCount = trendStates.filter((state) => state === "Worsening").length;
  const trendStability = clampScore(
    56 +
      (stableCount / playbackFrames.length) * 18 +
      (improvingCount / playbackFrames.length) * 16 -
      trendSwitches * 10 -
      worseningCount * 9
  );

  const driftLanes = reports.flatMap((report) => asArray(report.driftClusters));
  const warningCount = driftLanes.filter((lane) => lane?.tone === "warning").length;
  const dangerCount = driftLanes.filter((lane) => lane?.tone === "danger").length;
  const criticalContextHits = reports
    .flatMap((report) =>
      ["symbols", "routes", "protections"].flatMap((key) => asArray(report.executionContexts?.[key]))
    )
    .reduce((sum, row) => sum + Number(row?.critical || 0), 0);
  const driftSeverity = clampScore(
    96 -
      dangerCount * 14 -
      warningCount * 7 -
      criticalContextHits * 4 -
      worseningCount * 5 -
      Math.max(driftLanes.length - playbackFrames.length, 0) * 2
  );

  const reasoningShiftCounts = playbackFrames.slice(1).map((frame, index) => {
    const previous = playbackFrames[index];
    const added = asArray(frame.report?.reasoning).filter((line) => !asArray(previous.report?.reasoning).includes(line));
    const removed = asArray(previous.report?.reasoning).filter((line) => !asArray(frame.report?.reasoning).includes(line));
    return added.length + removed.length;
  });
  const reasoningShiftEvents = reasoningShiftCounts.filter((count) => count > 0).length;
  const totalReasoningShift = reasoningShiftCounts.reduce((sum, count) => sum + count, 0);
  const reasoningChurn = clampScore(92 - totalReasoningShift * 8 - reasoningShiftEvents * 6);

  const checkpoints = asArray(collection?.checkpoints);
  const checkpointIndexes = checkpoints
    .map((checkpoint) => playbackFrames.findIndex((frame) => frame.id === checkpoint.reportId))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  const checkpointCoverage = playbackFrames.length ? checkpointIndexes.length / playbackFrames.length : 0;
  const checkpointNotes = checkpoints.filter((checkpoint) => checkpoint.note).length;
  const promotedCount = asArray(promotedCheckpoints).length;
  const checkpointSpread =
    checkpointIndexes.length <= 1 || playbackFrames.length <= 1
      ? checkpointIndexes.length
        ? 0.65
        : 0
      : (checkpointIndexes[checkpointIndexes.length - 1] - checkpointIndexes[0]) /
        (playbackFrames.length - 1);
  const checkpointConfidence = clampScore(
    34 +
      checkpointCoverage * 32 +
      (checkpointNotes / Math.max(checkpoints.length, 1)) * 18 +
      checkpointSpread * 10 +
      promotedCount * 8 +
      (collection?.notes ? 6 : 0)
  );

  const metrics = [
    {
      key: "trend-stability",
      label: "Trend Stability",
      score: trendStability,
      tone: scoreMeta(trendStability).tone,
      state: scoreMeta(trendStability).label,
      detail: `${stableCount} stable | ${improvingCount} improving | ${worseningCount} worsening with ${trendSwitches} posture shifts across the full collection timeline.`,
      summary:
        trendSwitches > 0
          ? `${trendSwitches} posture shifts across ${playbackFrames.length} saved steps`
          : `Holding steady across ${playbackFrames.length} saved steps`
    },
    {
      key: "drift-severity",
      label: "Drift Severity",
      score: driftSeverity,
      tone: scoreMeta(driftSeverity).tone,
      state:
        driftSeverity >= 85 ? "Low" : driftSeverity >= 70 ? "Guarded" : driftSeverity >= 55 ? "Elevated" : "High",
      detail: `${driftLanes.length} drift lanes, ${warningCount} warning tones, ${dangerCount} danger tones, and ${criticalContextHits} critical context hits are represented across the collection.`,
      summary:
        dangerCount > 0
          ? `${dangerCount} danger-toned lanes still need operator trust checks`
          : criticalContextHits > 0
            ? `${criticalContextHits} critical context hits remain in scope`
            : "Low severity across the saved drift lanes"
    },
    {
      key: "reasoning-churn",
      label: "Reasoning Churn",
      score: reasoningChurn,
      tone: scoreMeta(reasoningChurn).tone,
      state: reasoningChurn >= 85 ? "Calm" : reasoningChurn >= 70 ? "Measured" : reasoningChurn >= 55 ? "Active" : "High",
      detail: `${totalReasoningShift} added or dropped reasoning lines were observed across ${Math.max(playbackFrames.length - 1, 0)} adjacent-step handoffs.`,
      summary:
        reasoningShiftEvents > 0
          ? `${totalReasoningShift} reasoning deltas across the collection timeline`
          : "Reasoning is holding steady between saved steps"
    },
    {
      key: "checkpoint-confidence",
      label: "Checkpoint Confidence",
      score: checkpointConfidence,
      tone: scoreMeta(checkpointConfidence).tone,
      state:
        checkpointConfidence >= 85
          ? "Trusted"
          : checkpointConfidence >= 70
            ? "Ready"
            : checkpointConfidence >= 55
              ? "Partial"
              : "Thin",
      detail: `${checkpoints.length} pinned checkpoints, ${checkpointNotes} checkpoint notes, ${promotedCount} promoted shell favorites, and ${Math.round(checkpointCoverage * 100)}% timeline coverage are available.`,
      summary:
        promotedCount > 0
          ? `${promotedCount} promoted favorites | ${checkpoints.length} pinned checkpoints`
          : `${checkpoints.length} pinned checkpoints | ${Math.round(checkpointCoverage * 100)}% timeline coverage`
    }
  ];
  const overall = clampScore(
    metrics.reduce((sum, metric) => sum + Number(metric.score || 0), 0) / Math.max(metrics.length, 1)
  );
  const overallMeta = scoreMeta(overall);

  return {
    overall,
    tone: overallMeta.tone,
    state: overallMeta.label,
    summary: `${playbackFrames.length} steps | ${checkpoints.length} checkpoints | ${promotedCount} shell favorites promoted`,
    metrics
  };
}

function buildContinuityCollectionCheckpointContext(collection, checkpoint, playbackFrames = [], health = null) {
  if (!collection || !checkpoint) return null;

  const frameIndex = playbackFrames.findIndex((frame) => frame.id === checkpoint.reportId);
  const frame = frameIndex >= 0 ? playbackFrames[frameIndex] : null;
  const report = frame?.report || null;
  if (!frame || !report) return null;

  const previous = frameIndex > 0 ? playbackFrames[frameIndex - 1] : null;
  const next = frameIndex < playbackFrames.length - 1 ? playbackFrames[frameIndex + 1] : null;

  return {
    checkpointId: checkpoint.id,
    checkpointLabel: checkpoint.label,
    checkpointNote: checkpoint.note || "",
    reportId: frame.id,
    reportName: frame.label,
    capturedAt: frame.timestamp,
    position: `${frameIndex + 1}/${playbackFrames.length}`,
    trendState: frame.trend.state,
    evolution: frame.evolution,
    topDrift: frame.topDrift,
    topReasoning: frame.topReasoning,
    filters: {
      route: String(report.filters?.route || "All Routes"),
      protectionState: String(report.filters?.protectionState || "All Protection"),
      symbol: String(report.filters?.symbol || "All Symbols")
    },
    coverage: {
      symbols: frame.coverage?.symbols || [],
      routes: frame.coverage?.routes || [],
      protections: frame.coverage?.protections || []
    },
    adjacentSteps: {
      previous: previous
        ? {
            reportId: previous.id,
            reportName: previous.label,
            trendState: previous.trend.state,
            capturedAt: previous.timestamp
          }
        : null,
      next: next
        ? {
            reportId: next.id,
            reportName: next.label,
            trendState: next.trend.state,
            capturedAt: next.timestamp
          }
        : null
    },
    collectionHealth: health
      ? {
          overall: health.overall,
          state: health.state,
          summary: health.summary
        }
      : null
  };
}

function buildContinuityInsightDeltaRows(primaryReport, comparisonReport) {
  if (!primaryReport || !comparisonReport) return [];

  const primaryMacroRows = asArray(primaryReport.macroAnalytics?.frequencyRows);
  const comparisonMacroRows = asArray(comparisonReport.macroAnalytics?.frequencyRows);
  const primaryTotalLaunches = primaryMacroRows.reduce((sum, row) => sum + Number(row?.usageCount || 0), 0);
  const comparisonTotalLaunches = comparisonMacroRows.reduce((sum, row) => sum + Number(row?.usageCount || 0), 0);
  const primaryTopMacro = primaryMacroRows[0];
  const comparisonTopMacro = comparisonMacroRows[0];
  const primaryTrend = summarizeTrendPosture(primaryReport.trendSnapshots);
  const comparisonTrend = summarizeTrendPosture(comparisonReport.trendSnapshots);
  const reasoningAdded = asArray(primaryReport.reasoning).filter((line) => !asArray(comparisonReport.reasoning).includes(line));
  const reasoningRemoved = asArray(comparisonReport.reasoning).filter((line) => !asArray(primaryReport.reasoning).includes(line));
  const primaryProtection = primaryReport.filters?.protectionState || "All Protection";
  const comparisonProtection = comparisonReport.filters?.protectionState || "All Protection";

  return [
    {
      key: "macro-analytics",
      label: "Macro Analytics",
      tone: primaryTotalLaunches === comparisonTotalLaunches ? "neutral" : primaryTotalLaunches > comparisonTotalLaunches ? "success" : "warning",
      primary: `${primaryTotalLaunches} launches | ${primaryTopMacro?.name || "No top macro"}`,
      comparison: `${comparisonTotalLaunches} launches | ${comparisonTopMacro?.name || "No top macro"}`,
      summary:
        primaryTotalLaunches === comparisonTotalLaunches
          ? "Launch activity is flat across both insight baselines."
          : `${primaryTotalLaunches > comparisonTotalLaunches ? "+" : ""}${primaryTotalLaunches - comparisonTotalLaunches} launches vs comparison report`
    },
    {
      key: "drift-clusters",
      label: "Drift Clusters",
      tone:
        asArray(primaryReport.driftClusters).length === asArray(comparisonReport.driftClusters).length
          ? "neutral"
          : asArray(primaryReport.driftClusters).length > asArray(comparisonReport.driftClusters).length
            ? "warning"
            : "success",
      primary: (asArray(primaryReport.driftClusters).slice(0, 2).map((row) => `${row.label}: ${row.summary}`).join(" | ") || "No drift clusters"),
      comparison:
        asArray(comparisonReport.driftClusters).slice(0, 2).map((row) => `${row.label}: ${row.summary}`).join(" | ") || "No drift clusters",
      summary: `${asArray(primaryReport.driftClusters).length} lanes vs ${asArray(comparisonReport.driftClusters).length} lanes`
    },
    {
      key: "trend-posture",
      label: "Trend Posture",
      tone: primaryTrend.state === comparisonTrend.state ? "neutral" : primaryTrend.state === "Improving" ? "success" : "warning",
      primary: `${primaryTrend.state} | ${primaryTrend.detail}`,
      comparison: `${comparisonTrend.state} | ${comparisonTrend.detail}`,
      summary: primaryTrend.state === comparisonTrend.state ? "Trend posture is holding steady across saved reports." : `${primaryTrend.state} vs ${comparisonTrend.state}`
    },
    {
      key: "protection-posture",
      label: "Protection Posture Shift",
      tone: primaryProtection === comparisonProtection ? "neutral" : primaryProtection === "Locked" || primaryProtection === "Guarded" ? "info" : "warning",
      primary: primaryProtection,
      comparison: comparisonProtection,
      summary: primaryProtection === comparisonProtection ? "Protection lens is unchanged." : `${comparisonProtection} -> ${primaryProtection}`
    },
    {
      key: "reasoning",
      label: "Reasoning Changes",
      tone: !reasoningAdded.length && !reasoningRemoved.length ? "neutral" : reasoningAdded.length ? "info" : "warning",
      primary: reasoningAdded.length ? `Added: ${reasoningAdded.slice(0, 2).join(" | ")}` : "No new reasoning lines",
      comparison: reasoningRemoved.length ? `Dropped: ${reasoningRemoved.slice(0, 2).join(" | ")}` : "No dropped reasoning lines",
      summary:
        !reasoningAdded.length && !reasoningRemoved.length
          ? "Continuity reasoning is unchanged across both reports."
          : `${reasoningAdded.length} added | ${reasoningRemoved.length} removed`
    }
  ];
}

function buildContinuityInsightExecutionContextRows(primaryRows = [], comparisonRows = []) {
  const contexts = new Map();

  [...asArray(primaryRows), ...asArray(comparisonRows)].forEach((row) => {
    const label = String(row?.label || "").trim();
    if (!label) return;
    const current = contexts.get(label) || { label, primary: null, comparison: null };
    if (asArray(primaryRows).some((entry) => entry?.label === label)) {
      current.primary = asArray(primaryRows).find((entry) => entry?.label === label) || null;
    }
    if (asArray(comparisonRows).some((entry) => entry?.label === label)) {
      current.comparison = asArray(comparisonRows).find((entry) => entry?.label === label) || null;
    }
    contexts.set(label, current);
  });

  return Array.from(contexts.values())
    .map((row) => {
      const primaryCount = Number(row.primary?.count || 0);
      const comparisonCount = Number(row.comparison?.count || 0);
      const primaryCritical = Number(row.primary?.critical || 0);
      const comparisonCritical = Number(row.comparison?.critical || 0);
      const delta = primaryCount - comparisonCount;
      const criticalDelta = primaryCritical - comparisonCritical;
      const tone =
        criticalDelta > 0
          ? "warning"
          : criticalDelta < 0
            ? "success"
            : delta === 0
              ? "neutral"
              : delta > 0
                ? "info"
                : "success";

      return {
        key: row.label,
        label: row.label,
        delta,
        criticalDelta,
        primary: `${primaryCount} drifts | ${primaryCritical} critical`,
        comparison: `${comparisonCount} drifts | ${comparisonCritical} critical`,
        detail: row.primary?.latestReason || "No current drift reason recorded.",
        comparisonDetail: row.comparison?.latestReason || "No comparison drift reason recorded.",
        tone,
        summary:
          delta === 0 && criticalDelta === 0
            ? "Flat vs comparison"
            : `${delta > 0 ? "+" : ""}${delta} drift hits | ${criticalDelta > 0 ? "+" : ""}${criticalDelta} critical`
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.criticalDelta) - Math.abs(left.criticalDelta) ||
        Math.abs(right.delta) - Math.abs(left.delta) ||
        left.label.localeCompare(right.label)
    )
    .slice(0, 6);
}

function buildContinuityInsightExecutionDrilldowns(primaryReport, comparisonReport) {
  if (!primaryReport || !comparisonReport) return [];

  return [
    {
      key: "symbols",
      label: "By Symbol",
      tone: "info",
      rows: buildContinuityInsightExecutionContextRows(
        primaryReport.executionContexts?.symbols,
        comparisonReport.executionContexts?.symbols
      )
    },
    {
      key: "routes",
      label: "By Route",
      tone: "warning",
      rows: buildContinuityInsightExecutionContextRows(
        primaryReport.executionContexts?.routes,
        comparisonReport.executionContexts?.routes
      )
    },
    {
      key: "protections",
      label: "By Protection Posture",
      tone: "success",
      rows: buildContinuityInsightExecutionContextRows(
        primaryReport.executionContexts?.protections,
        comparisonReport.executionContexts?.protections
      )
    }
  ];
}

function countVerdicts(items = []) {
  return replayVerdictOptions.reduce((accumulator, verdict) => {
    accumulator[verdict] = items.reduce((total, item) => total + ((item.verdicts || []).includes(verdict) ? 1 : 0), 0);
    return accumulator;
  }, {});
}

function buildQueueDriftSummaries(primaryQueue, comparisonQueue, primaryRollup, comparisonRollup, primaryItems = [], comparisonItems = []) {
  if (!primaryQueue || !primaryRollup) return [];

  const summarizeRoute = (items) => {
    const routes = items.map((item) => String(item.route || "").trim()).filter(Boolean);
    const counts = routes.reduce((accumulator, route) => {
      accumulator[route] = (accumulator[route] || 0) + 1;
      return accumulator;
    }, {});
    const leader = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
    const alignment = dominantAlignment(routes);
    const uniqueRoutes = new Set(routes).size;
    return {
      score: clampScore(46 + alignment * 42 - Math.max(uniqueRoutes - 1, 0) * 6),
      detail: `${leader?.[0] || "No route context"} | ${Math.round(alignment * 100)}% concentration across ${uniqueRoutes || 0} routes`
    };
  };

  const summarizeProtection = (items) => {
    const verdicts = countVerdicts(items);
    const statuses = items.map((item) => String(item.status || "").toLowerCase());
    const protectedCount = statuses.filter((status) => /protect|closed|filled/.test(status)).length;
    const rejectedCount = statuses.filter((status) => /reject|critical/.test(status)).length;
    return {
      score: clampScore(52 + protectedCount * 8 - (verdicts.risky || 0) * 8 - rejectedCount * 10),
      detail: `${protectedCount} protected/closed | ${verdicts.risky || 0} risky | ${rejectedCount} reject-linked`
    };
  };

  const summarizeVerdictMix = (items) => {
    const verdicts = countVerdicts(items);
    const positiveBias = (verdicts.strong || 0) + (verdicts.disciplined || 0);
    const cautionBias = (verdicts.weak || 0) + (verdicts.risky || 0) + (verdicts["review-again"] || 0);
    return {
      score: clampScore(50 + positiveBias * 8 - cautionBias * 7),
      detail: `${verdicts.strong || 0} strong | ${verdicts.disciplined || 0} disciplined | ${verdicts.risky || 0} risky | ${verdicts.weak || 0} weak`
    };
  };

  const primaryRoute = summarizeRoute(primaryItems);
  const comparisonRoute = summarizeRoute(comparisonItems);
  const primaryProtection = summarizeProtection(primaryItems);
  const comparisonProtection = summarizeProtection(comparisonItems);
  const primaryVerdictMix = summarizeVerdictMix(primaryItems);
  const comparisonVerdictMix = summarizeVerdictMix(comparisonItems);
  const scoreDelta = primaryRollup.overall - (comparisonRollup?.overall ?? primaryRollup.overall);
  const comparisonTime = comparisonQueue ? formatTimelineTimestamp(comparisonQueue.updatedAt || comparisonQueue.createdAt) : "No prior queue";

  const buildMetric = (key, label, primary, comparison, options = {}) => {
    const delta = primary.score - comparison.score;
    const improved = options.preferLower ? delta < 0 : delta > 0;
    return {
      key,
      label,
      primary: primary.score,
      comparison: comparison.score,
      detail: primary.detail,
      comparisonDetail: comparison.detail,
      tone: delta === 0 ? "neutral" : improved ? "success" : "warning",
      summary: delta === 0 ? "Flat vs comparison" : `${delta > 0 ? "+" : ""}${delta} vs comparison`
    };
  };

  return [
    buildMetric("route-discipline", "Route Discipline", primaryRoute, comparisonRoute),
    buildMetric("protection-adherence", "Protection Adherence", primaryProtection, comparisonProtection),
    buildMetric("verdict-mix", "Verdict Mix", primaryVerdictMix, comparisonVerdictMix),
    {
      key: "replay-score-direction",
      label: "Replay Score Direction",
      primary: primaryRollup.overall,
      comparison: comparisonRollup?.overall ?? primaryRollup.overall,
      detail: `${primaryQueue.name} is ${scoreDelta === 0 ? "holding flat" : scoreDelta > 0 ? "improving" : "drifting"} against ${comparisonQueue?.name || "the current baseline"}.`,
      comparisonDetail: `Prior reference: ${comparisonQueue?.name || "No comparison queue"} | ${comparisonTime}`,
      tone: scoreDelta === 0 ? "neutral" : scoreDelta > 0 ? "success" : "warning",
      summary: scoreDelta === 0 ? "Flat over time" : `${scoreDelta > 0 ? "+" : ""}${scoreDelta} overall vs prior queue`
    }
  ];
}

export function JournalVaultWorkspace({ data }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const recentOrders = useProductTradingStore((state) => state.recentOrders);
  const recentActions = useProductTradingStore((state) => state.recentActions);
  const sessionNotes = useProductTradingStore((state) => state.sessionNotes);
  const addSessionNote = useProductTradingStore((state) => state.addSessionNote);
  const reviewSnapshots = useProductTradingStore((state) => state.reviewSnapshots);
  const activeReviewSnapshotId = useProductTradingStore((state) => state.activeReviewSnapshotId);
  const continuityFilterPresets = useProductTradingStore((state) => state.continuityFilterPresets);
  const continuityWorkspaceMacros = useProductTradingStore((state) => state.continuityWorkspaceMacros);
  const activeContinuityMacroId = useProductTradingStore((state) => state.activeContinuityMacroId);
  const continuityInsightReports = useProductTradingStore((state) => state.continuityInsightReports);
  const activeContinuityInsightReportId = useProductTradingStore((state) => state.activeContinuityInsightReportId);
  const continuityInsightCollections = useProductTradingStore((state) => state.continuityInsightCollections);
  const activeContinuityInsightCollectionId = useProductTradingStore((state) => state.activeContinuityInsightCollectionId);
  const continuityInsightPrimaryReportId = useProductTradingStore((state) => state.continuityInsightPrimaryReportId);
  const continuityInsightComparisonReportId = useProductTradingStore((state) => state.continuityInsightComparisonReportId);
  const replayReviewMarks = useProductTradingStore((state) => state.replayReviewMarks);
  const replayQueues = useProductTradingStore((state) => state.replayQueues);
  const activeReplayQueueId = useProductTradingStore((state) => state.activeReplayQueueId);
  const queueDriftBaselines = useProductTradingStore((state) => state.queueDriftBaselines);
  const handoffNotes = useProductTradingStore((state) => state.handoffNotes);
  const continuityAlertHistory = useProductTradingStore((state) => state.continuityAlertHistory);
  const saveReviewSnapshot = useProductTradingStore((state) => state.saveReviewSnapshot);
  const removeReviewSnapshot = useProductTradingStore((state) => state.removeReviewSnapshot);
  const loadReviewSnapshot = useProductTradingStore((state) => state.loadReviewSnapshot);
  const saveContinuityWorkspaceMacro = useProductTradingStore((state) => state.saveContinuityWorkspaceMacro);
  const renameContinuityWorkspaceMacro = useProductTradingStore((state) => state.renameContinuityWorkspaceMacro);
  const removeContinuityWorkspaceMacro = useProductTradingStore((state) => state.removeContinuityWorkspaceMacro);
  const launchContinuityWorkspaceMacro = useProductTradingStore((state) => state.launchContinuityWorkspaceMacro);
  const saveContinuityInsightReport = useProductTradingStore((state) => state.saveContinuityInsightReport);
  const renameContinuityInsightReport = useProductTradingStore((state) => state.renameContinuityInsightReport);
  const removeContinuityInsightReport = useProductTradingStore((state) => state.removeContinuityInsightReport);
  const loadContinuityInsightReport = useProductTradingStore((state) => state.loadContinuityInsightReport);
  const setContinuityInsightComparisonPair = useProductTradingStore((state) => state.setContinuityInsightComparisonPair);
  const createContinuityInsightCollection = useProductTradingStore((state) => state.createContinuityInsightCollection);
  const renameContinuityInsightCollection = useProductTradingStore((state) => state.renameContinuityInsightCollection);
  const removeContinuityInsightCollection = useProductTradingStore((state) => state.removeContinuityInsightCollection);
  const addContinuityInsightReportToCollection = useProductTradingStore((state) => state.addContinuityInsightReportToCollection);
  const removeContinuityInsightReportFromCollection = useProductTradingStore((state) => state.removeContinuityInsightReportFromCollection);
  const loadContinuityInsightCollection = useProductTradingStore((state) => state.loadContinuityInsightCollection);
  const importContinuityInsightCollectionPack = useProductTradingStore((state) => state.importContinuityInsightCollectionPack);
  const saveContinuityInsightCollectionNotes = useProductTradingStore((state) => state.saveContinuityInsightCollectionNotes);
  const restoreContinuityInsightCollectionNoteRevision = useProductTradingStore((state) => state.restoreContinuityInsightCollectionNoteRevision);
  const saveContinuityInsightCollectionCheckpoint = useProductTradingStore((state) => state.saveContinuityInsightCollectionCheckpoint);
  const removeContinuityInsightCollectionCheckpoint = useProductTradingStore((state) => state.removeContinuityInsightCollectionCheckpoint);
  const promotedContinuityInsightCheckpoints = useProductTradingStore((state) => state.promotedContinuityInsightCheckpoints);
  const togglePromotedContinuityInsightCheckpoint = useProductTradingStore((state) => state.togglePromotedContinuityInsightCheckpoint);
  const openPromotedContinuityInsightCheckpoint = useProductTradingStore((state) => state.openPromotedContinuityInsightCheckpoint);
  const createReplayQueue = useProductTradingStore((state) => state.createReplayQueue);
  const renameReplayQueue = useProductTradingStore((state) => state.renameReplayQueue);
  const setActiveReplayQueue = useProductTradingStore((state) => state.setActiveReplayQueue);
  const removeReplayQueue = useProductTradingStore((state) => state.removeReplayQueue);
  const toggleReplayQueueItem = useProductTradingStore((state) => state.toggleReplayQueueItem);
  const saveQueueDriftBaseline = useProductTradingStore((state) => state.saveQueueDriftBaseline);
  const renameQueueDriftBaseline = useProductTradingStore((state) => state.renameQueueDriftBaseline);
  const removeQueueDriftBaseline = useProductTradingStore((state) => state.removeQueueDriftBaseline);
  const saveHandoffNote = useProductTradingStore((state) => state.saveHandoffNote);
  const removeHandoffNote = useProductTradingStore((state) => state.removeHandoffNote);
  const importHandoffBundle = useProductTradingStore((state) => state.importHandoffBundle);
  const restoreHandoffContext = useProductTradingStore((state) => state.restoreHandoffContext);
  const toggleReplayBookmark = useProductTradingStore((state) => state.toggleReplayBookmark);
  const toggleReplayVerdict = useProductTradingStore((state) => state.toggleReplayVerdict);
  const pinnedReviewSnapshotIds = useProductTradingStore((state) => state.pinnedReviewSnapshotIds);
  const pinnedReplayQueueIds = useProductTradingStore((state) => state.pinnedReplayQueueIds);
  const pinnedHandoffNoteIds = useProductTradingStore((state) => state.pinnedHandoffNoteIds);
  const pinnedContinuityInsightReportIds = useProductTradingStore((state) => state.pinnedContinuityInsightReportIds);
  const pinnedContinuityInsightCollectionIds = useProductTradingStore((state) => state.pinnedContinuityInsightCollectionIds);
  const pinnedContinuityInsightPairs = useProductTradingStore((state) => state.pinnedContinuityInsightPairs);
  const togglePinnedReviewSnapshot = useProductTradingStore((state) => state.togglePinnedReviewSnapshot);
  const togglePinnedReplayQueue = useProductTradingStore((state) => state.togglePinnedReplayQueue);
  const togglePinnedHandoffNote = useProductTradingStore((state) => state.togglePinnedHandoffNote);
  const togglePinnedContinuityInsightReport = useProductTradingStore((state) => state.togglePinnedContinuityInsightReport);
  const togglePinnedContinuityInsightCollection = useProductTradingStore((state) => state.togglePinnedContinuityInsightCollection);
  const togglePinnedContinuityInsightPair = useProductTradingStore((state) => state.togglePinnedContinuityInsightPair);
  const openPinnedContinuityInsightPair = useProductTradingStore((state) => state.openPinnedContinuityInsightPair);
  const saveContinuityFilterPreset = useProductTradingStore((state) => state.saveContinuityFilterPreset);
  const renameContinuityFilterPreset = useProductTradingStore((state) => state.renameContinuityFilterPreset);
  const removeContinuityFilterPreset = useProductTradingStore((state) => state.removeContinuityFilterPreset);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const executionEvents = useProductTradingStore((state) => state.executionEvents);
  const savedWatchlists = useProductTradingStore((state) => state.savedWatchlists);
  const activeWatchlist = useProductTradingStore((state) => state.activeWatchlist);
  const activeWatchlistId = useProductTradingStore((state) => state.activeWatchlistId);
  const controlledAlerts = useProductTradingStore((state) => state.controlledAlerts);
  const chartOverlayModel = useProductTradingStore((state) => state.chartOverlayModel);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const riskSummary = useProductTradingStore((state) => state.riskSummary);
  const [draft, setDraft] = useState("");
  const [filterWatchlistId, setFilterWatchlistId] = useState("active");
  const [filterTag, setFilterTag] = useState("All Tags");
  const [filterIntent, setFilterIntent] = useState("All Intents");
  const [exportMessage, setExportMessage] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [queueName, setQueueName] = useState("");
  const [editingQueueId, setEditingQueueId] = useState("");
  const [editingQueueName, setEditingQueueName] = useState("");
  const [presetName, setPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState("");
  const [editingPresetName, setEditingPresetName] = useState("");
  const [macroName, setMacroName] = useState("");
  const [editingMacroId, setEditingMacroId] = useState("");
  const [editingMacroName, setEditingMacroName] = useState("");
  const [insightReportName, setInsightReportName] = useState("");
  const [editingInsightReportId, setEditingInsightReportId] = useState("");
  const [editingInsightReportName, setEditingInsightReportName] = useState("");
  const [insightCollectionName, setInsightCollectionName] = useState("");
  const [editingInsightCollectionId, setEditingInsightCollectionId] = useState("");
  const [editingInsightCollectionName, setEditingInsightCollectionName] = useState("");
  const [insightCollectionDraftReportIds, setInsightCollectionDraftReportIds] = useState([]);
  const [collectionAddSelections, setCollectionAddSelections] = useState({});
  const [collectionNoteDrafts, setCollectionNoteDrafts] = useState({});
  const [collectionCheckpointDrafts, setCollectionCheckpointDrafts] = useState({});
  const [collectionBundleSelections, setCollectionBundleSelections] = useState({});
  const [collectionPlaybackIndexes, setCollectionPlaybackIndexes] = useState({});
  const [activePlaybackCollectionId, setActivePlaybackCollectionId] = useState("");
  const [collectionImportPreview, setCollectionImportPreview] = useState(null);
  const [baselineName, setBaselineName] = useState("");
  const [editingBaselineId, setEditingBaselineId] = useState("");
  const [editingBaselineName, setEditingBaselineName] = useState("");
  const [primaryBaselineId, setPrimaryBaselineId] = useState("");
  const [comparisonBaselineId, setComparisonBaselineId] = useState("");
  const [handoffComment, setHandoffComment] = useState("");
  const [baselinePack, setBaselinePack] = useState(null);
  const [comparisonPack, setComparisonPack] = useState(null);
  const [importedDriftPack, setImportedDriftPack] = useState(null);
  const [handoffImportPreview, setHandoffImportPreview] = useState(null);
  const [timelineWatchlistFilter, setTimelineWatchlistFilter] = useState("All Market Sets");
  const [timelineIntentFilter, setTimelineIntentFilter] = useState("All Intents");
  const [timelineSymbolFilter, setTimelineSymbolFilter] = useState("All Symbols");
  const [trendRouteFilter, setTrendRouteFilter] = useState("All Routes");
  const [trendProtectionFilter, setTrendProtectionFilter] = useState("All Protection");
  const [trendSymbolFilter, setTrendSymbolFilter] = useState("All Symbols");
  const baselineInputRef = useRef(null);
  const comparisonInputRef = useRef(null);
  const handoffImportRef = useRef(null);
  const driftImportRef = useRef(null);
  const insightImportRef = useRef(null);
  const insightCollectionImportRef = useRef(null);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  const options = useMemo(() => selectOptions(savedWatchlists), [savedWatchlists]);
  const activeContext = useMemo(() => summarizeWatchlistContext(activeWatchlist), [activeWatchlist]);
  const scope = useMemo(
    () => resolveScope(savedWatchlists, activeWatchlist, filterWatchlistId, filterTag, filterIntent),
    [activeWatchlist, filterIntent, filterTag, filterWatchlistId, savedWatchlists]
  );
  const watchlistLookup = useMemo(
    () => new Map(savedWatchlists.map((watchlist) => [watchlist.id, watchlist])),
    [savedWatchlists]
  );
  const activeReplayQueue = useMemo(
    () => replayQueues.find((queue) => queue.id === activeReplayQueueId) || null,
    [activeReplayQueueId, replayQueues]
  );
  const activeContinuityMacro = useMemo(
    () => continuityWorkspaceMacros.find((macro) => macro.id === activeContinuityMacroId) || null,
    [activeContinuityMacroId, continuityWorkspaceMacros]
  );
  const continuityInsightReportMap = useMemo(
    () => new Map(continuityInsightReports.map((report) => [report.id, report])),
    [continuityInsightReports]
  );
  const activeContinuityInsightReport = useMemo(
    () => continuityInsightReports.find((report) => report.id === activeContinuityInsightReportId) || null,
    [activeContinuityInsightReportId, continuityInsightReports]
  );
  const resolvedContinuityInsightCollections = useMemo(
    () =>
      continuityInsightCollections.map((collection) => ({
        ...collection,
        reports: (collection.reportIds || [])
          .map((reportId) => continuityInsightReportMap.get(reportId))
          .filter(Boolean)
      })),
    [continuityInsightCollections, continuityInsightReportMap]
  );
  const activeContinuityInsightCollection = useMemo(
    () =>
      resolvedContinuityInsightCollections.find((collection) => collection.id === activeContinuityInsightCollectionId) ||
      null,
    [activeContinuityInsightCollectionId, resolvedContinuityInsightCollections]
  );
  const promotedContinuityCheckpointKeySet = useMemo(
    () =>
      new Set(
        asArray(promotedContinuityInsightCheckpoints).map(
          (item) => `${item.collectionId || ""}::${item.checkpointId || ""}`
        )
      ),
    [promotedContinuityInsightCheckpoints]
  );
  const continuityCollectionHealthMap = useMemo(
    () =>
      new Map(
        resolvedContinuityInsightCollections.map((collection) => [
          collection.id,
          buildContinuityCollectionHealth(
            collection,
            asArray(promotedContinuityInsightCheckpoints).filter(
              (item) => item.collectionId === collection.id
            )
          )
        ])
      ),
    [promotedContinuityInsightCheckpoints, resolvedContinuityInsightCollections]
  );
  const promotedContinuityCollectionCheckpoints = useMemo(
    () =>
      asArray(promotedContinuityInsightCheckpoints)
        .map((promotion) => {
          const collection =
            resolvedContinuityInsightCollections.find((item) => item.id === promotion.collectionId) || null;
          const checkpoint =
            collection?.checkpoints?.find((item) => item.id === promotion.checkpointId) || null;
          const report = continuityInsightReportMap.get(promotion.reportId) || null;

          return collection && checkpoint && report
            ? {
                ...promotion,
                collection,
                checkpoint,
                report
              }
            : null;
        })
        .filter(Boolean),
    [continuityInsightReportMap, promotedContinuityInsightCheckpoints, resolvedContinuityInsightCollections]
  );
  const pinnedContinuityInsightReports = useMemo(
    () =>
      pinnedContinuityInsightReportIds
        .map((reportId) => continuityInsightReportMap.get(reportId))
        .filter(Boolean),
    [continuityInsightReportMap, pinnedContinuityInsightReportIds]
  );
  const pinnedContinuityInsightCollections = useMemo(
    () =>
      pinnedContinuityInsightCollectionIds
        .map((collectionId) => resolvedContinuityInsightCollections.find((collection) => collection.id === collectionId))
        .filter(Boolean),
    [pinnedContinuityInsightCollectionIds, resolvedContinuityInsightCollections]
  );
  const pinnedContinuityComparisonPairs = useMemo(
    () =>
      pinnedContinuityInsightPairs
        .map((pair) => ({
          ...pair,
          primaryReport: continuityInsightReportMap.get(pair.primaryReportId) || null,
          comparisonReport: continuityInsightReportMap.get(pair.comparisonReportId) || null
        }))
        .filter((pair) => pair.primaryReport),
    [continuityInsightReportMap, pinnedContinuityInsightPairs]
  );
  const primaryContinuityInsightReport = useMemo(
    () =>
      continuityInsightReports.find((report) => report.id === continuityInsightPrimaryReportId) ||
      activeContinuityInsightReport ||
      continuityInsightReports[0] ||
      null,
    [activeContinuityInsightReport, continuityInsightPrimaryReportId, continuityInsightReports]
  );
  const comparisonContinuityInsightReport = useMemo(
    () =>
      continuityInsightReports.find(
        (report) =>
          report.id === continuityInsightComparisonReportId &&
          report.id !== (primaryContinuityInsightReport?.id || "")
      ) ||
      continuityInsightReports.find(
        (report) => report.id !== (primaryContinuityInsightReport?.id || activeContinuityInsightReport?.id || "")
      ) ||
      null,
    [
      activeContinuityInsightReport?.id,
      continuityInsightComparisonReportId,
      continuityInsightReports,
      primaryContinuityInsightReport?.id
    ]
  );
  const activeReplayQueueItems = useMemo(() => deriveQueueItems(activeReplayQueue, replayReviewMarks), [activeReplayQueue, replayReviewMarks]);
  const activeReplayQueueVerdicts = useMemo(
    () => deriveQueueVerdicts(activeReplayQueueItems),
    [activeReplayQueueItems]
  );
  const replayQueueRollups = useMemo(
    () =>
      replayQueues
        .map((queue) => buildQueueScoringRollup(queue, deriveQueueItems(queue, replayReviewMarks)))
        .filter(Boolean)
        .sort((left, right) => right.overall - left.overall),
    [replayQueues, replayReviewMarks]
  );
  const queueDrilldown = useMemo(() => {
    const primary = replayQueueRollups.find((queue) => queue.queueId === activeReplayQueueId) || replayQueueRollups[0] || null;
    const comparison = replayQueueRollups.find((queue) => queue.queueId !== primary?.queueId) || null;
    const primaryQueue = replayQueues.find((queue) => queue.id === primary?.queueId) || null;
    const comparisonQueue = replayQueues.find((queue) => queue.id === comparison?.queueId) || null;
    return buildQueueDrilldown(
      primary,
      comparison,
      deriveQueueItems(primaryQueue, replayReviewMarks),
      deriveQueueItems(comparisonQueue, replayReviewMarks)
    );
  }, [activeReplayQueueId, replayQueueRollups, replayQueues, replayReviewMarks]);
  const primaryDrilldownQueue = useMemo(
    () => replayQueues.find((queue) => queue.id === queueDrilldown?.primary?.queueId) || null,
    [queueDrilldown, replayQueues]
  );
  const comparisonDrilldownQueue = useMemo(
    () => replayQueues.find((queue) => queue.id === queueDrilldown?.comparison?.queueId) || null,
    [queueDrilldown, replayQueues]
  );
  const primaryDrilldownItems = useMemo(
    () => deriveQueueItems(primaryDrilldownQueue, replayReviewMarks),
    [primaryDrilldownQueue, replayReviewMarks]
  );
  const comparisonDrilldownItems = useMemo(
    () => deriveQueueItems(comparisonDrilldownQueue, replayReviewMarks),
    [comparisonDrilldownQueue, replayReviewMarks]
  );
  const handoffPreviewRows = useMemo(
    () =>
      buildHandoffPreviewRows(handoffImportPreview?.bundle, {
        activeReviewSnapshot: reviewSnapshots.find((item) => item.id === activeReviewSnapshotId) || null,
        activeReplayQueue,
        activeReplayQueueVerdicts,
        selectedSymbol,
        selectedRoute,
        activeWatchlist
      }),
    [activeReplayQueue, activeReplayQueueVerdicts, activeReviewSnapshotId, activeWatchlist, handoffImportPreview, reviewSnapshots, selectedRoute, selectedSymbol]
  );
  const symbolDrilldownRows = useMemo(
    () => finalizeSymbolPerformanceRows(primaryDrilldownItems, comparisonDrilldownItems),
    [comparisonDrilldownItems, primaryDrilldownItems]
  );
  const queueClusterSnapshots = useMemo(() => {
    return [
      {
        key: "primary",
        label: queueDrilldown?.primary?.queueName || "Primary Queue",
        tone: queueDrilldown?.primary?.tone || "info",
        watchlistClusters: buildQueueClusterSummary(primaryDrilldownItems, "watchlist"),
        intentClusters: buildQueueClusterSummary(primaryDrilldownItems, "intent"),
        qualityClusters: buildQueueClusterSummary(primaryDrilldownItems, "quality")
      },
      {
        key: "comparison",
        label: queueDrilldown?.comparison?.queueName || "Comparison Queue",
        tone: queueDrilldown?.comparison?.tone || "neutral",
        watchlistClusters: buildQueueClusterSummary(comparisonDrilldownItems, "watchlist"),
        intentClusters: buildQueueClusterSummary(comparisonDrilldownItems, "intent"),
        qualityClusters: buildQueueClusterSummary(comparisonDrilldownItems, "quality")
      }
    ];
  }, [comparisonDrilldownItems, primaryDrilldownItems, queueDrilldown]);
  const continuityTimelineRows = useMemo(
    () =>
      buildContinuityTimelineRows({
        handoffNotes,
        reviewSnapshots,
        replayQueues,
        continuityAlertHistory,
        replayReviewMarks,
        activeReviewSnapshotId,
        activeReplayQueueId,
        pinnedReviewSnapshotIds,
        pinnedReplayQueueIds,
        pinnedHandoffNoteIds
      }),
    [
      activeReplayQueueId,
      activeReviewSnapshotId,
      continuityAlertHistory,
      handoffNotes,
      pinnedHandoffNoteIds,
      pinnedReplayQueueIds,
      pinnedReviewSnapshotIds,
      replayReviewMarks,
      replayQueues,
      reviewSnapshots
    ]
  );
  const continuityTimelineOptions = useMemo(
    () => buildContinuityTimelineOptions(continuityTimelineRows, activeWatchlist),
    [activeWatchlist, continuityTimelineRows]
  );
  const filteredContinuityTimelineRows = useMemo(
    () => filterContinuityTimelineRows(continuityTimelineRows, activeWatchlist, timelineWatchlistFilter, timelineIntentFilter, timelineSymbolFilter),
    [activeWatchlist, continuityTimelineRows, timelineIntentFilter, timelineSymbolFilter, timelineWatchlistFilter]
  );

  useEffect(() => {
    if (!activeContinuityMacro) return;
    setTimelineWatchlistFilter(activeContinuityMacro.filters?.watchlist || "All Market Sets");
    setTimelineIntentFilter(activeContinuityMacro.filters?.sessionIntent || "All Intents");
    setTimelineSymbolFilter(activeContinuityMacro.filters?.symbol || "All Symbols");
  }, [activeContinuityMacro]);

  useEffect(() => {
    if (!activeContinuityInsightCollection?.id) return;
    setActivePlaybackCollectionId(activeContinuityInsightCollection.id);
    setCollectionPlaybackIndexes((current) =>
      current[activeContinuityInsightCollection.id] !== undefined
        ? current
        : { ...current, [activeContinuityInsightCollection.id]: 0 }
    );
  }, [activeContinuityInsightCollection?.id]);

  useEffect(() => {
    if (!activeContinuityInsightCollection?.id || !activeContinuityInsightReportId) return;
    const playbackFrames = buildContinuityCollectionPlaybackFrames(activeContinuityInsightCollection);
    const activeIndex = playbackFrames.findIndex((frame) => frame.id === activeContinuityInsightReportId);
    if (activeIndex < 0) return;

    setActivePlaybackCollectionId(activeContinuityInsightCollection.id);
    setCollectionPlaybackIndexes((current) =>
      current[activeContinuityInsightCollection.id] === activeIndex
        ? current
        : { ...current, [activeContinuityInsightCollection.id]: activeIndex }
    );
  }, [
    activeContinuityInsightCollection,
    activeContinuityInsightCollection?.id,
    activeContinuityInsightReportId
  ]);

  useEffect(() => {
    setCollectionNoteDrafts((current) => {
      const next = { ...current };
      resolvedContinuityInsightCollections.forEach((collection) => {
        if (next[collection.id] === undefined) {
          next[collection.id] = collection.notes || "";
        }
      });
      return next;
    });
  }, [resolvedContinuityInsightCollections]);

  useEffect(() => {
    setCollectionBundleSelections((current) => {
      const next = { ...current };
      resolvedContinuityInsightCollections.forEach((collection) => {
        const checkpointIds = asArray(collection.checkpoints).map((checkpoint) => checkpoint.id);
        const existingSelection = Array.isArray(next[collection.id]) ? next[collection.id] : null;
        next[collection.id] = existingSelection
          ? existingSelection.filter((checkpointId) => checkpointIds.includes(checkpointId))
          : checkpointIds;
      });
      return next;
    });
  }, [resolvedContinuityInsightCollections]);
  const queueDriftSummaryRows = useMemo(
    () =>
      buildQueueDriftSummaries(
        primaryDrilldownQueue,
        comparisonDrilldownQueue,
        queueDrilldown?.primary,
        queueDrilldown?.comparison,
        primaryDrilldownItems,
        comparisonDrilldownItems
      ),
    [comparisonDrilldownItems, comparisonDrilldownQueue, primaryDrilldownItems, primaryDrilldownQueue, queueDrilldown]
  );
  const importedQueueDriftComparisonRows = useMemo(
    () => buildImportedQueueDriftComparisonRows(queueDriftSummaryRows, importedDriftPack),
    [importedDriftPack, queueDriftSummaryRows]
  );
  const primarySavedBaseline = useMemo(
    () => queueDriftBaselines.find((baseline) => baseline.id === primaryBaselineId) || queueDriftBaselines[0] || null,
    [primaryBaselineId, queueDriftBaselines]
  );
  const comparisonSavedBaseline = useMemo(
    () =>
      queueDriftBaselines.find((baseline) => baseline.id === comparisonBaselineId) ||
      queueDriftBaselines.find((baseline) => baseline.id !== (primaryBaselineId || queueDriftBaselines[0]?.id)) ||
      null,
    [comparisonBaselineId, primaryBaselineId, queueDriftBaselines]
  );
  const savedBaselineComparisonRows = useMemo(
    () => buildSavedBaselineComparisonRows(primarySavedBaseline, comparisonSavedBaseline),
    [comparisonSavedBaseline, primarySavedBaseline]
  );
  const savedBaselineClusterRows = useMemo(
    () => buildBaselineClusterLaneRows(primarySavedBaseline, comparisonSavedBaseline),
    [comparisonSavedBaseline, primarySavedBaseline]
  );
  const continuityMacroAnalytics = useMemo(
    () => buildContinuityMacroAnalytics(continuityWorkspaceMacros),
    [continuityWorkspaceMacros]
  );
  const macroOutcomeCorrelationRows = useMemo(
    () => buildMacroOutcomeCorrelationRows(continuityWorkspaceMacros, replayQueues, replayReviewMarks),
    [continuityWorkspaceMacros, replayQueues, replayReviewMarks]
  );
  const continuityTrendFilterOptions = useMemo(
    () => buildContinuityTrendFilterOptions(continuityAlertHistory),
    [continuityAlertHistory]
  );
  const filteredContinuityTrendAlerts = useMemo(
    () => filterContinuityTrendAlerts(continuityAlertHistory, trendRouteFilter, trendProtectionFilter, trendSymbolFilter),
    [continuityAlertHistory, trendProtectionFilter, trendRouteFilter, trendSymbolFilter]
  );
  const continuitySymbolRollups = useMemo(
    () => buildContinuityAlertRollups(filteredContinuityTrendAlerts, (alert) => alert.symbol, "No symbol"),
    [filteredContinuityTrendAlerts]
  );
  const continuityRouteRollups = useMemo(
    () => buildContinuityAlertRollups(filteredContinuityTrendAlerts, (alert) => alert.route, "No route"),
    [filteredContinuityTrendAlerts]
  );
  const continuityProtectionRollups = useMemo(
    () => buildContinuityAlertRollups(filteredContinuityTrendAlerts, (alert) => alert.protectionState, "No protection posture"),
    [filteredContinuityTrendAlerts]
  );
  const continuityIntentRollups = useMemo(
    () => buildContinuityAlertRollups(filteredContinuityTrendAlerts, (alert) => alert.sessionIntent, "No intent"),
    [filteredContinuityTrendAlerts]
  );
  const continuityTrendSnapshots = useMemo(
    () => buildContinuityTrendSnapshots(filteredContinuityTrendAlerts),
    [filteredContinuityTrendAlerts]
  );
  const continuityInsightReasoning = useMemo(
    () =>
      buildContinuityInsightReasoning({
        macroOutcomeRows: macroOutcomeCorrelationRows,
        driftClusters: savedBaselineClusterRows,
        trendSnapshots: continuityTrendSnapshots
      }),
    [continuityTrendSnapshots, macroOutcomeCorrelationRows, savedBaselineClusterRows]
  );
  const continuityInsightDeltaRows = useMemo(
    () => buildContinuityInsightDeltaRows(primaryContinuityInsightReport, comparisonContinuityInsightReport),
    [comparisonContinuityInsightReport, primaryContinuityInsightReport]
  );
  const continuityInsightExecutionDrilldowns = useMemo(
    () => buildContinuityInsightExecutionDrilldowns(primaryContinuityInsightReport, comparisonContinuityInsightReport),
    [comparisonContinuityInsightReport, primaryContinuityInsightReport]
  );

  useEffect(() => {
    if (!continuityTimelineOptions.watchlists.includes(timelineWatchlistFilter)) {
      setTimelineWatchlistFilter("All Market Sets");
    }
    if (!continuityTimelineOptions.intents.includes(timelineIntentFilter)) {
      setTimelineIntentFilter("All Intents");
    }
    if (!continuityTimelineOptions.symbols.includes(timelineSymbolFilter)) {
      setTimelineSymbolFilter("All Symbols");
    }
  }, [continuityTimelineOptions, timelineIntentFilter, timelineSymbolFilter, timelineWatchlistFilter]);

  useEffect(() => {
    if (!continuityTrendFilterOptions.routes.includes(trendRouteFilter)) {
      setTrendRouteFilter("All Routes");
    }
    if (!continuityTrendFilterOptions.protections.includes(trendProtectionFilter)) {
      setTrendProtectionFilter("All Protection");
    }
    if (!continuityTrendFilterOptions.symbols.includes(trendSymbolFilter)) {
      setTrendSymbolFilter("All Symbols");
    }
  }, [continuityTrendFilterOptions, trendProtectionFilter, trendRouteFilter, trendSymbolFilter]);

  useEffect(() => {
    if (!continuityInsightReports.length) {
      if (continuityInsightPrimaryReportId || continuityInsightComparisonReportId) {
        setContinuityInsightComparisonPair("", "", { silent: true });
      }
      return;
    }

    const nextPrimaryReportId =
      continuityInsightReports.find((report) => report.id === continuityInsightPrimaryReportId)?.id ||
      activeContinuityInsightReportId ||
      continuityInsightReports[0]?.id ||
      "";
    const nextComparisonReportId =
      continuityInsightReports.find(
        (report) =>
          report.id === continuityInsightComparisonReportId &&
          report.id !== nextPrimaryReportId
      )?.id ||
      continuityInsightReports.find((report) => report.id !== nextPrimaryReportId)?.id ||
      "";

    if (
      nextPrimaryReportId !== continuityInsightPrimaryReportId ||
      nextComparisonReportId !== continuityInsightComparisonReportId
    ) {
      setContinuityInsightComparisonPair(nextPrimaryReportId, nextComparisonReportId, { silent: true });
    }
  }, [
    activeContinuityInsightReportId,
    continuityInsightComparisonReportId,
    continuityInsightPrimaryReportId,
    continuityInsightReports,
    setContinuityInsightComparisonPair
  ]);

  useEffect(() => {
    if (!activeContinuityInsightReport) return;
    setTrendRouteFilter(activeContinuityInsightReport.filters?.route || "All Routes");
    setTrendProtectionFilter(activeContinuityInsightReport.filters?.protectionState || "All Protection");
    setTrendSymbolFilter(activeContinuityInsightReport.filters?.symbol || "All Symbols");
    setPrimaryBaselineId(activeContinuityInsightReport.primaryBaselineId || "");
    setComparisonBaselineId(activeContinuityInsightReport.comparisonBaselineId || "");
  }, [
    activeContinuityInsightReport?.comparisonBaselineId,
    activeContinuityInsightReport?.filters?.protectionState,
    activeContinuityInsightReport?.filters?.route,
    activeContinuityInsightReport?.filters?.symbol,
    activeContinuityInsightReport?.id,
    activeContinuityInsightReport?.primaryBaselineId
  ]);

  useEffect(() => {
    if (filterWatchlistId === "all" || filterWatchlistId === "active") return;
    if (savedWatchlists.some((watchlist) => watchlist.id === filterWatchlistId)) return;
    setFilterWatchlistId("active");
  }, [filterWatchlistId, savedWatchlists]);

  useEffect(() => {
    if (!options.tags.includes(filterTag)) setFilterTag("All Tags");
    if (!options.intents.includes(filterIntent)) setFilterIntent("All Intents");
  }, [filterIntent, filterTag, options.intents, options.tags]);

  useEffect(() => {
    if (!activeReviewSnapshotId) return;
    const snapshot = reviewSnapshots.find((item) => item.id === activeReviewSnapshotId);
    if (!snapshot) return;
    setBaselinePack(snapshot.baselinePack);
    setComparisonPack(snapshot.comparisonPack);
  }, [activeReviewSnapshotId, reviewSnapshots]);

  useEffect(() => {
    if (!queueDriftBaselines.length) {
      setPrimaryBaselineId("");
      setComparisonBaselineId("");
      return;
    }

    if (!queueDriftBaselines.some((baseline) => baseline.id === primaryBaselineId)) {
      setPrimaryBaselineId(queueDriftBaselines[0]?.id || "");
    }

    if (!queueDriftBaselines.some((baseline) => baseline.id === comparisonBaselineId) || comparisonBaselineId === primaryBaselineId) {
      setComparisonBaselineId(
        queueDriftBaselines.find((baseline) => baseline.id !== (primaryBaselineId || queueDriftBaselines[0]?.id))?.id || ""
      );
    }
  }, [comparisonBaselineId, primaryBaselineId, queueDriftBaselines]);

  const filteredNotes = useMemo(
    () => filterRecords(sessionNotes, scope, filterWatchlistId, filterTag, filterIntent, (record) => record.symbol),
    [filterIntent, filterTag, filterWatchlistId, scope, sessionNotes]
  );
  const filteredActions = useMemo(
    () => filterRecords(recentActions, scope, filterWatchlistId, filterTag, filterIntent, (record) => record.symbol),
    [filterIntent, filterTag, filterWatchlistId, recentActions, scope]
  );
  const filteredOrders = useMemo(
    () => filterRecords(recentOrders, scope, filterWatchlistId, filterTag, filterIntent, (record) => record.symbol),
    [filterIntent, filterTag, filterWatchlistId, recentOrders, scope]
  );
  const filteredEvents = useMemo(
    () => filterRecords(executionEvents, scope, filterWatchlistId, filterTag, filterIntent, (record) => record.symbol),
    [executionEvents, filterIntent, filterTag, filterWatchlistId, scope]
  );
  const filteredAlerts = useMemo(
    () => filterRecords(controlledAlerts?.alerts || [], scope, filterWatchlistId, filterTag, filterIntent, (record) => record.symbol),
    [controlledAlerts?.alerts, filterIntent, filterTag, filterWatchlistId, scope]
  );
  const replayScores = useMemo(
    () =>
      buildReplayScoringSummary({
        notes: filteredNotes,
        actions: filteredActions,
        orders: filteredOrders,
        events: filteredEvents,
        alerts: filteredAlerts,
        activeWatchlist,
        selectedRoute,
        protectionState
      }),
    [activeWatchlist, filteredActions, filteredAlerts, filteredEvents, filteredNotes, filteredOrders, protectionState, selectedRoute]
  );
  const reviewSnapshot = useMemo(() => buildReviewSnapshot(baselinePack, comparisonPack), [baselinePack, comparisonPack]);
  function handleExportPack() {
    const payload = {
      product: "Trading Pro Max",
      kind: "journal-export-pack",
      version: "local-journal-pack-v1",
      exportedAt: new Date().toISOString(),
      scope: {
        watchlist: filterWatchlistId,
        tag: filterTag,
        sessionIntent: filterIntent,
        summary: scope.summary,
        activeWatchlistId,
        activeWatchlistName: activeWatchlist?.name || "",
        activeWatchlistContext: activeContext
      },
      runtime: {
        selectedSymbol,
        selectedRoute: selectedRoute?.name || "",
        protectionState,
        riskSummary,
        chartOverlaySummaries: chartOverlayModel?.summaries || []
      },
      replay: {
        notes: filteredNotes,
        actions: filteredActions,
        orders: filteredOrders,
        executionEvents: filteredEvents,
        alerts: filteredAlerts
      }
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(`trading-pro-max-journal-pack-${stamp}.json`, payload);
    setExportMessage("Filtered replay pack exported locally for operator review.");
  }

  async function handlePackLoad(target, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const pack = normalizeReplayPackPayload(JSON.parse(text));
      if (!pack) {
        throw new Error("That file is not a valid Trading Pro Max journal export pack.");
      }

      if (target === "baseline") {
        setBaselinePack(pack);
      } else {
        setComparisonPack(pack);
      }
      setReviewMessage(`${file.name} loaded as the ${target} replay snapshot.`);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Could not read the selected replay pack.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleHandoffImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const bundle = normalizeHandoffBundlePayload(JSON.parse(text));
      if (!bundle) {
        throw new Error("That file is not a valid Trading Pro Max handoff export bundle.");
      }

      setHandoffImportPreview({
        fileName: file.name,
        bundle
      });
      setReviewMessage(`${file.name} loaded for local diff review. Restore only if the continuity context looks correct.`);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Could not restore the selected handoff packet.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleQueueDriftImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const pack = normalizeQueueDriftSummaryPack(JSON.parse(text));
      if (!pack) {
        throw new Error("That file is not a valid Trading Pro Max queue drift summary pack.");
      }

      setImportedDriftPack({
        fileName: file.name,
        pack
      });
      setReviewMessage(`${file.name} loaded as a local queue drift baseline for safe compare review.`);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Could not read the selected queue drift pack.");
    } finally {
      event.target.value = "";
    }
  }

  function handleRestoreImportedHandoff(mode = "import-and-activate") {
    if (!handoffImportPreview?.bundle) return;
    importHandoffBundle(handoffImportPreview.bundle, mode);
    setReviewMessage(
      mode === "restore-only"
        ? `${handoffImportPreview.fileName || "Imported packet"} restored into the current desk without adding new continuity assets.`
        : mode === "import-only"
          ? `${handoffImportPreview.fileName || "Imported packet"} imported into local continuity memory without changing the active desk.`
          : `${handoffImportPreview.fileName || "Imported packet"} imported and activated in the local review context.`
    );
    setHandoffImportPreview(null);
  }

  function handleSaveSnapshot() {
    if (!baselinePack || !comparisonPack) return;
    const derivedName =
      String(snapshotName || "").trim() ||
      `${baselinePack.scope.watchlistLabel || "Baseline"} vs ${comparisonPack.scope.watchlistLabel || "Comparison"}`;
    saveReviewSnapshot(derivedName, baselinePack, comparisonPack);
    setSnapshotName("");
    setReviewMessage(`${derivedName} saved to local snapshot history.`);
  }

  function handleSaveContinuityPreset() {
    const derivedName =
      String(presetName || "").trim() ||
      `${timelineWatchlistFilter} | ${timelineIntentFilter} | ${timelineSymbolFilter}`;
    saveContinuityFilterPreset(derivedName, {
      watchlist: timelineWatchlistFilter,
      sessionIntent: timelineIntentFilter,
      symbol: timelineSymbolFilter
    });
    setPresetName("");
    setReviewMessage(`${derivedName} saved as a local continuity filter preset.`);
  }

  function handleApplyContinuityPreset(preset) {
    if (!preset) return;
    setTimelineWatchlistFilter(preset.watchlist || "All Market Sets");
    setTimelineIntentFilter(preset.sessionIntent || "All Intents");
    setTimelineSymbolFilter(preset.symbol || "All Symbols");
    setReviewMessage(`${preset.name} reopened the saved continuity filter view.`);
  }

  function handleRenameContinuityPreset() {
    if (!editingPresetId) return;
    renameContinuityFilterPreset(editingPresetId, editingPresetName);
    setReviewMessage(`${editingPresetName || "Continuity view"} was renamed locally.`);
    setEditingPresetId("");
    setEditingPresetName("");
  }

  function handleSaveContinuityMacro() {
    const derivedName =
      String(macroName || "").trim() ||
      `${activeWatchlist?.name || "Continuity"} | ${activeReplayQueue?.name || "Replay Queue"}`;
    const matchedPreset = continuityFilterPresets.find(
      (preset) =>
        preset.watchlist === timelineWatchlistFilter &&
        preset.sessionIntent === timelineIntentFilter &&
        preset.symbol === timelineSymbolFilter
    );

    saveContinuityWorkspaceMacro(derivedName, {
      presetId: matchedPreset?.id || "",
      filters: {
        watchlist: timelineWatchlistFilter,
        sessionIntent: timelineIntentFilter,
        symbol: timelineSymbolFilter
      },
      replayQueueId: activeReplayQueueId,
      sessionIntent: activeWatchlist?.sessionIntent || timelineIntentFilter
    });
    setMacroName("");
    setReviewMessage(`${derivedName} saved as a local continuity workspace macro.`);
  }

  function handleLaunchContinuityMacro(macro) {
    if (!macro) return;
    launchContinuityWorkspaceMacro(macro.id);
    setTimelineWatchlistFilter(macro.filters?.watchlist || "All Market Sets");
    setTimelineIntentFilter(macro.filters?.sessionIntent || "All Intents");
    setTimelineSymbolFilter(macro.filters?.symbol || "All Symbols");
    setReviewMessage(`${macro.name} reopened the saved local continuity workspace.`);
  }

  function handleRenameContinuityMacro() {
    if (!editingMacroId) return;
    renameContinuityWorkspaceMacro(editingMacroId, editingMacroName);
    setReviewMessage(`${editingMacroName || "Continuity macro"} was renamed locally.`);
    setEditingMacroId("");
    setEditingMacroName("");
  }

  function handleSaveContinuityInsightReport() {
    const derivedName =
      String(insightReportName || "").trim() ||
      `${activeWatchlist?.name || "Continuity"} | ${trendRouteFilter} | ${trendSymbolFilter}`;
    saveContinuityInsightReport(derivedName, {
      filters: {
        route: trendRouteFilter,
        protectionState: trendProtectionFilter,
        symbol: trendSymbolFilter
      },
      primaryBaselineId: primarySavedBaseline?.id || "",
      comparisonBaselineId: comparisonSavedBaseline?.id || "",
      macroAnalytics: continuityMacroAnalytics,
      driftClusters: savedBaselineClusterRows,
      trendSnapshots: continuityTrendSnapshots,
      executionContexts: {
        symbols: continuitySymbolRollups,
        routes: continuityRouteRollups,
        protections: continuityProtectionRollups
      },
      reasoning: continuityInsightReasoning
    });
    setInsightReportName("");
    setReviewMessage(`${derivedName} saved as a local continuity insight report.`);
  }

  function handleLoadContinuityInsightReport(report) {
    if (!report) return;
    loadContinuityInsightReport(report.id);
    setContinuityInsightComparisonPair(report.id, continuityInsightComparisonReportId, { silent: true });
    setReviewMessage(`${report.name} reopened the saved continuity insight context.`);
  }

  function handleRenameContinuityInsightReport() {
    if (!editingInsightReportId) return;
    renameContinuityInsightReport(editingInsightReportId, editingInsightReportName);
    setReviewMessage(`${editingInsightReportName || "Continuity insight report"} was renamed locally.`);
    setEditingInsightReportId("");
    setEditingInsightReportName("");
  }

  function handleExportContinuityInsightReport(report) {
    if (!report || !exportContinuityInsightReport(report)) return;
    setReviewMessage(`${report.name} exported as a local continuity insight report.`);
  }

  async function handleContinuityInsightImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const report = normalizeContinuityInsightReportPayload(JSON.parse(text));
      if (!report) {
        throw new Error("That file is not a valid Trading Pro Max continuity insight report.");
      }

      saveContinuityInsightReport(report.name, report);
      setReviewMessage(`${file.name} imported into the local continuity insight library and reopened as the active insight context.`);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Could not read the selected continuity insight report.");
    } finally {
      event.target.value = "";
    }
  }

  function toggleInsightCollectionDraftReport(reportId) {
    setInsightCollectionDraftReportIds((currentIds) =>
      currentIds.includes(reportId)
        ? currentIds.filter((id) => id !== reportId)
        : [...currentIds, reportId]
    );
  }

  function handleSaveContinuityInsightCollection() {
    const fallbackReportIds = [
      continuityInsightPrimaryReportId,
      continuityInsightComparisonReportId,
      activeContinuityInsightReportId
    ].filter(Boolean);
    const selectedReportIds = Array.from(
      new Set((insightCollectionDraftReportIds.length ? insightCollectionDraftReportIds : fallbackReportIds).filter(Boolean))
    );
    if (!selectedReportIds.length) {
      setReviewMessage("Save or import at least one continuity insight report before creating a collection.");
      return;
    }

    const derivedName =
      String(insightCollectionName || "").trim() ||
      `${activeWatchlist?.name || "Continuity"} Collection`;
    createContinuityInsightCollection(derivedName, { reportIds: selectedReportIds });
    setInsightCollectionName("");
    setInsightCollectionDraftReportIds([]);
    setReviewMessage(`${derivedName} saved as a local continuity insight collection.`);
  }

  function handleRenameContinuityInsightCollection() {
    if (!editingInsightCollectionId) return;
    renameContinuityInsightCollection(editingInsightCollectionId, editingInsightCollectionName);
    setReviewMessage(`${editingInsightCollectionName || "Insight collection"} was renamed locally.`);
    setEditingInsightCollectionId("");
    setEditingInsightCollectionName("");
  }

  function handleLoadContinuityInsightCollection(collection) {
    if (!collection) return;
    loadContinuityInsightCollection(collection.id);
    setActivePlaybackCollectionId(collection.id);
    setCollectionPlaybackIndexes((current) => ({ ...current, [collection.id]: 0 }));
    setReviewMessage(`${collection.name} reopened as the active continuity review set.`);
  }

  function handleExportContinuityInsightCollection(collection) {
    if (!collection) return;
    const health = continuityCollectionHealthMap.get(collection.id) || null;
    const playbackFrames = buildContinuityCollectionPlaybackFrames(collection);
    const selectedCheckpointIds = asArray(collectionBundleSelections[collection.id]);
    const selectedCheckpoints = asArray(collection.checkpoints).filter((checkpoint) =>
      selectedCheckpointIds.includes(checkpoint.id)
    );
    const effectiveCheckpoints = selectedCheckpoints.length ? selectedCheckpoints : asArray(collection.checkpoints);
    const checkpointContexts = effectiveCheckpoints
      .map((checkpoint) =>
        buildContinuityCollectionCheckpointContext(collection, checkpoint, playbackFrames, health)
      )
      .filter(Boolean);
    const bundleSummary = [
      `${collection.reports.length} reports`,
      `${effectiveCheckpoints.length} selected checkpoints`,
      collection.notes ? "collection notes included" : "",
      asArray(collection.noteHistory).length ? `${asArray(collection.noteHistory).length} note revisions` : "",
      health ? `${health.state} ${health.overall}/100` : ""
    ]
      .filter(Boolean)
      .join(" | ");

    if (
      !exportContinuityInsightCollectionPack(collection, collection.reports, {
        bundle: {
          mode: "checkpoint-aware-replay-bundle",
          summary: bundleSummary,
          collectionNotes: collection.notes || "",
          noteHistory: collection.noteHistory || [],
          selectedCheckpointIds: effectiveCheckpoints.map((checkpoint) => checkpoint.id),
          selectedCheckpoints: effectiveCheckpoints,
          checkpointContexts,
          health
        }
      })
    ) {
      return;
    }

    setReviewMessage(`${collection.name} exported as a checkpoint-aware local continuity bundle.`);
  }

  async function handleContinuityInsightCollectionImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const pack = normalizeContinuityInsightCollectionPackPayload(JSON.parse(text));
      if (!pack) {
        throw new Error("That file is not a valid Trading Pro Max continuity collection pack.");
      }

      setCollectionImportPreview({
        fileName: file.name,
        pack,
        preview: buildContinuityCollectionImportPreview(
          pack,
          continuityInsightReports,
          continuityInsightCollections
        )
      });
      setReviewMessage(`${file.name} loaded for local preview. Review the merge behavior before importing.`);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Could not read the selected continuity collection pack.");
    } finally {
      event.target.value = "";
    }
  }

  function handleConfirmContinuityInsightCollectionImport() {
    if (!collectionImportPreview?.pack) return;
    importContinuityInsightCollectionPack(collectionImportPreview.pack, { activate: true });
    setReviewMessage(`${collectionImportPreview.fileName || "Collection pack"} imported into the local continuity collection library and reopened for timeline review.`);
    setCollectionImportPreview(null);
  }

  function handleStepCollectionPlayback(collectionId, direction) {
    const collection = resolvedContinuityInsightCollections.find((item) => item.id === collectionId);
    const frames = buildContinuityCollectionPlaybackFrames(collection);
    if (!frames.length) return;

    setActivePlaybackCollectionId(collectionId);
    setCollectionPlaybackIndexes((current) => {
      const currentIndex = Number(current[collectionId] || 0);
      const nextIndex =
        direction === "next"
          ? Math.min(frames.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      return { ...current, [collectionId]: nextIndex };
    });
  }

  function handleOpenCollectionPlaybackFrame(collectionId, reportId) {
    const collection = resolvedContinuityInsightCollections.find((item) => item.id === collectionId);
    const frames = buildContinuityCollectionPlaybackFrames(collection);
    const frameIndex = frames.findIndex((frame) => frame.id === reportId);
    if (frameIndex === -1) return;

    loadContinuityInsightReport(reportId);
    setActivePlaybackCollectionId(collectionId);
    setCollectionPlaybackIndexes((current) => ({ ...current, [collectionId]: frameIndex }));
    setReviewMessage(`${frames[frameIndex].label} reopened from the collection timeline playback.`);
  }

  function handleSaveCollectionNotes(collection) {
    if (!collection) return;
    saveContinuityInsightCollectionNotes(collection.id, collectionNoteDrafts[collection.id] || "");
    setReviewMessage(`${collection.name} notes were saved for local continuity review.`);
  }

  function handleRestoreCollectionNoteRevision(collection, revision) {
    if (!collection || !revision) return;
    restoreContinuityInsightCollectionNoteRevision(collection.id, revision.id);
    setCollectionNoteDrafts((current) => ({
      ...current,
      [collection.id]: revision.note
    }));
    setReviewMessage(`${collection.name} restored a saved note revision.`);
  }

  function handleSaveCollectionCheckpoint(collection, frame) {
    if (!collection || !frame) return;
    const draft = collectionCheckpointDrafts[collection.id] || {};
    saveContinuityInsightCollectionCheckpoint(collection.id, frame.id, {
      label: draft.label || `${frame.label} checkpoint`,
      note: draft.note || frame.evolution
    });
    setCollectionCheckpointDrafts((current) => ({
      ...current,
      [collection.id]: { label: "", note: "" }
    }));
    setReviewMessage(`${frame.label} was pinned as a collection playback checkpoint.`);
  }

  function handleToggleCollectionBundleCheckpoint(collection, checkpoint) {
    if (!collection || !checkpoint) return;
    const key = String(checkpoint.id || "");
    const isSelected = asArray(collectionBundleSelections[collection.id]).includes(key);
    setCollectionBundleSelections((current) => ({
      ...current,
      [collection.id]: toggleCollectionSelection(current[collection.id], checkpoint.id)
    }));
    setReviewMessage(
      `${checkpoint.label} ${isSelected ? "was removed from" : "was added to"} the next local replay bundle.`
    );
  }

  function handleTogglePromotedCollectionCheckpoint(collection, checkpoint) {
    if (!collection || !checkpoint) return;
    const isPromoted = promotedContinuityCheckpointKeySet.has(`${collection.id}::${checkpoint.id}`);
    togglePromotedContinuityInsightCheckpoint(collection.id, checkpoint.id);
    setReviewMessage(
      `${checkpoint.label} ${
        isPromoted
          ? "was removed from shell favorites."
          : "was promoted into shell favorites for faster trust review."
      }`
    );
  }

  function handleOpenCollectionCheckpoint(collection, checkpoint) {
    if (!collection || !checkpoint) return;
    handleOpenCollectionPlaybackFrame(collection.id, checkpoint.reportId);
  }

  function handleOpenPromotedCollectionCheckpoint(promotion) {
    if (!promotion) return;
    openPromotedContinuityInsightCheckpoint(promotion.id);
    setReviewMessage(`${promotion.label} reopened from promoted continuity favorites.`);
  }

  function handleAddReportToInsightCollection(collectionId) {
    const reportId = String(collectionAddSelections[collectionId] || "");
    const report = continuityInsightReportMap.get(reportId);
    const collection = resolvedContinuityInsightCollections.find((item) => item.id === collectionId);
    if (!report) return;
    addContinuityInsightReportToCollection(collectionId, reportId);
    setCollectionAddSelections((current) => ({ ...current, [collectionId]: "" }));
    setReviewMessage(`${report.name} was added to ${collection?.name || "the selected continuity collection"}.`);
  }

  function handleRemoveReportFromInsightCollection(collection, report) {
    if (!collection || !report) return;
    removeContinuityInsightReportFromCollection(collection.id, report.id);
    setReviewMessage(`${report.name} was removed from ${collection.name}.`);
  }

  function handleSaveQueueDriftBaseline() {
    if (!importedDriftPack?.pack) return;
    const derivedName =
      String(baselineName || "").trim() ||
      importedDriftPack.pack?.primaryQueue?.name ||
      importedDriftPack.fileName ||
      "Drift Baseline";
    saveQueueDriftBaseline(derivedName, importedDriftPack);
    setBaselineName("");
    setReviewMessage(`${derivedName} saved to the local drift baseline library.`);
  }

  function handleLoadQueueDriftBaseline(baseline) {
    if (!baseline?.pack) return;
    setImportedDriftPack({
      fileName: baseline.fileName || baseline.name,
      pack: baseline.pack,
      baselineId: baseline.id
    });
    setReviewMessage(`${baseline.name} reopened as the current local drift baseline.`);
  }

  function handleRenameQueueDriftBaseline() {
    if (!editingBaselineId) return;
    renameQueueDriftBaseline(editingBaselineId, editingBaselineName);
    setReviewMessage(`${editingBaselineName || "Drift baseline"} was renamed locally.`);
    setEditingBaselineId("");
    setEditingBaselineName("");
  }

  function handleCreateQueue() {
    createReplayQueue(queueName);
    setQueueName("");
  }

  function handleSaveHandoff() {
    saveHandoffNote({
      comment: handoffComment,
      snapshotId: activeReviewSnapshotId,
      replayQueueId: activeReplayQueueId
    });
    setHandoffComment("");
  }

  function handleExportHandoff(note) {
    const bundle = buildHandoffExportBundle(note, {
      reviewSnapshots,
      replayQueues,
      replayReviewMarks,
      selectedSymbol,
      selectedRoute,
      protectionState,
      activeWatchlist,
      activeContext,
      chartOverlayModel
    });
    if (!bundle) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const watchlistLabel = sanitizeFilename(note.watchlistName, "market-set");
    downloadJson(`trading-pro-max-handoff-${watchlistLabel}-${stamp}.json`, bundle);
    setExportMessage(`${note.watchlistName || "Handoff packet"} exported locally as a review bundle.`);
  }

  function handleExportQueueDriftSummary() {
    const payload = buildQueueDriftExportSummary({
      primaryQueue: primaryDrilldownQueue,
      comparisonQueue: comparisonDrilldownQueue,
      queueDrilldown,
      queueDriftSummaryRows,
      symbolDrilldownRows,
      queueClusterSnapshots,
      activeWatchlist,
      selectedSymbol,
      selectedRoute,
      protectionState
    });
    if (!payload) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const primaryLabel = sanitizeFilename(primaryDrilldownQueue?.name, "primary-queue");
    const comparisonLabel = sanitizeFilename(comparisonDrilldownQueue?.name, "comparison-queue");
    downloadJson(`trading-pro-max-queue-drift-${primaryLabel}-vs-${comparisonLabel}-${stamp}.json`, payload);
    setReviewMessage(`${primaryDrilldownQueue?.name || "Primary queue"} drift summary exported locally.`);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={moduleHeroStyle("slate")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ ...moduleInsetStyle("slate", 16), minHeight: 154 }}>
            <div style={sectionLabelStyle("#cbd5e1")}>Session Memory</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 10 }}>{selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.65 }}>
              {selectedRoute?.name || "No active route"} memory lane with notes, actions, execution replay, and feed context.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <ProductPill label={`${sessionNotes.length} Notes`} tone="info" />
              <ProductPill label={`${recentOrders.length} Orders`} tone="warning" />
              <ProductPill label={executionStatus?.label || "Execution offline"} tone={executionStatus?.tone || "warning"} />
            </div>
          </div>
          <div style={moduleInsetStyle("info", 16)}>
            <div style={sectionLabelStyle()}>Active Market Set</div>
            <div style={{ ...monoValueStyle("info", 22), marginTop: 10 }}>{activeWatchlist?.name || "No active set"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{activeContext.notesPreview}</div>
            {activeContext.sessionIntent ? <div style={{ color: deskTheme.colors.sky, marginTop: 8 }}>Intent: {activeContext.sessionIntent}</div> : null}
          </div>
          <div style={moduleInsetStyle("warning", 16)}>
            <div style={sectionLabelStyle()}>Replay Scope</div>
            <div style={{ ...monoValueStyle("warning", 22), marginTop: 10 }}>{scope.summary}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
              {filteredOrders.length} orders, {filteredEvents.length} execution events, {filteredAlerts.length} alerts in scope.
            </div>
          </div>
          <div style={moduleInsetStyle("success", 16)}>
            <div style={sectionLabelStyle()}>Export Packs</div>
            <div style={{ ...monoValueStyle("success", 22), marginTop: 10 }}>Local Only</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>Filtered review packs stay local and useful for operator handoffs.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" onClick={handleExportPack} style={exportButtonStyle()}>
                Export Replay Pack
              </button>
              <button type="button" onClick={() => handoffImportRef.current?.click()} style={exportButtonStyle("neutral")}>
                Import Handoff Packet
              </button>
            </div>
            <input
              ref={handoffImportRef}
              type="file"
              accept="application/json"
              onChange={handleHandoffImport}
              style={{ display: "none" }}
            />
            {exportMessage ? <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{exportMessage}</div> : null}
          </div>
        </div>
      </section>

      <ProductInfinityBrief
        title="Product Memory Ledger"
        subtitle="Journal Vault now reads the same orchestrator memory, improvement trail, and guarded recovery history that power the control room."
        accent="neutral"
        preferredGoalKey="ux-product-polish"
        compact
      />

      <section style={modulePanelStyle("warning")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Replay Filters</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>Operator Review Scope</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Filter local replay by market set, tag, and session intent.</div>
          </div>
          <ProductPill label={scope.summary} tone="warning" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={sectionLabelStyle()}>Market Set</span>
            <select value={filterWatchlistId} onChange={(event) => setFilterWatchlistId(event.target.value)} style={fieldStyle()}>
              {options.watchlists.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={sectionLabelStyle()}>Tag</span>
            <select value={filterTag} onChange={(event) => setFilterTag(event.target.value)} style={fieldStyle()}>
              {options.tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={sectionLabelStyle()}>Session Intent</span>
            <select value={filterIntent} onChange={(event) => setFilterIntent(event.target.value)} style={fieldStyle()}>
              {options.intents.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <ProductPill label={`${filteredNotes.length} Notes`} tone="info" />
          <ProductPill label={`${filteredActions.length} Actions`} tone="neutral" />
          <ProductPill label={`${filteredOrders.length} Orders`} tone="success" />
          <ProductPill label={`${filteredEvents.length} Events`} tone="warning" />
          <ProductPill label={`${filteredAlerts.length} Alerts`} tone={filteredAlerts.length ? "danger" : "success"} />
        </div>

        {handoffImportPreview ? (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={sectionLabelStyle()}>Imported Handoff Diff</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{handoffImportPreview.fileName || "Imported packet"}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                  Review the imported packet against the current desk context before choosing how to merge it.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => handleRestoreImportedHandoff("restore-only")} style={exportButtonStyle("neutral")}>
                  Restore Only
                </button>
                <button type="button" onClick={() => handleRestoreImportedHandoff("import-only")} style={exportButtonStyle()}>
                  Import Only
                </button>
                <button type="button" onClick={() => handleRestoreImportedHandoff("import-and-activate")} style={exportButtonStyle("success")}>
                  Import & Activate
                </button>
                <button type="button" onClick={() => setHandoffImportPreview(null)} style={exportButtonStyle("neutral")}>
                  Clear Preview
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {handoffPreviewRows.map((row) => (
                <div key={row.key} style={moduleInsetStyle(row.changed ? "warning" : "info", 14)}>
                  <div style={sectionLabelStyle()}>{row.label}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12 }}>Current</div>
                  <div style={{ fontWeight: 900, marginTop: 4 }}>{row.current}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 10, fontSize: 12 }}>Imported</div>
                  <div style={{ fontWeight: 900, marginTop: 4 }}>{row.imported}</div>
                  <div style={{ marginTop: 10 }}>
                    <ProductPill label={row.changed ? "Different" : "Matches"} tone={row.changed ? "warning" : "success"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section style={modulePanelStyle("info")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Replay Scoring</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>Operator Quality Scoreboard</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              Local paper replay scoring for order quality, protection adherence, route discipline, and session consistency.
            </div>
          </div>
          <ProductPill label={activeWatchlist?.name || "Active Market Set"} tone="info" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
          {replayScores.map((score) => (
            <div key={score.key} style={moduleInsetStyle(score.tone, 14)}>
              <div style={sectionLabelStyle()}>{score.label}</div>
              <div style={{ ...monoValueStyle("info", 26), marginTop: 8 }}>{score.score}</div>
              <div style={{ marginTop: 10 }}>
                <ProductPill label={score.label ? scoreMeta(score.score).label : "Stable"} tone={score.tone} />
              </div>
              <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{score.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={modulePanelStyle("neutral")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Review Snapshots</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>Pack Vs Pack Comparison</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              Load two local replay packs to compare market set, tag, session intent, and replay outcomes side by side.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => baselineInputRef.current?.click()} style={exportButtonStyle("neutral")}>
              Load Baseline Pack
            </button>
            <button type="button" onClick={() => comparisonInputRef.current?.click()} style={exportButtonStyle("success")}>
              Load Comparison Pack
            </button>
          </div>
        </div>

        <input
          ref={baselineInputRef}
          type="file"
          accept="application/json"
          onChange={(event) => handlePackLoad("baseline", event)}
          style={{ display: "none" }}
        />
        <input
          ref={comparisonInputRef}
          type="file"
          accept="application/json"
          onChange={(event) => handlePackLoad("comparison", event)}
          style={{ display: "none" }}
        />

        {reviewMessage ? <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{reviewMessage}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 14 }}>
          <input
            value={snapshotName}
            onChange={(event) => setSnapshotName(event.target.value)}
            placeholder="Save current comparison as a named baseline"
            style={fieldStyle()}
          />
          <button
            type="button"
            onClick={handleSaveSnapshot}
            disabled={!baselinePack || !comparisonPack}
            style={{
              ...exportButtonStyle("info"),
              opacity: baselinePack && comparisonPack ? 1 : 0.45,
              cursor: baselinePack && comparisonPack ? "pointer" : "not-allowed"
            }}
          >
            Save Snapshot
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          {[{ label: "Baseline", pack: baselinePack, tone: "neutral" }, { label: "Comparison", pack: comparisonPack, tone: "success" }].map((item) => (
            <div key={item.label} style={moduleInsetStyle(item.tone, 14)}>
              <div style={sectionLabelStyle()}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginTop: 8 }}>{item.pack?.scope.watchlistLabel || "No pack loaded"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                {item.pack
                  ? `${item.pack.scope.tag} | ${item.pack.scope.sessionIntent} | ${item.pack.exportedAt || "No export time"}`
                  : "Load a local replay pack to compare operator review outcomes."}
              </div>
            </div>
          ))}
        </div>

        {reviewSnapshot ? (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {reviewSnapshot.scopeRows.map((row) => (
                <div key={row.label} style={moduleInsetStyle(row.changed ? "warning" : "info", 14)}>
                  <div style={sectionLabelStyle()}>{row.label}</div>
                  <div style={{ fontWeight: 900, marginTop: 8 }}>{row.baseline}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>vs {row.comparison}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {reviewSnapshot.metrics.map((metric) => (
                <div key={metric.label} style={moduleInsetStyle(metric.tone, 14)}>
                  <div style={sectionLabelStyle()}>{metric.label}</div>
                  <div style={{ ...monoValueStyle("info", 24), marginTop: 8 }}>{metric.comparison}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Baseline {metric.baseline}</div>
                  <div style={{ marginTop: 10 }}>
                    <ProductPill label={metric.summary} tone={metric.tone} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {reviewSnapshots.length ? (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <div style={sectionLabelStyle()}>Saved Snapshot History</div>
            {reviewSnapshots.slice(0, 8).map((snapshot) => (
              <div key={snapshot.id} style={moduleInsetStyle("neutral", 14)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{snapshot.name}</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{snapshot.summary}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        loadReviewSnapshot(snapshot.id);
                        setBaselinePack(snapshot.baselinePack);
                        setComparisonPack(snapshot.comparisonPack);
                        setReviewMessage(`${snapshot.name} restored from local snapshot history.`);
                      }}
                      style={exportButtonStyle("success")}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePinnedReviewSnapshot(snapshot.id)}
                      style={exportButtonStyle(pinnedReviewSnapshotIds.includes(snapshot.id) ? "warning" : "neutral")}
                    >
                      {pinnedReviewSnapshotIds.includes(snapshot.id) ? "Pinned" : "Pin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReviewSnapshot(snapshot.id)}
                      style={exportButtonStyle("neutral")}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <ProductPill label={snapshot.baselinePack?.scope?.watchlistLabel || "Baseline"} tone="neutral" />
                  <ProductPill label={snapshot.comparisonPack?.scope?.watchlistLabel || "Comparison"} tone="info" />
                  <ProductPill label={snapshot.savedAt || "Saved locally"} tone="warning" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section style={modulePanelStyle("warning")}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={sectionLabelStyle()}>Replay Queues</div>
              <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.7, marginTop: 8 }}>Named Review Sets</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                Group bookmarked replay items into local named queues for structured operator review.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10 }}>
              <input
                value={queueName}
                onChange={(event) => setQueueName(event.target.value)}
                placeholder="Create a replay queue"
                style={fieldStyle()}
              />
              <button type="button" onClick={handleCreateQueue} style={exportButtonStyle("warning")}>
                Create Queue
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {replayQueues.length ? (
                replayQueues.slice(0, 8).map((queue) => {
                  const queueItems = deriveQueueItems(queue, replayReviewMarks);
                  const queueVerdicts = deriveQueueVerdicts(queueItems);
                  const isEditing = editingQueueId === queue.id;

                  return (
                    <div key={queue.id} style={moduleInsetStyle(queue.id === activeReplayQueueId ? "warning" : "neutral", 14)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          {isEditing ? (
                            <input value={editingQueueName} onChange={(event) => setEditingQueueName(event.target.value)} style={fieldStyle()} />
                          ) : (
                            <div style={{ fontWeight: 900 }}>{queue.name}</div>
                          )}
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                            {queueItems.length} items queued for local replay review.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {queue.id === activeReplayQueueId ? <ProductPill label="Active Queue" tone="warning" /> : null}
                          {queueVerdicts.map((verdict) => (
                            <ProductPill key={`${queue.id}-${verdict}`} label={formatVerdictLabel(verdict)} tone="info" />
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                renameReplayQueue(queue.id, editingQueueName);
                                setEditingQueueId("");
                                setEditingQueueName("");
                              }}
                              style={reviewToggleStyle(true, "success")}
                            >
                              Save Name
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQueueId("");
                                setEditingQueueName("");
                              }}
                              style={reviewToggleStyle(false, "neutral")}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setActiveReplayQueue(queue.id)} style={reviewToggleStyle(queue.id === activeReplayQueueId, "warning")}>
                              {queue.id === activeReplayQueueId ? "Queue Active" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePinnedReplayQueue(queue.id)}
                              style={reviewToggleStyle(pinnedReplayQueueIds.includes(queue.id), "info")}
                            >
                              {pinnedReplayQueueIds.includes(queue.id) ? "Pinned" : "Pin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQueueId(queue.id);
                                setEditingQueueName(queue.name);
                              }}
                              style={reviewToggleStyle(false, "neutral")}
                            >
                              Rename
                            </button>
                            <button type="button" onClick={() => removeReplayQueue(queue.id)} style={reviewToggleStyle(false, "danger")}>
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={moduleInsetStyle("neutral", 14)}>
                  <div style={{ color: deskTheme.colors.soft }}>No replay queues yet. Create one, then add replay items from the review cards below.</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={moduleInsetStyle("success", 14)}>
              <div style={sectionLabelStyle()}>Queue Scoring Rollups</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {activeReplayQueue?.name || "No Active Queue"}
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Compare local replay queues by discipline, risk posture, replay outcome quality, and consistency.
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {replayQueueRollups.length ? (
                  replayQueueRollups.slice(0, 5).map((queue) => (
                    <div key={queue.queueId} style={moduleInsetStyle(queue.queueId === activeReplayQueueId ? "warning" : queue.tone, 12)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{queue.queueName}</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{queue.summary}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ ...monoValueStyle("info", 22) }}>{queue.overall}</div>
                          <ProductPill label={queue.state} tone={queue.tone} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                        {queue.metrics.map((metric) => (
                          <div key={`${queue.queueId}-${metric.key}`} style={moduleInsetStyle(metric.tone, 10)}>
                            <div style={sectionLabelStyle()}>{metric.label}</div>
                            <div style={{ ...monoValueStyle("info", 18), marginTop: 6 }}>{metric.score}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: deskTheme.colors.soft }}>Create a replay queue to unlock queue-level scoring and comparison.</div>
                )}
              </div>
            </div>

            <div style={moduleInsetStyle("warning", 14)}>
              <div style={sectionLabelStyle()}>Review Drilldowns</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {queueDrilldown?.primary?.queueName || "Queue comparison unavailable"}
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Compare verdict-tag patterns, replay-score shifts, and queue-level performance changes across saved local review sets.
              </div>
              {queueDrilldown ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button type="button" onClick={handleExportQueueDriftSummary} style={exportButtonStyle("success")}>
                    Export Drift Summary
                  </button>
                  <button type="button" onClick={() => driftImportRef.current?.click()} style={exportButtonStyle("neutral")}>
                    Import Drift Pack
                  </button>
                  {importedDriftPack ? (
                    <button type="button" onClick={() => setImportedDriftPack(null)} style={exportButtonStyle("neutral")}>
                      Clear Imported Baseline
                    </button>
                  ) : null}
                  <input
                    ref={driftImportRef}
                    type="file"
                    accept="application/json"
                    onChange={handleQueueDriftImport}
                    style={{ display: "none" }}
                  />
                </div>
              ) : null}
              {queueDrilldown ? (
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    <div style={moduleInsetStyle(queueDrilldown.primary.tone, 10)}>
                      <div style={sectionLabelStyle()}>Primary Queue</div>
                      <div style={{ fontWeight: 900, marginTop: 6 }}>{queueDrilldown.primary.queueName}</div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{queueDrilldown.primary.summary}</div>
                    </div>
                    <div style={moduleInsetStyle(queueDrilldown.comparison ? queueDrilldown.comparison.tone : "neutral", 10)}>
                      <div style={sectionLabelStyle()}>Comparison Queue</div>
                      <div style={{ fontWeight: 900, marginTop: 6 }}>{queueDrilldown.comparison?.queueName || "No comparison queue"}</div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                        {queueDrilldown.comparison?.summary || "Create or activate another replay queue to compare review sets."}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    {queueDrilldown.metricShifts.map((metric) => (
                      <div key={metric.key} style={moduleInsetStyle(metric.tone, 10)}>
                        <div style={sectionLabelStyle()}>{metric.label}</div>
                        <div style={{ ...monoValueStyle("info", 18), marginTop: 6 }}>{metric.primary}</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Comparison {metric.comparison}</div>
                        <div style={{ marginTop: 8 }}>
                          <ProductPill label={metric.summary} tone={metric.tone} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                    {queueDrilldown.verdictPatterns.map((pattern) => (
                      <div key={pattern.key} style={moduleInsetStyle(pattern.tone, 10)}>
                        <div style={sectionLabelStyle()}>{pattern.label}</div>
                        <div style={{ fontWeight: 900, marginTop: 6 }}>{pattern.primary}</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Comparison {pattern.comparison}</div>
                        <div style={{ marginTop: 8 }}>
                          <ProductPill label={pattern.summary} tone={pattern.tone} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
                    {queueDriftSummaryRows.map((metric) => (
                      <div key={metric.key} style={moduleInsetStyle(metric.tone, 10)}>
                        <div style={sectionLabelStyle()}>{metric.label}</div>
                        <div style={{ ...monoValueStyle("info", 18), marginTop: 6 }}>{metric.primary}</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{metric.detail}</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Comparison {metric.comparison} | {metric.comparisonDetail}</div>
                        <div style={{ marginTop: 8 }}>
                          <ProductPill label={metric.summary} tone={metric.tone} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {importedDriftPack ? (
                    <div style={moduleInsetStyle("info", 12)}>
                      <div style={sectionLabelStyle()}>Imported Drift Baseline</div>
                      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>
                        {importedDriftPack.fileName || importedDriftPack.pack?.primaryQueue?.name || "Imported drift pack"}
                      </div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                        {importedDriftPack.pack?.primaryQueue?.name || "Primary queue"} vs {importedDriftPack.pack?.comparisonQueue?.name || "No comparison queue"} | {importedDriftPack.pack?.exportedAt || "No export time"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8, marginTop: 12 }}>
                        {importedQueueDriftComparisonRows.map((metric) => (
                          <div key={`imported-${metric.key}`} style={moduleInsetStyle(metric.tone, 10)}>
                            <div style={sectionLabelStyle()}>{metric.label}</div>
                            <div style={{ ...monoValueStyle("info", 18), marginTop: 6 }}>{metric.current}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{metric.detail}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Imported baseline {metric.baseline} | {metric.baselineDetail}</div>
                            <div style={{ marginTop: 8 }}>
                              <ProductPill label={metric.summary} tone={metric.tone} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div style={moduleInsetStyle("success", 12)}>
                    <div style={sectionLabelStyle()}>Drift Baseline Library</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                      Save imported drift packs into a reusable local baseline library, then reopen them for side-by-side queue comparison without reimporting files.
                    </div>
                    {importedDriftPack ? (
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 12 }}>
                        <input
                          value={baselineName}
                          onChange={(event) => setBaselineName(event.target.value)}
                          placeholder="Save the imported drift pack as a named baseline"
                          style={fieldStyle()}
                        />
                        <button type="button" onClick={handleSaveQueueDriftBaseline} style={exportButtonStyle("success")}>
                          Save Baseline
                        </button>
                      </div>
                    ) : null}
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      {queueDriftBaselines.length ? (
                        queueDriftBaselines.slice(0, 8).map((baseline) => {
                          const isEditing = editingBaselineId === baseline.id;
                          return (
                            <div key={baseline.id} style={moduleInsetStyle("neutral", 10)}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <div>
                                  {isEditing ? (
                                    <input value={editingBaselineName} onChange={(event) => setEditingBaselineName(event.target.value)} style={fieldStyle()} />
                                  ) : (
                                    <div style={{ fontWeight: 900 }}>{baseline.name}</div>
                                  )}
                                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                    {baseline.primaryQueueName} vs {baseline.comparisonQueueName} | {baseline.exportedAt || "Saved locally"}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {isEditing ? (
                                    <>
                                      <button type="button" onClick={handleRenameQueueDriftBaseline} style={exportButtonStyle("success")}>
                                        Save Name
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingBaselineId("");
                                          setEditingBaselineName("");
                                        }}
                                        style={exportButtonStyle("neutral")}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button type="button" onClick={() => handleLoadQueueDriftBaseline(baseline)} style={exportButtonStyle("info")}>
                                        Compare
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPrimaryBaselineId(baseline.id)}
                                        style={exportButtonStyle(primarySavedBaseline?.id === baseline.id ? "warning" : "neutral")}
                                      >
                                        {primarySavedBaseline?.id === baseline.id ? "Left Lane" : "Set Left"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setComparisonBaselineId(baseline.id)}
                                        style={exportButtonStyle(comparisonSavedBaseline?.id === baseline.id ? "warning" : "neutral")}
                                      >
                                        {comparisonSavedBaseline?.id === baseline.id ? "Right Lane" : "Set Right"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingBaselineId(baseline.id);
                                          setEditingBaselineName(baseline.name);
                                        }}
                                        style={exportButtonStyle("neutral")}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          removeQueueDriftBaseline(baseline.id);
                                          setReviewMessage(`${baseline.name} was removed from the local drift baseline library.`);
                                        }}
                                        style={exportButtonStyle("neutral")}
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ color: deskTheme.colors.soft }}>
                          Import a queue drift pack, then save it into the local library for reusable baseline compare.
                        </div>
                      )}
                    </div>

                    {primarySavedBaseline && comparisonSavedBaseline ? (
                      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                        <div style={sectionLabelStyle()}>Baseline-To-Baseline Comparison Lanes</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={sectionLabelStyle()}>Left Lane</span>
                            <select value={primarySavedBaseline?.id || ""} onChange={(event) => setPrimaryBaselineId(event.target.value)} style={fieldStyle()}>
                              {queueDriftBaselines.map((baseline) => (
                                <option key={`left-${baseline.id}`} value={baseline.id}>
                                  {baseline.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={sectionLabelStyle()}>Right Lane</span>
                            <select value={comparisonSavedBaseline?.id || ""} onChange={(event) => setComparisonBaselineId(event.target.value)} style={fieldStyle()}>
                              <option value="">Select comparison baseline</option>
                              {queueDriftBaselines
                                .filter((baseline) => baseline.id !== primarySavedBaseline?.id)
                                .map((baseline) => (
                                  <option key={`right-${baseline.id}`} value={baseline.id}>
                                    {baseline.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                          <div style={moduleInsetStyle("info", 10)}>
                            <div style={sectionLabelStyle()}>Left Baseline</div>
                            <div style={{ fontWeight: 900, marginTop: 6 }}>{primarySavedBaseline.name}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                              {primarySavedBaseline.primaryQueueName} vs {primarySavedBaseline.comparisonQueueName}
                            </div>
                          </div>
                          <div style={moduleInsetStyle("warning", 10)}>
                            <div style={sectionLabelStyle()}>Right Baseline</div>
                            <div style={{ fontWeight: 900, marginTop: 6 }}>{comparisonSavedBaseline.name}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                              {comparisonSavedBaseline.primaryQueueName} vs {comparisonSavedBaseline.comparisonQueueName}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                          {savedBaselineComparisonRows.map((metric) => (
                            <div key={`saved-baseline-${metric.key}`} style={moduleInsetStyle(metric.tone, 10)}>
                              <div style={sectionLabelStyle()}>{metric.label}</div>
                              <div style={{ ...monoValueStyle("info", 18), marginTop: 6 }}>{metric.primary}</div>
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{metric.detail}</div>
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                Right lane {metric.comparison} | {metric.comparisonDetail}
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <ProductPill label={metric.summary} tone={metric.tone} />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={sectionLabelStyle()}>Cluster Compare Lanes</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
                            {savedBaselineClusterRows.map((lane) => (
                              <div key={`saved-baseline-cluster-${lane.key}`} style={moduleInsetStyle(lane.tone, 10)}>
                                <div style={sectionLabelStyle()}>{lane.label}</div>
                                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{primarySavedBaseline.name}</div>
                                <div style={{ marginTop: 6, lineHeight: 1.6 }}>{lane.primary}</div>
                                <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>{comparisonSavedBaseline.name}</div>
                                <div style={{ marginTop: 6, lineHeight: 1.6 }}>{lane.comparison}</div>
                                <div style={{ marginTop: 10 }}>
                                  <ProductPill label={lane.summary} tone={lane.tone} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>Build at least one replay queue to unlock deeper comparison drilldowns.</div>
              )}
            </div>

            <div style={moduleInsetStyle("neutral", 14)}>
              <div style={sectionLabelStyle()}>Symbol Drilldowns</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Symbol-By-Symbol Replay Quality
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Review symbol performance patterns, verdict concentration, replay-score shifts, and protection or risk context inside the active queue.
              </div>
              {symbolDrilldownRows.length ? (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {symbolDrilldownRows.map((row) => (
                    <div key={row.symbol} style={moduleInsetStyle(row.tone, 12)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{row.symbol}</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                            {row.itemCount} replay items | {row.routeContext}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ ...monoValueStyle("info", 22) }}>{row.primaryScore}</div>
                          <ProductPill label={row.delta === 0 ? "No shift" : `${row.delta > 0 ? "+" : ""}${row.delta} vs comparison`} tone={row.tone} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 12 }}>
                        <div style={moduleInsetStyle("info", 10)}>
                          <div style={sectionLabelStyle()}>Verdict Pattern</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{row.verdictPattern}</div>
                        </div>
                        <div style={moduleInsetStyle(row.tone, 10)}>
                          <div style={sectionLabelStyle()}>Risk Context</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{row.riskContext}</div>
                        </div>
                        <div style={moduleInsetStyle("neutral", 10)}>
                          <div style={sectionLabelStyle()}>Status Context</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{row.statusContext}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>Add replay items to a queue to unlock symbol-level review intelligence.</div>
              )}
            </div>

            <div style={moduleInsetStyle("info", 14)}>
              <div style={sectionLabelStyle()}>Queue Comparison Snapshots</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Multi-Symbol Cluster View
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Compare side-by-side symbol clusters by market set, session intent, and replay outcome quality across the active review queues.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
                {queueClusterSnapshots.map((snapshot) => (
                  <div key={snapshot.key} style={moduleInsetStyle(snapshot.tone, 12)}>
                    <div style={{ fontWeight: 900 }}>{snapshot.label}</div>

                    <div style={{ marginTop: 12 }}>
                      <div style={sectionLabelStyle()}>Market Set Clusters</div>
                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {snapshot.watchlistClusters.length ? (
                          snapshot.watchlistClusters.map((cluster) => (
                            <div key={`${snapshot.key}-${cluster.label}`} style={moduleInsetStyle("neutral", 10)}>
                              <div style={{ fontWeight: 800 }}>{cluster.label}</div>
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{cluster.detail}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No watchlist cluster data yet.</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={sectionLabelStyle()}>Session Intent Clusters</div>
                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {snapshot.intentClusters.length ? (
                          snapshot.intentClusters.map((cluster) => (
                            <div key={`${snapshot.key}-intent-${cluster.label}`} style={moduleInsetStyle("neutral", 10)}>
                              <div style={{ fontWeight: 800 }}>{cluster.label}</div>
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{cluster.detail}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No session-intent cluster data yet.</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={sectionLabelStyle()}>Outcome Quality Clusters</div>
                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {snapshot.qualityClusters.length ? (
                          snapshot.qualityClusters.map((cluster) => (
                            <div key={`${snapshot.key}-quality-${cluster.label}`} style={moduleInsetStyle("neutral", 10)}>
                              <div style={{ fontWeight: 800 }}>{cluster.label}</div>
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{cluster.detail}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No quality cluster data yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={moduleInsetStyle("success", 14)}>
              <div style={sectionLabelStyle()}>Continuity Timeline</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Session-To-Session Review Evolution
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Track how handoff packets, snapshots, and replay queues evolved across the local review history.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 12 }}>
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Save the current continuity filters as a preset"
                  style={fieldStyle()}
                />
                <button type="button" onClick={handleSaveContinuityPreset} style={exportButtonStyle("success")}>
                  Save View
                </button>
              </div>
              {continuityFilterPresets.length ? (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {continuityFilterPresets.slice(0, 8).map((preset) => {
                    const isEditing = editingPresetId === preset.id;
                    return (
                      <div key={preset.id} style={moduleInsetStyle("neutral", 12)}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <div>
                            {isEditing ? (
                              <input value={editingPresetName} onChange={(event) => setEditingPresetName(event.target.value)} style={fieldStyle()} />
                            ) : (
                              <div style={{ fontWeight: 900 }}>{preset.name}</div>
                            )}
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                              {preset.watchlist} | {preset.sessionIntent} | {preset.symbol}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {isEditing ? (
                              <>
                                <button type="button" onClick={handleRenameContinuityPreset} style={exportButtonStyle("success")}>
                                  Save Name
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPresetId("");
                                    setEditingPresetName("");
                                  }}
                                  style={exportButtonStyle("neutral")}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => handleApplyContinuityPreset(preset)} style={exportButtonStyle("info")}>
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPresetId(preset.id);
                                    setEditingPresetName(preset.name);
                                  }}
                                  style={exportButtonStyle("neutral")}
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeContinuityFilterPreset(preset.id);
                                    setReviewMessage(`${preset.name} was removed from local continuity presets.`);
                                  }}
                                  style={exportButtonStyle("neutral")}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={sectionLabelStyle()}>Watchlist</span>
                  <select value={timelineWatchlistFilter} onChange={(event) => setTimelineWatchlistFilter(event.target.value)} style={fieldStyle()}>
                    {continuityTimelineOptions.watchlists.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={sectionLabelStyle()}>Session Intent</span>
                  <select value={timelineIntentFilter} onChange={(event) => setTimelineIntentFilter(event.target.value)} style={fieldStyle()}>
                    {continuityTimelineOptions.intents.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={sectionLabelStyle()}>Symbol</span>
                  <select value={timelineSymbolFilter} onChange={(event) => setTimelineSymbolFilter(event.target.value)} style={fieldStyle()}>
                    {continuityTimelineOptions.symbols.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {filteredContinuityTimelineRows.length ? (
                  filteredContinuityTimelineRows.map((entry) => (
                    <div key={entry.key} style={moduleInsetStyle(entry.tone, 12)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{entry.label}</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{entry.type} | {formatTimelineTimestamp(entry.timestamp)}</div>
                        </div>
                        <ProductPill label={entry.state} tone={entry.tone} />
                      </div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{entry.detail}</div>
                      <div style={{ color: deskTheme.colors.sky, marginTop: 8 }}>{entry.context}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {(entry.watchlistLabels || []).slice(0, 2).map((watchlistLabel) => (
                          <ProductPill key={`${entry.key}-${watchlistLabel}`} label={watchlistLabel} tone="info" />
                        ))}
                        {(entry.symbols || []).slice(0, 2).map((symbol) => (
                          <ProductPill key={`${entry.key}-${symbol}`} label={symbol} tone="neutral" />
                        ))}
                        {(entry.sessionIntents || []).slice(0, 2).map((intent) => (
                          <ProductPill key={`${entry.key}-${intent}`} label={`Intent ${intent}`} tone="warning" />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: deskTheme.colors.soft }}>No local continuity entries match the current watchlist, intent, and symbol filters.</div>
                )}
              </div>
            </div>

            <div style={moduleInsetStyle("warning", 14)}>
              <div style={sectionLabelStyle()}>Continuity Workspace Macros</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Saved Review Launch Modes
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Bundle a continuity view, pinned pack context, replay queue, and optional session intent into one reusable local launch mode.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 12 }}>
                <input
                  value={macroName}
                  onChange={(event) => setMacroName(event.target.value)}
                  placeholder="Save the current continuity workspace as a macro"
                  style={fieldStyle()}
                />
                <button type="button" onClick={handleSaveContinuityMacro} style={exportButtonStyle("warning")}>
                  Save Macro
                </button>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {continuityWorkspaceMacros.length ? (
                  continuityWorkspaceMacros.slice(0, 8).map((macro) => {
                    const isEditing = editingMacroId === macro.id;
                    const isActive = activeContinuityMacroId === macro.id;
                    return (
                      <div key={macro.id} style={moduleInsetStyle(isActive ? "warning" : "neutral", 12)}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <div>
                            {isEditing ? (
                              <input value={editingMacroName} onChange={(event) => setEditingMacroName(event.target.value)} style={fieldStyle()} />
                            ) : (
                              <div style={{ fontWeight: 900 }}>{macro.name}</div>
                            )}
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                              {macro.presetName || "Ad hoc view"} | {macro.packLabel || "Pinned continuity pack"} | {macro.replayQueueName || "No queue"}
                            </div>
                            <div style={{ color: deskTheme.colors.sky, marginTop: 6 }}>
                              {macro.filters?.watchlist || "All Market Sets"} | {macro.filters?.sessionIntent || "All Intents"} | {macro.filters?.symbol || "All Symbols"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {isActive ? <ProductPill label="Active Macro" tone="warning" /> : null}
                            {macro.sessionIntent ? <ProductPill label={`Intent ${macro.sessionIntent}`} tone="info" /> : null}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          {isEditing ? (
                            <>
                              <button type="button" onClick={handleRenameContinuityMacro} style={exportButtonStyle("success")}>
                                Save Name
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMacroId("");
                                  setEditingMacroName("");
                                }}
                                style={exportButtonStyle("neutral")}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => handleLaunchContinuityMacro(macro)} style={exportButtonStyle("success")}>
                                Launch
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMacroId(macro.id);
                                  setEditingMacroName(macro.name);
                                }}
                                style={exportButtonStyle("neutral")}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  removeContinuityWorkspaceMacro(macro.id);
                                  setReviewMessage(`${macro.name} was removed from local continuity macros.`);
                                }}
                                style={exportButtonStyle("neutral")}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: deskTheme.colors.soft }}>
                    Save a continuity macro to reopen your favorite review layout, pinned pack context, and queue flow in one step.
                  </div>
                )}
              </div>

              {continuityWorkspaceMacros.length ? (
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  <div style={sectionLabelStyle()}>Continuity Macro Launch Analytics</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    {[
                      { key: "most", label: "Most Used", rows: continuityMacroAnalytics.mostUsed, tone: "success" },
                      { key: "last", label: "Last Used", rows: continuityMacroAnalytics.lastUsed, tone: "info" },
                      { key: "least", label: "Least Used", rows: continuityMacroAnalytics.leastUsed, tone: "warning" }
                    ].map((lane) => (
                      <div key={lane.key} style={moduleInsetStyle(lane.tone, 10)}>
                        <div style={sectionLabelStyle()}>{lane.label}</div>
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {lane.rows.length ? (
                            lane.rows.map((macro) => (
                              <div key={`${lane.key}-${macro.id}`} style={moduleInsetStyle(macro.tone, 10)}>
                                <div style={{ fontWeight: 900 }}>{macro.name}</div>
                                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                  {macro.usageCount} launches | {macro.lastUsedAt ? formatTimelineTimestamp(macro.lastUsedAt) : "Never launched"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: deskTheme.colors.soft }}>No launch data yet.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={moduleInsetStyle("info", 10)}>
                    <div style={sectionLabelStyle()}>Usage Frequency Over Time</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {continuityMacroAnalytics.frequencyRows.length ? (
                        continuityMacroAnalytics.frequencyRows.map((macro) => (
                          <div key={`frequency-${macro.id}`} style={moduleInsetStyle(macro.tone, 10)}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontWeight: 900 }}>{macro.name}</div>
                                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                  {macro.presetName} | {macro.replayQueueName} | {macro.sessionIntent}
                                </div>
                              </div>
                              <ProductPill label={`${macro.usageCount} total`} tone={macro.tone} />
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                              <ProductPill label={`24h ${macro.last24h}`} tone="neutral" />
                              <ProductPill label={`7d ${macro.last7d}`} tone="info" />
                              <ProductPill label={`30d ${macro.last30d}`} tone="warning" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: deskTheme.colors.soft }}>Launch a continuity macro to start building local usage analytics.</div>
                      )}
                    </div>
                  </div>

                  <div style={moduleInsetStyle("success", 10)}>
                    <div style={sectionLabelStyle()}>Macro-To-Outcome Correlation</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {macroOutcomeCorrelationRows.length ? (
                        macroOutcomeCorrelationRows.slice(0, 6).map((macro) => (
                          <div key={`macro-outcome-${macro.id}`} style={moduleInsetStyle(macro.tone, 10)}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontWeight: 900 }}>{macro.name}</div>
                                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                  {macro.queueName} | {macro.lastUsedAt ? formatTimelineTimestamp(macro.lastUsedAt) : "Never launched"}
                                </div>
                              </div>
                              <ProductPill label={`${macro.usageCount} launches`} tone={macro.tone} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 10 }}>
                              <div style={moduleInsetStyle("info", 8)}>
                                <div style={sectionLabelStyle()}>Replay Quality</div>
                                <div style={{ ...monoValueStyle("info", 20), marginTop: 6 }}>{macro.replayQuality}</div>
                              </div>
                              <div style={moduleInsetStyle("success", 8)}>
                                <div style={sectionLabelStyle()}>Discipline</div>
                                <div style={{ ...monoValueStyle("success", 20), marginTop: 6 }}>{macro.discipline}</div>
                              </div>
                              <div style={moduleInsetStyle("warning", 8)}>
                                <div style={sectionLabelStyle()}>Protection Adherence</div>
                                <div style={{ ...monoValueStyle("warning", 20), marginTop: 6 }}>{macro.protectionAdherence}</div>
                              </div>
                              <div style={moduleInsetStyle("neutral", 8)}>
                                <div style={sectionLabelStyle()}>Consistency</div>
                                <div style={{ ...monoValueStyle("neutral", 20), marginTop: 6 }}>{macro.consistency}</div>
                              </div>
                            </div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>{macro.verdictMix}</div>
                            <div style={{ color: deskTheme.colors.sky, marginTop: 8 }}>{macro.relationship}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: deskTheme.colors.soft }}>
                          Save or launch a continuity macro with a replay queue to make the local outcome relationship visible here.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={moduleInsetStyle("danger", 14)}>
              <div style={sectionLabelStyle()}>Continuity Alert History</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Drift Memory Ledger
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Review continuity drift alerts alongside handoff, snapshot, replay, and queue activity to understand when the desk moved away from the pinned review baseline.
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {continuityAlertHistory.length ? (
                  continuityAlertHistory.slice(0, 8).map((alert) => (
                    <div key={alert.id} style={moduleInsetStyle(alert.tone || "warning", 12)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{alert.severity}</div>
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{alert.reason}</div>
                        </div>
                        <ProductPill label={formatTimelineTimestamp(alert.updatedAt || alert.createdAt)} tone={alert.tone || "warning"} />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {alert.watchlistName ? <ProductPill label={alert.watchlistName} tone="info" /> : null}
                        {alert.snapshotName ? <ProductPill label={alert.snapshotName} tone="success" /> : null}
                        {alert.queueName ? <ProductPill label={alert.queueName} tone="warning" /> : null}
                        {alert.symbol ? <ProductPill label={alert.symbol} tone="neutral" /> : null}
                        {alert.route ? <ProductPill label={alert.route} tone="neutral" /> : null}
                      </div>
                      <div style={{ color: deskTheme.colors.sky, marginTop: 8 }}>{alert.recommendedAction}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: deskTheme.colors.soft }}>
                    No continuity drift alerts have been recorded yet. The shell will log drift here when the active review stack diverges from the pinned pack materially.
                  </div>
                )}
              </div>
            </div>

            <div style={moduleInsetStyle("info", 14)}>
              <div style={sectionLabelStyle()}>Continuity Memory Rollups</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Long-Horizon Drift Intelligence
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Review recurring continuity drift patterns over time by symbol, route, protection posture, and session intent so longer-horizon review weak points stay visible.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={sectionLabelStyle()}>Route</span>
                  <select value={trendRouteFilter} onChange={(event) => setTrendRouteFilter(event.target.value)} style={fieldStyle()}>
                    {continuityTrendFilterOptions.routes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={sectionLabelStyle()}>Protection Posture</span>
                  <select value={trendProtectionFilter} onChange={(event) => setTrendProtectionFilter(event.target.value)} style={fieldStyle()}>
                    {continuityTrendFilterOptions.protections.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={sectionLabelStyle()}>Symbol</span>
                  <select value={trendSymbolFilter} onChange={(event) => setTrendSymbolFilter(event.target.value)} style={fieldStyle()}>
                    {continuityTrendFilterOptions.symbols.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <ProductPill label={`${filteredContinuityTrendAlerts.length} filtered drifts`} tone={filteredContinuityTrendAlerts.length ? "info" : "neutral"} />
                <ProductPill label={trendRouteFilter} tone="warning" />
                <ProductPill label={trendProtectionFilter} tone="success" />
                <ProductPill label={trendSymbolFilter} tone="neutral" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
                {continuityTrendSnapshots.map((snapshot) => (
                  <div key={snapshot.key} style={moduleInsetStyle(snapshot.tone, 12)}>
                    <div style={sectionLabelStyle()}>{snapshot.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{snapshot.state}</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{snapshot.detail}</div>
                    <div style={{ color: deskTheme.colors.sky, marginTop: 8 }}>{snapshot.reasoning}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                {[
                  { key: "symbol", label: "By Symbol", rows: continuitySymbolRollups, tone: "info" },
                  { key: "route", label: "By Route", rows: continuityRouteRollups, tone: "warning" },
                  { key: "protection", label: "By Protection", rows: continuityProtectionRollups, tone: "success" },
                  { key: "intent", label: "By Session Intent", rows: continuityIntentRollups, tone: "success" }
                ].map((lane) => (
                  <div key={lane.key} style={moduleInsetStyle(lane.tone, 12)}>
                    <div style={sectionLabelStyle()}>{lane.label}</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {lane.rows.length ? (
                        lane.rows.map((row) => (
                          <div key={`${lane.key}-${row.label}`} style={moduleInsetStyle(row.tone, 10)}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 900 }}>{row.label}</div>
                              <ProductPill label={`${row.count} drifts`} tone={row.tone} />
                            </div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{row.summary}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{row.latestReason}</div>
                            <div style={{ color: deskTheme.colors.sky, marginTop: 6 }}>{row.recommendedAction || "Review the continuity packet and re-pin the intended desk state."}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: deskTheme.colors.soft }}>No continuity drift patterns recorded yet.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={moduleInsetStyle("success", 14)}>
              <div style={sectionLabelStyle()}>Saved Continuity Insight Reports</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                Reusable Continuity Intelligence Bundles
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Save the current macro analytics, drift clusters, trend snapshots, and continuity reasoning into a reusable local report for later review.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 12 }}>
                <input
                  value={insightReportName}
                  onChange={(event) => setInsightReportName(event.target.value)}
                  placeholder="Save the current continuity insight bundle"
                  style={fieldStyle()}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={handleSaveContinuityInsightReport} style={exportButtonStyle("success")}>
                    Save Report
                  </button>
                  <button type="button" onClick={() => insightImportRef.current?.click()} style={exportButtonStyle("neutral")}>
                    Import Report
                  </button>
                </div>
              </div>
              <input
                ref={insightImportRef}
                type="file"
                accept="application/json"
                onChange={handleContinuityInsightImport}
                style={{ display: "none" }}
              />

              <div style={moduleInsetStyle("info", 10)}>
                <div style={sectionLabelStyle()}>Current Continuity Reasoning</div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {continuityInsightReasoning.map((line, index) => (
                    <div key={`continuity-reasoning-${index}`} style={moduleInsetStyle(index === 0 ? "success" : "neutral", 10)}>
                      <div style={{ color: deskTheme.colors.soft }}>{line}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {continuityInsightReports.length ? (
                  continuityInsightReports.slice(0, 8).map((report) => {
                    const isEditing = editingInsightReportId === report.id;
                    const isActive = activeContinuityInsightReportId === report.id;
                    const isSelectedForCollection = insightCollectionDraftReportIds.includes(report.id);
                    const isPrimaryReport = primaryContinuityInsightReport?.id === report.id;
                    const isComparisonReport = comparisonContinuityInsightReport?.id === report.id;
                    const inActiveCollection = activeContinuityInsightCollection?.reportIds?.includes(report.id);
                    return (
                      <div key={report.id} style={moduleInsetStyle(isActive ? "success" : "neutral", 12)}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <div>
                            {isEditing ? (
                              <input value={editingInsightReportName} onChange={(event) => setEditingInsightReportName(event.target.value)} style={fieldStyle()} />
                            ) : (
                              <div style={{ fontWeight: 900 }}>{report.name}</div>
                            )}
                            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                              {formatTimelineTimestamp(report.updatedAt || report.createdAt)} | {report.filters?.route || "All Routes"} | {report.filters?.protectionState || "All Protection"} | {report.filters?.symbol || "All Symbols"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {isActive ? <ProductPill label="Active Report" tone="success" /> : null}
                            {isPrimaryReport ? <ProductPill label="Primary Delta" tone="info" /> : null}
                            {isComparisonReport ? <ProductPill label="Comparison Delta" tone="warning" /> : null}
                            {inActiveCollection ? <ProductPill label="In Active Collection" tone="success" /> : null}
                            <ProductPill label={`${report.macroAnalytics?.frequencyRows?.length || 0} macros`} tone="info" />
                            <ProductPill label={`${report.driftClusters?.length || 0} drift lanes`} tone="warning" />
                            <ProductPill label={`${report.trendSnapshots?.length || 0} trend cards`} tone="neutral" />
                            <ProductPill label={`${report.executionContexts?.symbols?.length || 0} symbol lanes`} tone="neutral" />
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {(report.reasoning || []).slice(0, 3).map((line, index) => (
                            <div key={`${report.id}-reasoning-${index}`} style={moduleInsetStyle(index === 0 ? "success" : "neutral", 10)}>
                              <div style={{ color: deskTheme.colors.soft }}>{line}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          {isEditing ? (
                            <>
                              <button type="button" onClick={handleRenameContinuityInsightReport} style={exportButtonStyle("success")}>
                                Save Name
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingInsightReportId("");
                                  setEditingInsightReportName("");
                                }}
                                style={exportButtonStyle("neutral")}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => handleLoadContinuityInsightReport(report)} style={exportButtonStyle("success")}>
                                Reopen
                              </button>
                              <button type="button" onClick={() => handleExportContinuityInsightReport(report)} style={exportButtonStyle("info")}>
                                Export
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePinnedContinuityInsightReport(report.id)}
                                style={exportButtonStyle(pinnedContinuityInsightReportIds.includes(report.id) ? "success" : "neutral")}
                              >
                                {pinnedContinuityInsightReportIds.includes(report.id) ? "Pinned" : "Pin"}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleInsightCollectionDraftReport(report.id)}
                                style={exportButtonStyle(isSelectedForCollection ? "success" : "neutral")}
                              >
                                {isSelectedForCollection ? "Selected" : "Arm For Collection"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingInsightReportId(report.id);
                                  setEditingInsightReportName(report.name);
                                }}
                                style={exportButtonStyle("neutral")}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  removeContinuityInsightReport(report.id);
                                  setReviewMessage(`${report.name} was removed from local continuity insight reports.`);
                                }}
                                style={exportButtonStyle("neutral")}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: deskTheme.colors.soft }}>
                    Save an insight report to preserve the current continuity reasoning, drift-cluster view, and trend posture for later local review.
                  </div>
                )}
              </div>

              <div style={moduleInsetStyle("info", 10)}>
                <div style={sectionLabelStyle()}>Saved Insight Report Collections</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>
                  Longer-Horizon Review Sets
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                  Group related continuity insight reports into local collections so operators can reopen wider review arcs without rebuilding the set.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 12 }}>
                  <input
                    value={insightCollectionName}
                    onChange={(event) => setInsightCollectionName(event.target.value)}
                    placeholder="Create a saved insight report collection"
                    style={fieldStyle()}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={handleSaveContinuityInsightCollection} style={exportButtonStyle("success")}>
                      Create Collection
                    </button>
                    <button type="button" onClick={() => insightCollectionImportRef.current?.click()} style={exportButtonStyle("neutral")}>
                      Import Collection
                    </button>
                    {activeContinuityInsightCollection ? (
                      <button type="button" onClick={() => handleExportContinuityInsightCollection(activeContinuityInsightCollection)} style={exportButtonStyle("info")}>
                        Export Active Bundle
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={insightCollectionImportRef}
                  type="file"
                  accept="application/json"
                  onChange={handleContinuityInsightCollectionImport}
                  style={{ display: "none" }}
                />
                {collectionImportPreview?.preview ? (
                  <div style={moduleInsetStyle("warning", 10)}>
                    <div style={sectionLabelStyle()}>Collection Pack Import Preview</div>
                    <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>
                      {collectionImportPreview.preview.name}
                    </div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                      {collectionImportPreview.fileName || "Selected pack"} | {collectionImportPreview.preview.reportCount} reports | {collectionImportPreview.preview.contentSummary}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                      <div style={moduleInsetStyle("info", 10)}>
                        <div style={{ fontWeight: 900 }}>Timestamps</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                          {collectionImportPreview.preview.timestamps.earliest ? formatTimelineTimestamp(collectionImportPreview.preview.timestamps.earliest) : "No earliest timestamp"}
                        </div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                          {collectionImportPreview.preview.timestamps.latest ? formatTimelineTimestamp(collectionImportPreview.preview.timestamps.latest) : "No latest timestamp"}
                        </div>
                      </div>
                      <div style={moduleInsetStyle("success", 10)}>
                        <div style={{ fontWeight: 900 }}>Merge Behavior</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                          {collectionImportPreview.preview.mergeBehavior}
                        </div>
                      </div>
                      <div style={moduleInsetStyle("neutral", 10)}>
                        <div style={{ fontWeight: 900 }}>Content Summary</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                          {collectionImportPreview.preview.matchedReports} matching reports | {collectionImportPreview.preview.newReports} new reports | {collectionImportPreview.preview.checkpointCount} checkpoints
                        </div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                          {collectionImportPreview.preview.selectedCheckpointCount} selected bundle checkpoints | {collectionImportPreview.preview.noteHistoryCount} note revisions
                        </div>
                        {collectionImportPreview.preview.collectionMatchName ? (
                          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                            Matching local collection: {collectionImportPreview.preview.collectionMatchName}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {collectionImportPreview.preview.notes ? (
                      <div style={{ color: deskTheme.colors.soft, marginTop: 12 }}>
                        Notes: {collectionImportPreview.preview.notes}
                      </div>
                    ) : null}
                    {collectionImportPreview.preview.bundleSummary ? (
                      <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                        Bundle: {collectionImportPreview.preview.bundleSummary}
                      </div>
                    ) : null}
                    {collectionImportPreview.preview.healthSummary ? (
                      <div style={{ color: deskTheme.colors.sky, marginTop: 8 }}>
                        Health: {collectionImportPreview.preview.healthSummary}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button type="button" onClick={handleConfirmContinuityInsightCollectionImport} style={exportButtonStyle("success")}>
                        Import Collection Pack
                      </button>
                      <button type="button" onClick={() => setCollectionImportPreview(null)} style={exportButtonStyle("neutral")}>
                        Cancel Preview
                      </button>
                    </div>
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {insightCollectionDraftReportIds.length ? (
                    insightCollectionDraftReportIds
                      .map((reportId) => continuityInsightReportMap.get(reportId))
                      .filter(Boolean)
                      .map((report) => (
                        <button
                          key={`draft-report-${report.id}`}
                          type="button"
                          onClick={() => toggleInsightCollectionDraftReport(report.id)}
                          style={reviewToggleStyle(true, "success")}
                        >
                          {report.name}
                        </button>
                      ))
                  ) : (
                    <span style={createPillStyle("neutral")}>
                      Arm reports above or the active comparison pair will be used automatically
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {resolvedContinuityInsightCollections.length ? (
                    resolvedContinuityInsightCollections.map((collection) => {
                      const isEditingCollection = editingInsightCollectionId === collection.id;
                      const isActiveCollection = activeContinuityInsightCollectionId === collection.id;
                      const availableReports = continuityInsightReports.filter(
                        (report) => !collection.reportIds.includes(report.id)
                      );
                      const playbackFrames = buildContinuityCollectionPlaybackFrames(collection);
                      const playbackIndex = Math.max(
                        0,
                        Math.min(
                          playbackFrames.length - 1,
                          Number(collectionPlaybackIndexes[collection.id] || 0)
                        )
                      );
                      const playbackFrame = playbackFrames[playbackIndex] || null;
                      const previousPlaybackFrame = playbackIndex > 0 ? playbackFrames[playbackIndex - 1] || null : null;
                      const playbackDiffRows = buildContinuityCollectionPlaybackDiff(playbackFrame, previousPlaybackFrame);
                      const isPlaybackActive = activePlaybackCollectionId === collection.id;
                      const collectionHealth = continuityCollectionHealthMap.get(collection.id) || null;
                      const promotedCheckpoints = promotedContinuityCollectionCheckpoints.filter(
                        (item) => item.collectionId === collection.id
                      );
                      const selectedBundleCheckpointIds = asArray(collectionBundleSelections[collection.id]);
                      const bundleCheckpointCount = selectedBundleCheckpointIds.length || asArray(collection.checkpoints).length;

                      return (
                        <div key={collection.id} style={moduleInsetStyle(isActiveCollection ? "success" : "neutral", 12)}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div>
                              {isEditingCollection ? (
                                <input value={editingInsightCollectionName} onChange={(event) => setEditingInsightCollectionName(event.target.value)} style={fieldStyle()} />
                              ) : (
                                <div style={{ fontWeight: 900 }}>{collection.name}</div>
                              )}
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                {formatTimelineTimestamp(collection.lastOpenedAt || collection.updatedAt || collection.createdAt)} | {collection.reports.length} reports in the saved set
                              </div>
                              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                {collection.summary || "Empty review set"}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {isActiveCollection ? <ProductPill label="Active Collection" tone="success" /> : null}
                              {pinnedContinuityInsightCollectionIds.includes(collection.id) ? <ProductPill label="Pinned Favorite" tone="warning" /> : null}
                              {collectionHealth ? (
                                <ProductPill label={`Health ${collectionHealth.overall}/100`} tone={collectionHealth.tone} />
                              ) : null}
                              <ProductPill label={`${collection.reports.length} reports`} tone="info" />
                              {asArray(collection.noteHistory).length ? (
                                <ProductPill label={`${asArray(collection.noteHistory).length} note revisions`} tone="neutral" />
                              ) : null}
                              {promotedCheckpoints.length ? (
                                <ProductPill label={`${promotedCheckpoints.length} promoted`} tone="warning" />
                              ) : null}
                              {bundleCheckpointCount ? (
                                <ProductPill label={`${bundleCheckpointCount} bundle checkpoints`} tone="info" />
                              ) : null}
                              {collection.coverage?.symbols?.length ? (
                                <ProductPill label={`${collection.coverage.symbols.length} symbols`} tone="neutral" />
                              ) : null}
                              {collection.coverage?.routes?.length ? (
                                <ProductPill label={`${collection.coverage.routes.length} routes`} tone="warning" />
                              ) : null}
                              {collection.coverage?.protections?.length ? (
                                <ProductPill label={`${collection.coverage.protections.length} postures`} tone="success" />
                              ) : null}
                            </div>
                          </div>

                          {collection.coverage?.symbols?.length || collection.coverage?.routes?.length || collection.coverage?.protections?.length ? (
                            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                              {collection.coverage?.symbols?.length ? (
                                <div style={{ color: deskTheme.colors.soft }}>
                                  Symbols: {collection.coverage.symbols.join(", ")}
                                </div>
                              ) : null}
                              {collection.coverage?.routes?.length ? (
                                <div style={{ color: deskTheme.colors.soft }}>
                                  Routes: {collection.coverage.routes.join(", ")}
                                </div>
                              ) : null}
                              {collection.coverage?.protections?.length ? (
                                <div style={{ color: deskTheme.colors.soft }}>
                                  Protection Posture: {collection.coverage.protections.join(", ")}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {collection.notes ? (
                            <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>
                              Notes: {collection.notes}
                            </div>
                          ) : null}
                          {collectionHealth ? (
                            <div style={moduleInsetStyle(collectionHealth.tone, 10)}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <div>
                                  <div style={sectionLabelStyle()}>Collection Health</div>
                                  <div style={{ fontWeight: 900, marginTop: 8 }}>
                                    {collectionHealth.state} | {collectionHealth.overall}/100
                                  </div>
                                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                    {collectionHealth.summary}
                                  </div>
                                </div>
                                <ProductPill label={`Checkpoint bundle ${bundleCheckpointCount}`} tone="info" />
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                                {collectionHealth.metrics.map((metric) => (
                                  <div key={`${collection.id}-${metric.key}`} style={moduleInsetStyle(metric.tone, 10)}>
                                    <div style={sectionLabelStyle()}>{metric.label}</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>
                                      {metric.score}/100
                                    </div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                      {metric.state}
                                    </div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                                      {metric.detail}
                                    </div>
                                    <div style={{ marginTop: 10 }}>
                                      <ProductPill label={metric.summary} tone={metric.tone} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {playbackFrame ? (
                            <div style={moduleInsetStyle(isPlaybackActive ? "success" : "info", 10)}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <div>
                                  <div style={sectionLabelStyle()}>Collection Timeline Playback</div>
                                  <div style={{ fontWeight: 900, marginTop: 8 }}>
                                    Step {playbackIndex + 1} of {playbackFrames.length} | {playbackFrame.label}
                                  </div>
                                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                    {formatTimelineTimestamp(playbackFrame.timestamp)} | {playbackFrame.trend.state}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStepCollectionPlayback(collection.id, "previous")}
                                    style={reviewToggleStyle(playbackIndex > 0, "neutral")}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCollectionPlaybackFrame(collection.id, playbackFrame.id)}
                                    style={reviewToggleStyle(true, playbackFrame.trend.tone)}
                                  >
                                    Open Step
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStepCollectionPlayback(collection.id, "next")}
                                    style={reviewToggleStyle(playbackIndex < playbackFrames.length - 1, "info")}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                                <div style={{ color: deskTheme.colors.soft }}>{playbackFrame.evolution}</div>
                                <div style={{ color: deskTheme.colors.soft }}>Drift posture: {playbackFrame.topDrift}</div>
                                <div style={{ color: deskTheme.colors.soft }}>Reasoning: {playbackFrame.topReasoning}</div>
                                <div style={{ color: deskTheme.colors.soft }}>
                                  Coverage: {playbackFrame.coverage.symbols.join(", ") || "No symbols"} | {playbackFrame.coverage.routes.join(", ") || "No routes"} | {playbackFrame.coverage.protections.join(", ") || "No protection posture"}
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                                {playbackDiffRows.map((row) => (
                                  <div key={`${collection.id}-${playbackFrame.id}-${row.label}`} style={moduleInsetStyle(row.tone, 10)}>
                                    <div style={sectionLabelStyle()}>{row.label}</div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>Previous</div>
                                    <div style={{ marginTop: 6 }}>{row.previous}</div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>Current</div>
                                    <div style={{ marginTop: 6 }}>{row.current}</div>
                                    <div style={{ marginTop: 10 }}>
                                      <ProductPill label={row.summary} tone={row.tone} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                                <div style={sectionLabelStyle()}>Collection Notes, Bundles, And Checkpoints</div>
                                <textarea
                                  value={collectionNoteDrafts[collection.id] ?? collection.notes ?? ""}
                                  onChange={(event) =>
                                    setCollectionNoteDrafts((current) => ({
                                      ...current,
                                      [collection.id]: event.target.value
                                    }))
                                  }
                                  placeholder="Add long-arc operator notes for this collection"
                                  style={{ ...fieldStyle(), minHeight: 92, resize: "vertical" }}
                                />
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button type="button" onClick={() => handleSaveCollectionNotes(collection)} style={exportButtonStyle("success")}>
                                    Save Notes
                                  </button>
                                  <button type="button" onClick={() => handleExportContinuityInsightCollection(collection)} style={exportButtonStyle("info")}>
                                    Export Bundle
                                  </button>
                                  <input
                                    value={collectionCheckpointDrafts[collection.id]?.label || ""}
                                    onChange={(event) =>
                                      setCollectionCheckpointDrafts((current) => ({
                                        ...current,
                                        [collection.id]: {
                                          ...(current[collection.id] || {}),
                                          label: event.target.value
                                        }
                                      }))
                                    }
                                    placeholder="Checkpoint label"
                                    style={{ ...fieldStyle(), minWidth: 180 }}
                                  />
                                  <input
                                    value={collectionCheckpointDrafts[collection.id]?.note || ""}
                                    onChange={(event) =>
                                      setCollectionCheckpointDrafts((current) => ({
                                        ...current,
                                        [collection.id]: {
                                          ...(current[collection.id] || {}),
                                          note: event.target.value
                                        }
                                      }))
                                    }
                                    placeholder="Checkpoint note"
                                    style={{ ...fieldStyle(), minWidth: 220 }}
                                  />
                                  <button type="button" onClick={() => handleSaveCollectionCheckpoint(collection, playbackFrame)} style={exportButtonStyle("warning")}>
                                    Pin This Step
                                  </button>
                                </div>
                                <div style={{ color: deskTheme.colors.soft }}>
                                  The next local bundle will include {bundleCheckpointCount} pinned checkpoints, current collection notes, note history, and checkpoint context for desk-to-desk handoff.
                                </div>
                                {asArray(collection.noteHistory).length ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={sectionLabelStyle()}>Note History</div>
                                    <div style={{ display: "grid", gap: 8 }}>
                                      {asArray(collection.noteHistory).slice(0, 4).map((revision) => (
                                        <div key={revision.id} style={moduleInsetStyle("neutral", 10)}>
                                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                            <div style={{ fontWeight: 900 }}>{revision.summary || "Saved note revision"}</div>
                                            <ProductPill label={formatTimelineTimestamp(revision.savedAt)} tone="neutral" />
                                          </div>
                                          <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                                            {revision.note}
                                          </div>
                                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                                            <button
                                              type="button"
                                              onClick={() => handleRestoreCollectionNoteRevision(collection, revision)}
                                              style={reviewToggleStyle(false, "info")}
                                            >
                                              Restore Revision
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ color: deskTheme.colors.soft }}>
                                    Saved note revisions will appear here after the collection notes change over time.
                                  </div>
                                )}
                                {collection.checkpoints?.length ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    {collection.checkpoints.map((checkpoint) => (
                                      <div key={checkpoint.id} style={moduleInsetStyle("warning", 10)}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenCollectionCheckpoint(collection, checkpoint)}
                                            style={reviewToggleStyle(checkpoint.reportId === playbackFrame.id, "warning")}
                                          >
                                            {checkpoint.label}
                                          </button>
                                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            {selectedBundleCheckpointIds.includes(checkpoint.id) ? (
                                              <ProductPill label="Bundle Selected" tone="info" />
                                            ) : null}
                                            {promotedContinuityCheckpointKeySet.has(`${collection.id}::${checkpoint.id}`) ? (
                                              <ProductPill label="Shell Favorite" tone="warning" />
                                            ) : null}
                                          </div>
                                        </div>
                                        {checkpoint.note ? (
                                          <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                                            {checkpoint.note}
                                          </div>
                                        ) : null}
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleCollectionBundleCheckpoint(collection, checkpoint)}
                                            style={reviewToggleStyle(selectedBundleCheckpointIds.includes(checkpoint.id), "info")}
                                          >
                                            {selectedBundleCheckpointIds.includes(checkpoint.id) ? "Bundle Selected" : "Add To Bundle"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleTogglePromotedCollectionCheckpoint(collection, checkpoint)}
                                            style={reviewToggleStyle(
                                              promotedContinuityCheckpointKeySet.has(`${collection.id}::${checkpoint.id}`),
                                              "warning"
                                            )}
                                          >
                                            {promotedContinuityCheckpointKeySet.has(`${collection.id}::${checkpoint.id}`) ? "Promoted" : "Promote"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeContinuityInsightCollectionCheckpoint(collection.id, checkpoint.id)}
                                            style={reviewToggleStyle(false, "danger")}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ color: deskTheme.colors.soft }}>
                                    Pin key playback steps to keep longer review arcs anchored across sessions.
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                {playbackFrames.map((frame, frameIndex) => (
                                  <button
                                    key={`${collection.id}-frame-${frame.id}`}
                                    type="button"
                                    onClick={() => {
                                      setActivePlaybackCollectionId(collection.id);
                                      setCollectionPlaybackIndexes((current) => ({ ...current, [collection.id]: frameIndex }));
                                    }}
                                    style={reviewToggleStyle(frameIndex === playbackIndex, frame.trend.tone)}
                                  >
                                    {frameIndex + 1}. {frame.trend.state}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                            {collection.reports.length ? (
                              collection.reports.map((report) => (
                                <div key={`${collection.id}-${report.id}`} style={moduleInsetStyle("neutral", 10)}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                    <div>
                                      <div style={{ fontWeight: 900 }}>{report.name}</div>
                                      <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                                        {report.filters?.route || "All Routes"} | {report.filters?.protectionState || "All Protection"} | {report.filters?.symbol || "All Symbols"}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveReportFromInsightCollection(collection, report)}
                                      style={reviewToggleStyle(false, "danger")}
                                    >
                                      Remove Report
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ color: deskTheme.colors.soft }}>
                                This collection is empty. Add saved reports to turn it back into a reusable review set.
                              </div>
                            )}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginTop: 12 }}>
                            <select
                              value={collectionAddSelections[collection.id] || ""}
                              onChange={(event) =>
                                setCollectionAddSelections((current) => ({
                                  ...current,
                                  [collection.id]: event.target.value
                                }))
                              }
                              style={fieldStyle()}
                            >
                              <option value="">Add a saved report</option>
                              {availableReports.map((report) => (
                                <option key={`${collection.id}-${report.id}-add`} value={report.id}>
                                  {report.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAddReportToInsightCollection(collection.id)}
                              style={exportButtonStyle("info")}
                            >
                              Add Report
                            </button>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                            {isEditingCollection ? (
                              <>
                                <button type="button" onClick={handleRenameContinuityInsightCollection} style={exportButtonStyle("success")}>
                                  Save Name
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInsightCollectionId("");
                                    setEditingInsightCollectionName("");
                                  }}
                                  style={exportButtonStyle("neutral")}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => handleLoadContinuityInsightCollection(collection)} style={exportButtonStyle("success")}>
                                  Reopen Collection
                                </button>
                                <button type="button" onClick={() => handleExportContinuityInsightCollection(collection)} style={exportButtonStyle("info")}>
                                  Export Bundle
                                </button>
                                <button
                                  type="button"
                                  onClick={() => togglePinnedContinuityInsightCollection(collection.id)}
                                  style={exportButtonStyle(pinnedContinuityInsightCollectionIds.includes(collection.id) ? "success" : "neutral")}
                                >
                                  {pinnedContinuityInsightCollectionIds.includes(collection.id) ? "Pinned" : "Pin"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInsightCollectionId(collection.id);
                                    setEditingInsightCollectionName(collection.name);
                                  }}
                                  style={exportButtonStyle("neutral")}
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeContinuityInsightCollection(collection.id);
                                    setReviewMessage(`${collection.name} was removed from local continuity collections.`);
                                  }}
                                  style={exportButtonStyle("neutral")}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: deskTheme.colors.soft }}>
                      Create a collection to group related insight reports into a longer-horizon local review set.
                    </div>
                  )}
                </div>
              </div>

              {pinnedContinuityInsightReports.length || pinnedContinuityInsightCollections.length || pinnedContinuityComparisonPairs.length || promotedContinuityCollectionCheckpoints.length ? (
                <div style={moduleInsetStyle("warning", 10)}>
                  <div style={sectionLabelStyle()}>Pinned Continuity Favorites</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                    Fast local reopeners for operator-selected reports, comparison pairs, promoted checkpoints, and longer-horizon collections.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                    <div style={moduleInsetStyle("info", 10)}>
                      <div style={{ fontWeight: 900 }}>Pinned Reports</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {pinnedContinuityInsightReports.length ? (
                          pinnedContinuityInsightReports.map((report) => (
                            <button key={`pinned-report-${report.id}`} type="button" onClick={() => handleLoadContinuityInsightReport(report)} style={reviewToggleStyle(true, "info")}>
                              {report.name}
                            </button>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No pinned reports</div>
                        )}
                      </div>
                    </div>
                    <div style={moduleInsetStyle("warning", 10)}>
                      <div style={{ fontWeight: 900 }}>Pinned Pairs</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {pinnedContinuityComparisonPairs.length ? (
                          pinnedContinuityComparisonPairs.map((pair) => (
                            <button key={`pinned-pair-${pair.id}`} type="button" onClick={() => openPinnedContinuityInsightPair(pair.id)} style={reviewToggleStyle(true, "warning")}>
                              {pair.label}
                            </button>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No pinned pairs</div>
                        )}
                      </div>
                    </div>
                    <div style={moduleInsetStyle("warning", 10)}>
                      <div style={{ fontWeight: 900 }}>Promoted Checkpoints</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {promotedContinuityCollectionCheckpoints.length ? (
                          promotedContinuityCollectionCheckpoints.map((promotion) => (
                            <button
                              key={`promoted-checkpoint-${promotion.id}`}
                              type="button"
                              onClick={() => handleOpenPromotedCollectionCheckpoint(promotion)}
                              style={reviewToggleStyle(true, "warning")}
                            >
                              {promotion.label}
                            </button>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No promoted checkpoints</div>
                        )}
                      </div>
                    </div>
                    <div style={moduleInsetStyle("success", 10)}>
                      <div style={{ fontWeight: 900 }}>Pinned Collections</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {pinnedContinuityInsightCollections.length ? (
                          pinnedContinuityInsightCollections.map((collection) => (
                            <button key={`pinned-collection-${collection.id}`} type="button" onClick={() => handleLoadContinuityInsightCollection(collection)} style={reviewToggleStyle(true, "success")}>
                              {collection.name}
                            </button>
                          ))
                        ) : (
                          <div style={{ color: deskTheme.colors.soft }}>No pinned collections</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {continuityInsightReports.length > 1 ? (
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  <div style={sectionLabelStyle()}>Insight Report Delta Views</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={sectionLabelStyle()}>Primary Report</span>
                      <select
                        value={primaryContinuityInsightReport?.id || ""}
                        onChange={(event) =>
                          setContinuityInsightComparisonPair(
                            event.target.value,
                            continuityInsightComparisonReportId,
                            { silent: true }
                          )
                        }
                        style={fieldStyle()}
                      >
                        {continuityInsightReports.map((report) => (
                          <option key={`primary-${report.id}`} value={report.id}>
                            {report.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={sectionLabelStyle()}>Comparison Report</span>
                      <select
                        value={comparisonContinuityInsightReport?.id || ""}
                        onChange={(event) =>
                          setContinuityInsightComparisonPair(
                            primaryContinuityInsightReport?.id || "",
                            event.target.value,
                            { silent: true }
                          )
                        }
                        style={fieldStyle()}
                      >
                        <option value="">No comparison</option>
                        {continuityInsightReports
                          .filter((report) => report.id !== (primaryContinuityInsightReport?.id || ""))
                          .map((report) => (
                            <option key={`comparison-${report.id}`} value={report.id}>
                              {report.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  {primaryContinuityInsightReport && comparisonContinuityInsightReport ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ color: deskTheme.colors.soft }}>
                        {primaryContinuityInsightReport.name} vs {comparisonContinuityInsightReport.name} | {formatTimelineTimestamp(primaryContinuityInsightReport.updatedAt || primaryContinuityInsightReport.createdAt)} vs{" "}
                        {formatTimelineTimestamp(comparisonContinuityInsightReport.updatedAt || comparisonContinuityInsightReport.createdAt)}
                      </div>
                      {activeContinuityInsightCollection ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <ProductPill label={`Collection ${activeContinuityInsightCollection.name}`} tone="success" />
                          <ProductPill label={`${activeContinuityInsightCollection.reports.length} reports in review set`} tone="info" />
                        </div>
                      ) : null}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() =>
                            togglePinnedContinuityInsightPair(
                              primaryContinuityInsightReport.id,
                              comparisonContinuityInsightReport.id
                            )
                          }
                          style={exportButtonStyle(
                            pinnedContinuityInsightPairs.some(
                              (pair) =>
                                pair.primaryReportId === primaryContinuityInsightReport.id &&
                                pair.comparisonReportId === comparisonContinuityInsightReport.id
                            )
                              ? "success"
                              : "neutral"
                          )}
                        >
                          {pinnedContinuityInsightPairs.some(
                            (pair) =>
                              pair.primaryReportId === primaryContinuityInsightReport.id &&
                              pair.comparisonReportId === comparisonContinuityInsightReport.id
                          )
                            ? "Pinned Pair"
                            : "Pin Pair"}
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                        {continuityInsightDeltaRows.map((row) => (
                          <div key={`insight-delta-${row.key}`} style={moduleInsetStyle(row.tone, 10)}>
                            <div style={sectionLabelStyle()}>{row.label}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{primaryContinuityInsightReport.name}</div>
                            <div style={{ marginTop: 6, lineHeight: 1.6 }}>{row.primary}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>{comparisonContinuityInsightReport.name}</div>
                            <div style={{ marginTop: 6, lineHeight: 1.6 }}>{row.comparison}</div>
                            <div style={{ marginTop: 10 }}>
                              <ProductPill label={row.summary} tone={row.tone} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                        {continuityInsightExecutionDrilldowns.map((lane) => (
                          <div key={`insight-context-${lane.key}`} style={moduleInsetStyle(lane.tone, 10)}>
                            <div style={sectionLabelStyle()}>{lane.label}</div>
                            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                              Narrow execution-context drift between the saved reports.
                            </div>
                            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                              {lane.rows.length ? (
                                lane.rows.map((row) => (
                                  <div key={`${lane.key}-${row.key}`} style={moduleInsetStyle(row.tone, 10)}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                      <div style={{ fontWeight: 900 }}>{row.label}</div>
                                      <ProductPill label={row.summary} tone={row.tone} />
                                    </div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{primaryContinuityInsightReport.name}</div>
                                    <div style={{ marginTop: 6 }}>{row.primary}</div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{row.detail}</div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 10 }}>{comparisonContinuityInsightReport.name}</div>
                                    <div style={{ marginTop: 6 }}>{row.comparison}</div>
                                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{row.comparisonDetail}</div>
                                  </div>
                                ))
                              ) : (
                                <div style={{ color: deskTheme.colors.soft }}>
                                  No saved drilldown context was available for this lane.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: deskTheme.colors.soft }}>
                      Save or import at least two continuity insight reports to compare the intelligence baseline over time.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div style={moduleInsetStyle("info", 14)}>
              <div style={sectionLabelStyle()}>Operator Handoff Notes</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{activeWatchlist?.name || "Current Market Set"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                Bundle the active watchlist, snapshot, replay queue, verdict set, and session intent into a local handoff packet.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <ProductPill label={activeWatchlist?.name || "No watchlist"} tone="info" />
                <ProductPill label={reviewSnapshots.find((item) => item.id === activeReviewSnapshotId)?.name || "No snapshot"} tone="success" />
                <ProductPill label={activeReplayQueue?.name || "No queue"} tone="warning" />
              </div>
              <textarea
                value={handoffComment}
                onChange={(event) => setHandoffComment(event.target.value)}
                placeholder="Operator comment for next-session continuity"
                style={{ ...fieldStyle(), minHeight: 110, resize: "vertical", marginTop: 12 }}
              />
              <button type="button" onClick={handleSaveHandoff} style={{ ...exportButtonStyle("success"), marginTop: 12 }}>
                Save Handoff Note
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {handoffNotes.slice(0, 6).map((note) => (
                <div key={note.id} style={moduleInsetStyle("neutral", 14)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{note.watchlistName || "Local Handoff"}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => restoreHandoffContext(note.id)} style={reviewToggleStyle(false, "warning")}>
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePinnedHandoffNote(note.id)}
                        style={reviewToggleStyle(pinnedHandoffNoteIds.includes(note.id), "info")}
                      >
                        {pinnedHandoffNoteIds.includes(note.id) ? "Pinned" : "Pin"}
                      </button>
                      <button type="button" onClick={() => handleExportHandoff(note)} style={reviewToggleStyle(false, "success")}>
                        Export Bundle
                      </button>
                      <button type="button" onClick={() => removeHandoffNote(note.id)} style={reviewToggleStyle(false, "danger")}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{note.comment || "No operator comment added."}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {note.snapshotName ? <ProductPill label={note.snapshotName} tone="success" /> : null}
                    {note.replayQueueName ? <ProductPill label={note.replayQueueName} tone="warning" /> : null}
                    {note.sessionIntent ? <ProductPill label={`Intent ${note.sessionIntent}`} tone="info" /> : null}
                    {note.selectedSymbol ? <ProductPill label={note.selectedSymbol} tone="neutral" /> : null}
                    {note.selectedRoute ? <ProductPill label={note.selectedRoute} tone="neutral" /> : null}
                    {(note.verdicts || []).map((verdict) => (
                      <ProductPill key={`${note.id}-${verdict}`} label={formatVerdictLabel(verdict)} tone="neutral" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={modulePanelStyle("info")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Session Composer</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>{selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              {selectedRoute?.name || "No active route"} session record for {activeWatchlist?.name || "the active market set"}
            </div>
          </div>
          <ProductPill label={`${sessionNotes.length} Notes`} tone="info" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 170px", gap: 12, marginTop: 16 }}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a session note for the active symbol, route, and market set"
            style={{ ...fieldStyle(), minHeight: 118, resize: "vertical" }}
          />
          <button
            type="button"
            onClick={() => {
              addSessionNote(draft);
              setDraft("");
            }}
            style={saveNoteButtonStyle()}
          >
            Save Note
          </button>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section style={modulePanelStyle("info")}>
          <div style={sectionLabelStyle()}>Session Notes</div>
          <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Memory Lane</div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {filteredNotes.slice(0, 8).map((note, index) => {
              const annotations = annotationPills(note, watchlistLookup, activeWatchlist, chartOverlayModel, protectionState, selectedSymbol, selectedRoute);
              const reviewKey = buildReplayMarkKey("note", note);
              const reviewEntry = replayReviewMarks?.[reviewKey] || null;
              return (
                <div key={note.id || `${note.text}-${index}`} style={moduleInsetStyle("info", 14)}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ProductPill label={note.watchlistName || activeWatchlist?.name || "Market Set"} tone="info" />
                    {note.sessionIntent ? <ProductPill label={`Intent ${note.sessionIntent}`} tone="warning" /> : null}
                    {(normalizeWatchlistTags(note.sessionTags) || []).map((tag) => (
                      <ProductPill key={`${note.id}-${tag}`} label={`Tag ${tag}`} tone="warning" />
                    ))}
                  </div>
                  <div style={{ color: deskTheme.colors.sky, fontWeight: 800, marginTop: 10 }}>{note.symbol || selectedSymbol} | {note.route || selectedRoute?.name || "No route"}</div>
                  <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{note.text}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {annotations.map((annotation) => (
                      <ProductPill key={`${note.id}-${annotation.label}`} label={annotation.label} tone={annotation.tone} />
                    ))}
                    {reviewEntry?.bookmarked ? <ProductPill label="Bookmarked" tone="warning" /> : null}
                    {(reviewEntry?.verdicts || []).map((verdict) => (
                      <ProductPill key={`${reviewKey}-${verdict}`} label={formatVerdictLabel(verdict)} tone="info" />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button type="button" onClick={() => toggleReplayBookmark("note", note)} style={reviewToggleStyle(Boolean(reviewEntry?.bookmarked), "warning")}>
                      {reviewEntry?.bookmarked ? "Bookmarked" : "Bookmark"}
                    </button>
                    {activeReplayQueue ? (
                      <button
                        type="button"
                        onClick={() => toggleReplayQueueItem(activeReplayQueue.id, "note", note)}
                        style={reviewToggleStyle(Boolean(activeReplayQueue.itemKeys?.includes(reviewKey)), "info")}
                      >
                        {activeReplayQueue.itemKeys?.includes(reviewKey) ? `In ${activeReplayQueue.name}` : `Queue ${activeReplayQueue.name}`}
                      </button>
                    ) : null}
                    {replayVerdictOptions.map((verdict) => (
                      <button
                        key={`${reviewKey}-toggle-${verdict}`}
                        type="button"
                        onClick={() => toggleReplayVerdict("note", note, verdict)}
                        style={reviewToggleStyle(Boolean(reviewEntry?.verdicts?.includes(verdict)), verdict === "risky" ? "danger" : verdict === "strong" || verdict === "disciplined" ? "success" : "neutral")}
                      >
                        {formatVerdictLabel(verdict)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          <section style={modulePanelStyle("warning")}>
            <div style={sectionLabelStyle()}>Recent Actions</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Operator Activity</div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {filteredActions.slice(0, 6).map((action) => {
                const annotations = annotationPills(action, watchlistLookup, activeWatchlist, chartOverlayModel, protectionState, selectedSymbol, selectedRoute);
                const reviewKey = buildReplayMarkKey("action", action);
                const reviewEntry = replayReviewMarks?.[reviewKey] || null;
                return (
                  <div key={action.id} style={moduleInsetStyle("warning", 14)}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {action.watchlistName ? <ProductPill label={action.watchlistName} tone="warning" /> : null}
                      {action.sessionIntent ? <ProductPill label={`Intent ${action.sessionIntent}`} tone="info" /> : null}
                      {(normalizeWatchlistTags(action.sessionTags) || []).map((tag) => (
                        <ProductPill key={`${action.id}-${tag}`} label={`Tag ${tag}`} tone="neutral" />
                      ))}
                    </div>
                    <div style={{ fontWeight: 800, marginTop: 10 }}>{action.title}</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{action.detail}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {annotations.map((annotation) => (
                        <ProductPill key={`${action.id}-${annotation.label}`} label={annotation.label} tone={annotation.tone} />
                      ))}
                      {reviewEntry?.bookmarked ? <ProductPill label="Bookmarked" tone="warning" /> : null}
                      {(reviewEntry?.verdicts || []).map((verdict) => (
                        <ProductPill key={`${reviewKey}-${verdict}`} label={formatVerdictLabel(verdict)} tone="info" />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button type="button" onClick={() => toggleReplayBookmark("action", action)} style={reviewToggleStyle(Boolean(reviewEntry?.bookmarked), "warning")}>
                        {reviewEntry?.bookmarked ? "Bookmarked" : "Bookmark"}
                      </button>
                      {activeReplayQueue ? (
                        <button
                          type="button"
                          onClick={() => toggleReplayQueueItem(activeReplayQueue.id, "action", action)}
                          style={reviewToggleStyle(Boolean(activeReplayQueue.itemKeys?.includes(reviewKey)), "info")}
                        >
                          {activeReplayQueue.itemKeys?.includes(reviewKey) ? `In ${activeReplayQueue.name}` : `Queue ${activeReplayQueue.name}`}
                        </button>
                      ) : null}
                      {replayVerdictOptions.map((verdict) => (
                        <button
                          key={`${reviewKey}-toggle-${verdict}`}
                          type="button"
                          onClick={() => toggleReplayVerdict("action", action, verdict)}
                          style={reviewToggleStyle(Boolean(reviewEntry?.verdicts?.includes(verdict)), verdict === "risky" ? "danger" : verdict === "strong" || verdict === "disciplined" ? "success" : "neutral")}
                        >
                          {formatVerdictLabel(verdict)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={modulePanelStyle("success")}>
            <div style={sectionLabelStyle()}>Order Replay</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Paper Execution Review</div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {filteredOrders.slice(0, 6).map((order) => {
                const annotations = annotationPills(order, watchlistLookup, activeWatchlist, chartOverlayModel, protectionState, selectedSymbol, selectedRoute);
                const reviewKey = buildReplayMarkKey("order", order);
                const reviewEntry = replayReviewMarks?.[reviewKey] || null;
                return (
                  <div key={order.id} style={moduleInsetStyle("success", 14)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ color: deskTheme.colors.sky }}>{order.id}</strong>
                      <ProductPill label={order.status} tone={order.status === "Canceled" || order.status === "Closed" ? "danger" : order.status === "Working" || order.status === "Staged" ? "warning" : "success"} />
                    </div>
                    <div style={{ color: "#cbd5e1", marginTop: 8 }}>{order.symbol} | {order.side} | {order.type}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {annotations.map((annotation) => (
                        <ProductPill key={`${order.id}-${annotation.label}`} label={annotation.label} tone={annotation.tone} />
                      ))}
                      {reviewEntry?.bookmarked ? <ProductPill label="Bookmarked" tone="warning" /> : null}
                      {(reviewEntry?.verdicts || []).map((verdict) => (
                        <ProductPill key={`${reviewKey}-${verdict}`} label={formatVerdictLabel(verdict)} tone="info" />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button type="button" onClick={() => toggleReplayBookmark("order", order)} style={reviewToggleStyle(Boolean(reviewEntry?.bookmarked), "warning")}>
                        {reviewEntry?.bookmarked ? "Bookmarked" : "Bookmark"}
                      </button>
                      {activeReplayQueue ? (
                        <button
                          type="button"
                          onClick={() => toggleReplayQueueItem(activeReplayQueue.id, "order", order)}
                          style={reviewToggleStyle(Boolean(activeReplayQueue.itemKeys?.includes(reviewKey)), "info")}
                        >
                          {activeReplayQueue.itemKeys?.includes(reviewKey) ? `In ${activeReplayQueue.name}` : `Queue ${activeReplayQueue.name}`}
                        </button>
                      ) : null}
                      {replayVerdictOptions.map((verdict) => (
                        <button
                          key={`${reviewKey}-toggle-${verdict}`}
                          type="button"
                          onClick={() => toggleReplayVerdict("order", order, verdict)}
                          style={reviewToggleStyle(Boolean(reviewEntry?.verdicts?.includes(verdict)), verdict === "risky" ? "danger" : verdict === "strong" || verdict === "disciplined" ? "success" : "neutral")}
                        >
                          {formatVerdictLabel(verdict)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={modulePanelStyle("danger")}>
            <div style={sectionLabelStyle()}>Execution And Alerts</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Replay Queue</div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {filteredEvents.slice(0, 4).map((event) => {
                const annotations = annotationPills(event, watchlistLookup, activeWatchlist, chartOverlayModel, protectionState, selectedSymbol, selectedRoute);
                const reviewKey = buildReplayMarkKey("event", event);
                const reviewEntry = replayReviewMarks?.[reviewKey] || null;
                return (
                  <div key={event.id} style={moduleInsetStyle(event.status === "Rejected" ? "danger" : event.status === "Partially Filled" ? "warning" : "info", 14)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{event.symbol} | {event.event}</strong>
                      <ProductPill label={event.status} tone={event.status === "Rejected" ? "danger" : event.status === "Partially Filled" ? "warning" : "info"} />
                    </div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{event.detail}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {annotations.map((annotation) => (
                        <ProductPill key={`${event.id}-${annotation.label}`} label={annotation.label} tone={annotation.tone} />
                      ))}
                      {reviewEntry?.bookmarked ? <ProductPill label="Bookmarked" tone="warning" /> : null}
                      {(reviewEntry?.verdicts || []).map((verdict) => (
                        <ProductPill key={`${reviewKey}-${verdict}`} label={formatVerdictLabel(verdict)} tone="info" />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button type="button" onClick={() => toggleReplayBookmark("event", event)} style={reviewToggleStyle(Boolean(reviewEntry?.bookmarked), "warning")}>
                        {reviewEntry?.bookmarked ? "Bookmarked" : "Bookmark"}
                      </button>
                      {activeReplayQueue ? (
                        <button
                          type="button"
                          onClick={() => toggleReplayQueueItem(activeReplayQueue.id, "event", event)}
                          style={reviewToggleStyle(Boolean(activeReplayQueue.itemKeys?.includes(reviewKey)), "info")}
                        >
                          {activeReplayQueue.itemKeys?.includes(reviewKey) ? `In ${activeReplayQueue.name}` : `Queue ${activeReplayQueue.name}`}
                        </button>
                      ) : null}
                      {replayVerdictOptions.map((verdict) => (
                        <button
                          key={`${reviewKey}-toggle-${verdict}`}
                          type="button"
                          onClick={() => toggleReplayVerdict("event", event, verdict)}
                          style={reviewToggleStyle(Boolean(reviewEntry?.verdicts?.includes(verdict)), verdict === "risky" ? "danger" : verdict === "strong" || verdict === "disciplined" ? "success" : "neutral")}
                        >
                          {formatVerdictLabel(verdict)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredAlerts.slice(0, 4).map((alert) => {
                const annotations = annotationPills(alert, watchlistLookup, activeWatchlist, chartOverlayModel, protectionState, selectedSymbol, selectedRoute);
                const reviewKey = buildReplayMarkKey("alert", alert);
                const reviewEntry = replayReviewMarks?.[reviewKey] || null;
                return (
                  <div key={alert.id} style={moduleInsetStyle(alert.tone || "warning", 14)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{alert.label}</strong>
                      <ProductPill label={alert.severity} tone={alert.tone || "warning"} />
                    </div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{alert.reason}</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{alert.recommendedAction}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {annotations.map((annotation) => (
                        <ProductPill key={`${alert.id}-${annotation.label}`} label={annotation.label} tone={annotation.tone} />
                      ))}
                      {reviewEntry?.bookmarked ? <ProductPill label="Bookmarked" tone="warning" /> : null}
                      {(reviewEntry?.verdicts || []).map((verdict) => (
                        <ProductPill key={`${reviewKey}-${verdict}`} label={formatVerdictLabel(verdict)} tone="info" />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button type="button" onClick={() => toggleReplayBookmark("alert", alert)} style={reviewToggleStyle(Boolean(reviewEntry?.bookmarked), "warning")}>
                        {reviewEntry?.bookmarked ? "Bookmarked" : "Bookmark"}
                      </button>
                      {activeReplayQueue ? (
                        <button
                          type="button"
                          onClick={() => toggleReplayQueueItem(activeReplayQueue.id, "alert", alert)}
                          style={reviewToggleStyle(Boolean(activeReplayQueue.itemKeys?.includes(reviewKey)), "info")}
                        >
                          {activeReplayQueue.itemKeys?.includes(reviewKey) ? `In ${activeReplayQueue.name}` : `Queue ${activeReplayQueue.name}`}
                        </button>
                      ) : null}
                      {replayVerdictOptions.map((verdict) => (
                        <button
                          key={`${reviewKey}-toggle-${verdict}`}
                          type="button"
                          onClick={() => toggleReplayVerdict("alert", alert, verdict)}
                          style={reviewToggleStyle(Boolean(reviewEntry?.verdicts?.includes(verdict)), verdict === "risky" ? "danger" : verdict === "strong" || verdict === "disciplined" ? "success" : "neutral")}
                        >
                          {formatVerdictLabel(verdict)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
