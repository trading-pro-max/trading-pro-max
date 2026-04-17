"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { coreModules } from "./product-modules";
import { exportContinuityInsightReport } from "./product-local-files";
import { ProductRuntimeDiagnostics } from "./ProductRuntimeDiagnostics";
import { getLiveDataRefreshInterval, getZeroCostLiveMode } from "./product-live-data";
import { useProductTradingStore } from "./product-trading-store";
import { createButton, createPillStyle, createSurface, deskTheme, toneMap } from "./product-theme";

function parsePnl(value) {
  const parsed = Number.parseFloat(String(value || "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPnl(total) {
  const sign = total < 0 ? "-" : "+";
  return `${sign}$${Math.abs(total).toFixed(0)}`;
}

function fieldStyle() {
  return {
    background: "rgba(8, 15, 29, 0.92)",
    color: deskTheme.colors.text,
    borderRadius: deskTheme.radii.md,
    border: `1px solid ${deskTheme.colors.line}`,
    padding: 11,
    fontFamily: deskTheme.fonts.ui,
    boxShadow: deskTheme.shadows.inner
  };
}

function summarizeContinuityInsightPosture(report) {
  if (!report) {
    return {
      tone: "neutral",
      posture: "No report",
      summary: "Save a continuity insight report in Journal Vault to keep drift posture visible here.",
      hint: "No saved continuity insight"
    };
  }

  const counts = (report.trendSnapshots || []).reduce(
    (accumulator, snapshot) => {
      const key = String(snapshot?.state || "").toLowerCase();
      if (key === "improving") accumulator.improving += 1;
      if (key === "stable") accumulator.stable += 1;
      if (key === "worsening") accumulator.worsening += 1;
      return accumulator;
    },
    { improving: 0, stable: 0, worsening: 0 }
  );
  const dominant = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] || ["stable", 0];
  const posture =
    dominant[0] === "improving" ? "Improving" : dominant[0] === "worsening" ? "Worsening" : "Stable";
  const tone = posture === "Improving" ? "success" : posture === "Worsening" ? "warning" : "info";
  const topReasoning = Array.isArray(report.reasoning) ? report.reasoning[0] : "";

  return {
    tone,
    posture,
    summary:
      topReasoning ||
      `${report.filters?.route || "All Routes"} | ${report.filters?.protectionState || "All Protection"} | ${report.filters?.symbol || "All Symbols"}`,
    hint: `${report.name} | ${(report.driftClusters || []).length} drift lanes | ${(report.macroAnalytics?.frequencyRows || []).length} macros`
  };
}

export function ProductWorkspaceChrome({ children, title, actions = [] }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const hydrated = useProductTradingStore((state) => state.hydrated);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const chartTimeframe = useProductTradingStore((state) => state.chartTimeframe);
  const riskMode = useProductTradingStore((state) => state.riskMode);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const riskSummary = useProductTradingStore((state) => state.riskSummary);
  const openPositions = useProductTradingStore((state) => state.openPositions);
  const recentActions = useProductTradingStore((state) => state.recentActions);
  const densityMode = useProductTradingStore((state) => state.densityMode);
  const themeMode = useProductTradingStore((state) => state.themeMode);
  const defaultRiskMode = useProductTradingStore((state) => state.defaultRiskMode);
  const preferredSymbol = useProductTradingStore((state) => state.preferredSymbol);
  const preferredRoute = useProductTradingStore((state) => state.preferredRoute);
  const savedWatchlists = useProductTradingStore((state) => state.savedWatchlists);
  const activeWatchlist = useProductTradingStore((state) => state.activeWatchlist);
  const reviewSnapshots = useProductTradingStore((state) => state.reviewSnapshots);
  const activeReviewSnapshotId = useProductTradingStore((state) => state.activeReviewSnapshotId);
  const continuityWorkspaceMacros = useProductTradingStore((state) => state.continuityWorkspaceMacros);
  const activeContinuityMacroId = useProductTradingStore((state) => state.activeContinuityMacroId);
  const continuityInsightReports = useProductTradingStore((state) => state.continuityInsightReports);
  const activeContinuityInsightReportId = useProductTradingStore((state) => state.activeContinuityInsightReportId);
  const continuityInsightCollections = useProductTradingStore((state) => state.continuityInsightCollections);
  const activeContinuityInsightCollectionId = useProductTradingStore((state) => state.activeContinuityInsightCollectionId);
  const continuityInsightPrimaryReportId = useProductTradingStore((state) => state.continuityInsightPrimaryReportId);
  const continuityInsightComparisonReportId = useProductTradingStore((state) => state.continuityInsightComparisonReportId);
  const replayQueues = useProductTradingStore((state) => state.replayQueues);
  const activeReplayQueueId = useProductTradingStore((state) => state.activeReplayQueueId);
  const handoffNotes = useProductTradingStore((state) => state.handoffNotes);
  const pinnedReviewSnapshotIds = useProductTradingStore((state) => state.pinnedReviewSnapshotIds);
  const pinnedReplayQueueIds = useProductTradingStore((state) => state.pinnedReplayQueueIds);
  const pinnedHandoffNoteIds = useProductTradingStore((state) => state.pinnedHandoffNoteIds);
  const liveDataSource = useProductTradingStore((state) => state.liveDataSource);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const liveDataDiagnostics = useProductTradingStore((state) => state.liveDataDiagnostics);
  const liveDataProviders = useProductTradingStore((state) => state.liveDataProviders);
  const routeLibrary = useProductTradingStore((state) => state.routeLibrary);
  const executionProvider = useProductTradingStore((state) => state.executionProvider);
  const executionProviders = useProductTradingStore((state) => state.executionProviders);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const watchlistTemplates = useProductTradingStore((state) => state.watchlistTemplates);
  const startupTemplateKey = useProductTradingStore((state) => state.startupTemplateKey);
  const infinityOrchestrator = useProductTradingStore((state) => state.infinityOrchestrator);
  const infinityLoop = useProductTradingStore((state) => state.infinityLoop);
  const setThemeMode = useProductTradingStore((state) => state.setThemeMode);
  const setDensityMode = useProductTradingStore((state) => state.setDensityMode);
  const setDefaultRiskMode = useProductTradingStore((state) => state.setDefaultRiskMode);
  const setPreferredSymbol = useProductTradingStore((state) => state.setPreferredSymbol);
  const setPreferredRoute = useProductTradingStore((state) => state.setPreferredRoute);
  const activateSavedWatchlist = useProductTradingStore((state) => state.activateSavedWatchlist);
  const setLiveDataSource = useProductTradingStore((state) => state.setLiveDataSource);
  const setExecutionProvider = useProductTradingStore((state) => state.setExecutionProvider);
  const setStartupTemplate = useProductTradingStore((state) => state.setStartupTemplate);
  const clearStartupTemplate = useProductTradingStore((state) => state.clearStartupTemplate);
  const loadReviewSnapshot = useProductTradingStore((state) => state.loadReviewSnapshot);
  const launchContinuityWorkspaceMacro = useProductTradingStore((state) => state.launchContinuityWorkspaceMacro);
  const loadContinuityInsightReport = useProductTradingStore((state) => state.loadContinuityInsightReport);
  const reopenLatestContinuityInsightPair = useProductTradingStore((state) => state.reopenLatestContinuityInsightPair);
  const reopenLatestContinuityInsightCollection = useProductTradingStore((state) => state.reopenLatestContinuityInsightCollection);
  const setActiveReplayQueue = useProductTradingStore((state) => state.setActiveReplayQueue);
  const togglePinnedReviewSnapshot = useProductTradingStore((state) => state.togglePinnedReviewSnapshot);
  const togglePinnedReplayQueue = useProductTradingStore((state) => state.togglePinnedReplayQueue);
  const togglePinnedHandoffNote = useProductTradingStore((state) => state.togglePinnedHandoffNote);
  const restoreHandoffContext = useProductTradingStore((state) => state.restoreHandoffContext);
  const resumeLastReviewStack = useProductTradingStore((state) => state.resumeLastReviewStack);
  const resumePinnedReviewStack = useProductTradingStore((state) => state.resumePinnedReviewStack);
  const tickLiveData = useProductTradingStore((state) => state.tickLiveData);
  const refreshLiveDataAdapter = useProductTradingStore((state) => state.refreshLiveDataAdapter);
  const saveSession = useProductTradingStore((state) => state.saveSession);
  const restoreSavedSession = useProductTradingStore((state) => state.restoreSavedSession);
  const resetSession = useProductTradingStore((state) => state.resetSession);
  const recordContinuityAlert = useProductTradingStore((state) => state.recordContinuityAlert);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;

    if (liveDataSource === "demo") {
      const intervalId = window.setInterval(() => {
        tickLiveData();
      }, 4500);

      return () => window.clearInterval(intervalId);
    }

    const intervalId = window.setInterval(() => {
      refreshLiveDataAdapter();
    }, getLiveDataRefreshInterval(liveDataSource));

    return () => window.clearInterval(intervalId);
  }, [hydrated, liveDataSource, refreshLiveDataAdapter, tickLiveData]);

  useEffect(() => {
    if (!hydrated || liveDataSource === "demo" || !selectedSymbol) return undefined;

    const timeoutId = window.setTimeout(() => {
      refreshLiveDataAdapter();
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [chartTimeframe, hydrated, liveDataSource, refreshLiveDataAdapter, selectedSymbol]);

  const gap = densityMode === "Compact" ? 12 : densityMode === "Spacious" ? 22 : 18;
  const latestAction = recentActions[0];
  const preferredRoutes = useMemo(() => Array.from(new Set(routeLibrary.map((route) => route.name))), [routeLibrary]);
  const activePnl = useMemo(() => formatPnl(openPositions.reduce((total, position) => total + parsePnl(position.pnl), 0)), [openPositions]);
  const zeroCostMode = useMemo(() => getZeroCostLiveMode(liveDataSource, liveDataStatus), [liveDataSource, liveDataStatus]);
  const startupTemplate = useMemo(
    () => watchlistTemplates.find((template) => template.key === startupTemplateKey) || null,
    [startupTemplateKey, watchlistTemplates]
  );
  const latestSavedSnapshot = useMemo(() => reviewSnapshots[0] || null, [reviewSnapshots]);
  const activeReplayQueue = useMemo(
    () => replayQueues.find((queue) => queue.id === activeReplayQueueId) || null,
    [activeReplayQueueId, replayQueues]
  );
  const activeContinuityMacro = useMemo(
    () => continuityWorkspaceMacros.find((macro) => macro.id === activeContinuityMacroId) || continuityWorkspaceMacros[0] || null,
    [activeContinuityMacroId, continuityWorkspaceMacros]
  );
  const activeContinuityInsightReport = useMemo(
    () =>
      continuityInsightReports.find((report) => report.id === activeContinuityInsightReportId) ||
      continuityInsightReports[0] ||
      null,
    [activeContinuityInsightReportId, continuityInsightReports]
  );
  const latestContinuityInsightCollection = useMemo(
    () =>
      continuityInsightCollections.find((collection) => collection.id === activeContinuityInsightCollectionId) ||
      continuityInsightCollections[0] ||
      null,
    [activeContinuityInsightCollectionId, continuityInsightCollections]
  );
  const continuityInsightPosture = useMemo(
    () => summarizeContinuityInsightPosture(activeContinuityInsightReport),
    [activeContinuityInsightReport]
  );
  const latestHandoffNote = useMemo(() => handoffNotes[0] || null, [handoffNotes]);
  const activeReviewSnapshot = useMemo(
    () => reviewSnapshots.find((snapshot) => snapshot.id === activeReviewSnapshotId) || null,
    [activeReviewSnapshotId, reviewSnapshots]
  );
  const pinnedSnapshots = useMemo(
    () => pinnedReviewSnapshotIds.map((id) => reviewSnapshots.find((snapshot) => snapshot.id === id)).filter(Boolean),
    [pinnedReviewSnapshotIds, reviewSnapshots]
  );
  const pinnedQueues = useMemo(
    () => pinnedReplayQueueIds.map((id) => replayQueues.find((queue) => queue.id === id)).filter(Boolean),
    [pinnedReplayQueueIds, replayQueues]
  );
  const pinnedHandoffs = useMemo(
    () => pinnedHandoffNoteIds.map((id) => handoffNotes.find((note) => note.id === id)).filter(Boolean),
    [handoffNotes, pinnedHandoffNoteIds]
  );
  const pinnedContinuityPack = useMemo(() => {
    const handoff = pinnedHandoffs[0] || null;
    const snapshot = pinnedSnapshots[0] || null;
    const queue = pinnedQueues[0] || null;
    if (!handoff && !snapshot && !queue) return null;

    return {
      label: handoff?.watchlistName || snapshot?.name || queue?.name || "Pinned continuity pack",
      hint: `${handoff?.snapshotName || snapshot?.name || "No snapshot"} | ${handoff?.replayQueueName || queue?.name || "No queue"} | ${handoff?.sessionIntent || "No intent"}`,
      tone: handoff ? "success" : snapshot ? "info" : "warning"
    };
  }, [pinnedHandoffs, pinnedQueues, pinnedSnapshots]);
  const continuityDriftAlert = useMemo(() => {
    if (!pinnedContinuityPack) return null;

    const pinnedHandoff = pinnedHandoffs[0] || null;
    const pinnedSnapshot = pinnedSnapshots[0] || null;
    const pinnedQueue = pinnedQueues[0] || null;
    const expectedSnapshot = pinnedHandoff?.snapshotName || pinnedSnapshot?.name || "";
    const expectedQueue = pinnedHandoff?.replayQueueName || pinnedQueue?.name || "";
    const expectedSymbol =
      pinnedHandoff?.selectedSymbol ||
      pinnedSnapshot?.comparisonPack?.runtime?.selectedSymbol ||
      pinnedSnapshot?.baselinePack?.runtime?.selectedSymbol ||
      "";
    const expectedRoute =
      pinnedHandoff?.selectedRoute ||
      pinnedSnapshot?.comparisonPack?.runtime?.selectedRoute ||
      pinnedSnapshot?.baselinePack?.runtime?.selectedRoute ||
      "";
    const mismatches = [];

    if (expectedSnapshot && activeReviewSnapshot?.name && expectedSnapshot !== activeReviewSnapshot.name) {
      mismatches.push(`Snapshot moved from ${expectedSnapshot} to ${activeReviewSnapshot.name}`);
    }
    if (expectedQueue && activeReplayQueue?.name && expectedQueue !== activeReplayQueue.name) {
      mismatches.push(`Replay queue changed from ${expectedQueue} to ${activeReplayQueue.name}`);
    }
    if (expectedSymbol && selectedSymbol && expectedSymbol !== selectedSymbol) {
      mismatches.push(`Symbol shifted from ${expectedSymbol} to ${selectedSymbol}`);
    }
    if (expectedRoute && selectedRoute?.name && expectedRoute !== selectedRoute.name) {
      mismatches.push(`Route changed from ${expectedRoute} to ${selectedRoute.name}`);
    }

    if (mismatches.length < 2) return null;

    const severity = mismatches.length >= 3 ? "Critical" : "Warning";
    const tone = mismatches.length >= 3 ? "danger" : "warning";

    return {
      severity,
      tone,
      reason: mismatches.slice(0, 2).join(" | "),
      recommendedAction:
        "Resume the pinned continuity pack if you want the prior review context, or pin the current stack if this drift is intentional."
    };
  }, [
    activeReplayQueue,
    activeReviewSnapshot,
    pinnedContinuityPack,
    pinnedHandoffs,
    pinnedQueues,
    pinnedSnapshots,
    selectedRoute,
    selectedSymbol
  ]);
  const sessionRail = useMemo(
    () => [
      { label: "Active PnL", value: activePnl, hint: `${openPositions.length} open positions`, tone: activePnl.startsWith("-") ? "danger" : "success" },
      { label: "Open Risk", value: riskSummary?.openRisk || "--", hint: riskSummary?.guardStatus || "Risk posture not available", tone: "warning" },
      { label: "Latest Action", value: latestAction?.title || "Session idle", hint: latestAction?.detail || "Execution, route, and journal flow appear here.", tone: latestAction ? "info" : "neutral" },
      { label: "Symbol", value: selectedSymbol || "No symbol", hint: "Shared watchlist context", tone: "neutral" },
      { label: "Route", value: selectedRoute?.name || "No route", hint: selectedRoute?.state || "No route state", tone: "info" },
      { label: "Risk Mode", value: riskMode, hint: `${protectionState} protection`, tone: protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "info" },
      {
        label: "Continuity",
        value: latestHandoffNote?.watchlistName || activeReviewSnapshot?.name || activeReplayQueue?.name || "No active packet",
        hint: `${activeReviewSnapshot?.name || "No snapshot"} | ${activeReplayQueue?.name || "No queue"} | ${latestHandoffNote?.sessionIntent || "No intent"}`,
        tone: latestHandoffNote ? "success" : activeReviewSnapshot || activeReplayQueue ? "info" : "neutral"
      },
      {
        label: "Pinned Pack",
        value: pinnedContinuityPack?.label || "No pinned pack",
        hint: pinnedContinuityPack?.hint || "Pin a handoff, snapshot, or replay queue for one-click continuity resume",
        tone: pinnedContinuityPack?.tone || "neutral",
        actionKey: pinnedContinuityPack ? "resume-pinned-pack" : ""
      },
      {
        label: "Insight Posture",
        value: continuityInsightPosture.posture,
        hint: continuityInsightPosture.hint,
        tone: continuityInsightPosture.tone
      }
    ],
    [
      activePnl,
      continuityInsightPosture.hint,
      continuityInsightPosture.posture,
      continuityInsightPosture.tone,
      activeReplayQueue,
      activeReviewSnapshot,
      latestAction,
      latestHandoffNote,
      openPositions.length,
      pinnedContinuityPack,
      protectionState,
      riskMode,
      riskSummary,
      selectedRoute,
      selectedSymbol
    ]
  );
  const runtimeRail = useMemo(
    () => [
      {
        label: "Mode",
        value: getZeroCostLiveMode(liveDataSource, liveDataStatus).label,
        hint: getZeroCostLiveMode(liveDataSource, liveDataStatus).detail,
        tone: getZeroCostLiveMode(liveDataSource, liveDataStatus).tone
      },
      {
        label: "Live Source",
        value: liveDataStatus?.label || "Feed offline",
        hint: `${liveDataStatus?.state || "Waiting"} | ${liveDataDiagnostics?.feedHealth || liveDataStatus?.mode || "No source"}`,
        tone: liveDataStatus?.tone || "neutral"
      },
      {
        label: "Heartbeat",
        value: liveDataStatus?.heartbeat || "--:--:--",
        hint: `${liveDataStatus?.freshness || "Waiting"} | ${liveDataStatus?.latency || "Waiting"} | ${liveDataStatus?.providerSymbol || "No mapping"}`,
        tone: liveDataStatus?.tone || "neutral"
      },
      {
        label: "Execution",
        value: executionStatus?.label || "Execution offline",
        hint: `${executionStatus?.state || "Waiting"} | ${executionStatus?.mode || "No engine"}`,
        tone: executionStatus?.tone || "neutral"
      },
      {
        label: "Infinity",
        value: infinityLoop?.status || "Guarded standby",
        hint: `${infinityOrchestrator?.topPriority?.label || "No priority"} | ${infinityOrchestrator?.nextRecommendedAction?.label || "Observe"}`,
        tone: infinityLoop?.tone || "neutral"
      },
      {
        label: "Order Queue",
        value: `${executionStatus?.pendingOrders ?? 0} pending`,
        hint: `${executionStatus?.partialFills ?? 0} partials | ${executionStatus?.rejectedOrders ?? 0} rejects`,
        tone: executionStatus?.rejectedOrders ? "danger" : executionStatus?.pendingOrders ? "warning" : "success"
      }
    ],
    [executionStatus, infinityLoop, infinityOrchestrator, liveDataDiagnostics, liveDataSource, liveDataStatus]
  );

  function openJournalWorkspace() {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/journal-vault") {
      window.location.assign("/journal-vault");
    }
  }

  function applyHandoffContext(note) {
    if (!note) return;
    restoreHandoffContext(note.id);
    openJournalWorkspace();
  }

  function handleResumeLastReview() {
    resumeLastReviewStack();
    openJournalWorkspace();
  }

  function handleResumePinnedPack() {
    resumePinnedReviewStack();
    openJournalWorkspace();
  }

  function handleLaunchContinuityMacro(macro) {
    if (!macro) return;
    launchContinuityWorkspaceMacro(macro.id);
    openJournalWorkspace();
  }

  function handleOpenContinuityInsightReport(report) {
    if (report) {
      loadContinuityInsightReport(report.id);
    }
    openJournalWorkspace();
  }

  function handleExportActiveContinuityInsight() {
    if (!activeContinuityInsightReport) {
      openJournalWorkspace();
      return;
    }
    exportContinuityInsightReport(activeContinuityInsightReport);
  }

  function handleReopenLatestContinuityPair() {
    reopenLatestContinuityInsightPair();
    openJournalWorkspace();
  }

  function handleReopenLatestContinuityCollection() {
    reopenLatestContinuityInsightCollection();
    openJournalWorkspace();
  }

  const canResumeReview = Boolean(latestHandoffNote || activeReviewSnapshot || latestSavedSnapshot || activeReplayQueue);
  const canResumePinnedPack = Boolean(pinnedContinuityPack);
  const hasContinuityInsightPair = Boolean(
    continuityInsightPrimaryReportId &&
      continuityInsightComparisonReportId &&
      continuityInsightPrimaryReportId !== continuityInsightComparisonReportId
  );

  useEffect(() => {
    if (!continuityDriftAlert) return;

    recordContinuityAlert({
      ...continuityDriftAlert,
      watchlistName: latestHandoffNote?.watchlistName || activeWatchlist?.name || "",
      snapshotName: activeReviewSnapshot?.name || pinnedSnapshots[0]?.name || "",
      queueName: activeReplayQueue?.name || pinnedQueues[0]?.name || "",
      sessionIntent: latestHandoffNote?.sessionIntent || activeWatchlist?.sessionIntent || "",
      symbol: selectedSymbol,
      route: selectedRoute?.name || "",
      protectionState
    });
  }, [
    activeReplayQueue,
    activeReviewSnapshot,
    activeWatchlist,
    continuityDriftAlert,
    latestHandoffNote,
    pinnedQueues,
    pinnedSnapshots,
    protectionState,
    recordContinuityAlert,
    selectedRoute,
    selectedSymbol
  ]);

  return (
    <div style={{ display: "grid", gap }}>
      <section style={{ ...createSurface({ level: "hero", accent: "info", padding: 22, radius: "xxl" }) }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3.2, textTransform: "uppercase", color: deskTheme.colors.sky, fontWeight: 900 }}>Trading Pro Max OS</div>
                <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: -0.8, marginTop: 10 }}>Connected Trading Workspace</div>
                <div style={{ color: "#d6e2f2", marginTop: 10, lineHeight: 1.7, maxWidth: 840 }}>{title} is running inside the shared local product session with synchronized execution, risk, AI, and journal state.</div>
              </div>
              <button type="button" onClick={() => setPaletteOpen(true)} style={createButton({ tone: "info" })}>
                Quick Actions
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {coreModules.map((module) => (
                <Link key={module.href} href={module.href} style={{ ...createButton({ compact: true, tone: module.tone }), minWidth: 158, justifyContent: "center" }}>
                  {module.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...createSurface({ level: "elevated", accent: "info", padding: 16, radius: "xl" }) }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Workspace Status</div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{latestAction?.title || "Session idle"}</div>
                </div>
                <span style={createPillStyle("info")}>Ctrl/Cmd+K</span>
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 10, lineHeight: 1.65 }}>{latestAction?.detail || "Execution, risk, note, and route changes stream here across the connected product."}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <span style={createPillStyle("neutral")}>Save snapshot</span>
                <span style={createPillStyle("neutral")}>Restore snapshot</span>
                <span style={createPillStyle("neutral")}>Reset session</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {canResumeReview ? (
                  <button type="button" onClick={handleResumeLastReview} style={createButton({ compact: true, tone: "success" })}>
                    Resume Last Review
                  </button>
                ) : (
                  <span style={createPillStyle("neutral")}>No review stack saved yet</span>
                )}
              </div>
            </div>

            <div style={{ ...createSurface({ level: "elevated", accent: "slate", padding: 16, radius: "xl" }) }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Desk Preferences</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>Stored locally for the current product session and shared across modules.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Theme Mode</span>
                  <select value={themeMode} onChange={(event) => setThemeMode(event.target.value)} style={fieldStyle()}>
                    <option>Desk Dark</option>
                    <option>Desk Light</option>
                    <option>Night Ops</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Density</span>
                  <select value={densityMode} onChange={(event) => setDensityMode(event.target.value)} style={fieldStyle()}>
                    <option>Compact</option>
                    <option>Comfortable</option>
                    <option>Spacious</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Default Risk Mode</span>
                  <select value={defaultRiskMode} onChange={(event) => setDefaultRiskMode(event.target.value)} style={fieldStyle()}>
                    <option>Defensive</option>
                    <option>Balanced</option>
                    <option>Aggressive</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Preferred Symbol</span>
                  <input value={preferredSymbol || ""} onChange={(event) => setPreferredSymbol(event.target.value)} placeholder="EUR/USD" style={fieldStyle()} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Live Data Source</span>
                  <select value={liveDataSource} onChange={(event) => setLiveDataSource(event.target.value)} style={fieldStyle()}>
                    {liveDataProviders.map((provider) => (
                      <option key={provider.key} value={provider.key}>{provider.label}</option>
                    ))}
                  </select>
                  <span style={{ color: deskTheme.colors.muted, fontSize: 12, lineHeight: 1.55 }}>
                    {zeroCostMode.detail}
                  </span>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Execution Provider</span>
                  <select value={executionProvider} onChange={(event) => setExecutionProvider(event.target.value)} style={fieldStyle()}>
                    {executionProviders.map((provider) => (
                      <option key={provider.key} value={provider.key}>{provider.label}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Preferred Route</span>
                  <select value={preferredRoute || ""} onChange={(event) => setPreferredRoute(event.target.value)} style={fieldStyle()}>
                    <option value="">Use active route</option>
                    {preferredRoutes.map((route) => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                  <span style={{ color: deskTheme.colors.soft, fontSize: 12 }}>Startup Template</span>
                  <select
                    value={startupTemplateKey || ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        clearStartupTemplate();
                      } else {
                        setStartupTemplate(value);
                      }
                    }}
                    style={fieldStyle()}
                  >
                    <option value="">Use current desk defaults</option>
                    {watchlistTemplates.map((template) => (
                      <option key={template.key} value={template.key}>{template.name}</option>
                    ))}
                  </select>
                  <span style={{ color: deskTheme.colors.muted, fontSize: 12, lineHeight: 1.55 }}>
                    {startupTemplate
                      ? `${startupTemplate.name} will load on next launch with ${startupTemplate.preset?.preferredTimeframe || "its"} preset focus.`
                      : "No startup template armed. The desk will reopen with the normal local session defaults."}
                  </span>
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {watchlistTemplates.slice(0, 4).map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => setStartupTemplate(template.key)}
                    style={createButton({ compact: true, tone: startupTemplateKey === template.key ? "warning" : "neutral" })}
                  >
                    {startupTemplateKey === template.key ? `Startup: ${template.name}` : template.name}
                  </button>
                ))}
                {startupTemplateKey ? (
                  <button type="button" onClick={clearStartupTemplate} style={createButton({ compact: true, tone: "danger" })}>
                    Clear Startup
                  </button>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" onClick={saveSession} style={createButton({ tone: "neutral" })}>Save State</button>
                <button type="button" onClick={restoreSavedSession} style={createButton({ tone: "info" })}>Restore State</button>
                <button type="button" onClick={resetSession} style={createButton({ tone: "danger" })}>Reset Session</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))", gap: 10, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${deskTheme.colors.line}` }}>
          {sessionRail.map((item) => (
            <div key={item.label} style={{ ...createSurface({ level: "elevated", accent: item.tone === "neutral" ? "slate" : item.tone, padding: 14, radius: "lg" }) }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: toneMap[item.tone] || deskTheme.colors.text, letterSpacing: -0.4 }}>{item.value}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>{item.hint}</div>
              {item.actionKey === "resume-pinned-pack" && canResumePinnedPack ? (
                <div style={{ marginTop: 12 }}>
                  <button type="button" onClick={handleResumePinnedPack} style={createButton({ compact: true, tone: "success" })}>
                    Resume Pinned Pack
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {continuityDriftAlert ? (
          <div style={{ ...createSurface({ level: "elevated", accent: continuityDriftAlert.tone, padding: 14, radius: "lg" }), marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Continuity Drift Alert</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8, color: toneMap[continuityDriftAlert.tone] || deskTheme.colors.text }}>
                  {continuityDriftAlert.severity}
                </div>
              </div>
              <button type="button" onClick={handleResumePinnedPack} style={createButton({ compact: true, tone: "success" })}>
                Resume Pinned Pack
              </button>
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 10, lineHeight: 1.6 }}>{continuityDriftAlert.reason}</div>
            <div style={{ color: deskTheme.colors.sky, marginTop: 8, lineHeight: 1.55 }}>{continuityDriftAlert.recommendedAction}</div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
          {runtimeRail.map((item) => (
            <div key={item.label} style={{ ...createSurface({ level: "elevated", accent: item.tone === "neutral" ? "slate" : item.tone, padding: 14, radius: "lg" }) }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8, color: toneMap[item.tone] || deskTheme.colors.text }}>{item.value}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>{item.hint}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
          <div style={{ ...createSurface({ level: "elevated", accent: latestHandoffNote ? "success" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Latest Handoff</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{latestHandoffNote?.watchlistName || "No handoff packet"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
              {latestHandoffNote
                ? `${latestHandoffNote.sessionIntent || "No intent"} | ${latestHandoffNote.replayQueueName || "No replay queue"} | ${latestHandoffNote.snapshotName || "No snapshot"}`
                : "Store a local handoff note in Journal Vault to keep next-session continuity visible here."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {latestHandoffNote ? (
                <>
                  <button type="button" onClick={() => applyHandoffContext(latestHandoffNote)} style={createButton({ compact: true, tone: "success" })}>
                    Open Handoff
                  </button>
                  <button type="button" onClick={handleResumeLastReview} style={createButton({ compact: true, tone: "info" })}>
                    Resume Stack
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinnedHandoffNote(latestHandoffNote.id)}
                    style={createButton({ compact: true, tone: pinnedHandoffNoteIds.includes(latestHandoffNote.id) ? "warning" : "neutral" })}
                  >
                    {pinnedHandoffNoteIds.includes(latestHandoffNote.id) ? "Pinned" : "Pin"}
                  </button>
                </>
              ) : (
                <span style={createPillStyle("neutral")}>Waiting for handoff note</span>
              )}
            </div>
          </div>

          <div style={{ ...createSurface({ level: "elevated", accent: activeReplayQueue ? "warning" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Active Replay Queue</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{activeReplayQueue?.name || "No active queue"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
              {activeReplayQueue
                ? `${activeReplayQueue.itemKeys?.length || 0} queued replay items for operator review.`
                : "Activate a replay queue in Journal Vault to keep the current review set visible here."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {activeReplayQueue ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReplayQueue(activeReplayQueue.id);
                      openJournalWorkspace();
                    }}
                    style={createButton({ compact: true, tone: "warning" })}
                  >
                    Open Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinnedReplayQueue(activeReplayQueue.id)}
                    style={createButton({ compact: true, tone: pinnedReplayQueueIds.includes(activeReplayQueue.id) ? "warning" : "neutral" })}
                  >
                    {pinnedReplayQueueIds.includes(activeReplayQueue.id) ? "Pinned" : "Pin"}
                  </button>
                </>
              ) : (
                <span style={createPillStyle("neutral")}>No replay queue active</span>
              )}
            </div>
          </div>

          <div style={{ ...createSurface({ level: "elevated", accent: latestSavedSnapshot ? "info" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Latest Snapshot</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{latestSavedSnapshot?.name || "No saved snapshot"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
              {latestSavedSnapshot
                ? `${latestSavedSnapshot.summary} | Active ${activeReviewSnapshot?.name || "comparison baseline"}`
                : "Save a review snapshot in Journal Vault to keep the latest baseline ready for fast desk review."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {latestSavedSnapshot ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      loadReviewSnapshot(latestSavedSnapshot.id);
                      openJournalWorkspace();
                    }}
                    style={createButton({ compact: true, tone: "info" })}
                  >
                    Load Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinnedReviewSnapshot(latestSavedSnapshot.id)}
                    style={createButton({ compact: true, tone: pinnedReviewSnapshotIds.includes(latestSavedSnapshot.id) ? "warning" : "neutral" })}
                  >
                    {pinnedReviewSnapshotIds.includes(latestSavedSnapshot.id) ? "Pinned" : "Pin"}
                  </button>
                </>
              ) : (
                <span style={createPillStyle("neutral")}>No snapshot saved yet</span>
              )}
            </div>
          </div>

          <div style={{ ...createSurface({ level: "elevated", accent: activeContinuityMacro ? "warning" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Continuity Macros</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{activeContinuityMacro?.name || "No saved macro"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
              {activeContinuityMacro
                ? `${activeContinuityMacro.presetName || "Ad hoc view"} | ${activeContinuityMacro.replayQueueName || "No queue"} | ${activeContinuityMacro.sessionIntent || "No intent"}`
                : "Save a continuity workspace macro in Journal Vault to reopen review modes from anywhere in one click."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {continuityWorkspaceMacros.length ? (
                continuityWorkspaceMacros.slice(0, 3).map((macro) => (
                  <button
                    key={macro.id}
                    type="button"
                    onClick={() => handleLaunchContinuityMacro(macro)}
                    style={createButton({ compact: true, tone: activeContinuityMacroId === macro.id ? "warning" : "neutral" })}
                  >
                    {macro.name}
                  </button>
                ))
              ) : (
                <span style={createPillStyle("neutral")}>No continuity macros saved yet</span>
              )}
            </div>
          </div>

          <div style={{ ...createSurface({ level: "elevated", accent: continuityInsightPosture.tone, padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Continuity Insight</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{activeContinuityInsightReport?.name || "No saved insight report"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
              {continuityInsightPosture.summary}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
              <span style={createPillStyle(continuityInsightPosture.tone)}>{continuityInsightPosture.posture}</span>
              {activeContinuityInsightReport ? (
                <span style={createPillStyle("neutral")}>
                  {(activeContinuityInsightReport.driftClusters || []).length} drift lanes | {(activeContinuityInsightReport.macroAnalytics?.frequencyRows || []).length} macros
                </span>
              ) : null}
              {hasContinuityInsightPair ? <span style={createPillStyle("info")}>Comparison pair ready</span> : null}
              {latestContinuityInsightCollection ? (
                <span style={createPillStyle("success")}>
                  {latestContinuityInsightCollection.name} | {(latestContinuityInsightCollection.reportIds || []).length} reports
                </span>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" onClick={() => handleOpenContinuityInsightReport(activeContinuityInsightReport)} style={createButton({ compact: true, tone: continuityInsightPosture.tone === "warning" ? "warning" : "info" })}>
                {activeContinuityInsightReport ? "Open Insight" : "Open Journal Vault"}
              </button>
              <button type="button" onClick={handleExportActiveContinuityInsight} style={createButton({ compact: true, tone: "success" })}>
                Export Active
              </button>
              {hasContinuityInsightPair ? (
                <button type="button" onClick={handleReopenLatestContinuityPair} style={createButton({ compact: true, tone: "warning" })}>
                  Reopen Pair
                </button>
              ) : null}
              {latestContinuityInsightCollection ? (
                <button type="button" onClick={handleReopenLatestContinuityCollection} style={createButton({ compact: true, tone: "neutral" })}>
                  Reopen Collection
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
          <div style={{ ...createSurface({ level: "elevated", accent: pinnedHandoffs.length ? "success" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Pinned Handoffs</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {pinnedHandoffs.length ? (
                pinnedHandoffs.slice(0, 4).map((note) => (
                  <button key={note.id} type="button" onClick={() => applyHandoffContext(note)} style={createButton({ compact: true, tone: "success" })}>
                    {note.watchlistName || "Handoff"}
                  </button>
                ))
              ) : (
                <span style={createPillStyle("neutral")}>Pin a handoff packet for one-click restore</span>
              )}
            </div>
          </div>

          <div style={{ ...createSurface({ level: "elevated", accent: pinnedQueues.length ? "warning" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Pinned Queues</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {pinnedQueues.length ? (
                pinnedQueues.slice(0, 4).map((queue) => (
                  <button
                    key={queue.id}
                    type="button"
                    onClick={() => {
                      setActiveReplayQueue(queue.id);
                      openJournalWorkspace();
                    }}
                    style={createButton({ compact: true, tone: "warning" })}
                  >
                    {queue.name}
                  </button>
                ))
              ) : (
                <span style={createPillStyle("neutral")}>Pin a replay queue for faster review launch</span>
              )}
            </div>
          </div>

          <div style={{ ...createSurface({ level: "elevated", accent: pinnedSnapshots.length ? "info" : "slate", padding: 14, radius: "lg" }) }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>Pinned Snapshots</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {pinnedSnapshots.length ? (
                pinnedSnapshots.slice(0, 4).map((snapshot) => (
                  <button
                    key={snapshot.id}
                    type="button"
                    onClick={() => {
                      loadReviewSnapshot(snapshot.id);
                      openJournalWorkspace();
                    }}
                    style={createButton({ compact: true, tone: "info" })}
                  >
                    {snapshot.name}
                  </button>
                ))
              ) : (
                <span style={createPillStyle("neutral")}>Pin a snapshot for faster baseline review</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <ProductRuntimeDiagnostics
            title="Connected Runtime Diagnostics"
            subtitle="Shared feed, execution, route, protection, and active-symbol runtime health across Trading Pro Max."
            accent="info"
            compact
            maxSymbols={3}
          />
        </div>
      </section>

      {paletteOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.80)", backdropFilter: "blur(10px)", zIndex: 40, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(840px, 100%)", ...createSurface({ level: "hero", accent: "info", padding: 22, radius: "xxl" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5 }}>Quick Action Launcher</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Fast navigation, session controls, and operator shortcuts.</div>
              </div>
              <button type="button" onClick={() => setPaletteOpen(false)} style={createButton({ tone: "neutral" })}>Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {coreModules.map((module) => (
                <Link key={module.href} href={module.href} style={{ ...createSurface({ level: "elevated", accent: module.tone, padding: 16, radius: "xl" }), color: "inherit", textDecoration: "none" }} onClick={() => setPaletteOpen(false)}>
                  <div style={{ color: toneMap[module.tone] || deskTheme.colors.text, fontWeight: 900 }}>{module.label}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.55 }}>{module.summary}</div>
                </Link>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div style={{ ...createSurface({ level: "elevated", accent: "info", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Quick Watchlists</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {savedWatchlists.slice(0, 4).map((watchlist) => (
                    <button
                      key={watchlist.id}
                      type="button"
                      onClick={() => {
                        activateSavedWatchlist(watchlist.id);
                        setPaletteOpen(false);
                      }}
                      style={createButton({ compact: true, tone: "info" })}
                    >
                      {watchlist.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "warning", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Startup Templates</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {watchlistTemplates.slice(0, 4).map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => {
                        setStartupTemplate(template.key);
                        setPaletteOpen(false);
                      }}
                      style={createButton({ compact: true, tone: startupTemplateKey === template.key ? "warning" : "neutral" })}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "success", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Saved Snapshots</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {reviewSnapshots.slice(0, 4).map((snapshot) => (
                    <button
                      key={snapshot.id}
                      type="button"
                      onClick={() => {
                        loadReviewSnapshot(snapshot.id);
                        setPaletteOpen(false);
                        openJournalWorkspace();
                      }}
                      style={createButton({ compact: true, tone: "success" })}
                    >
                      {snapshot.name}
                    </button>
                  ))}
                  {!reviewSnapshots.length ? <span style={createPillStyle("neutral")}>No saved snapshots yet</span> : null}
                </div>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "neutral", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Replay Queues</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {replayQueues.slice(0, 4).map((queue) => (
                    <button
                      key={queue.id}
                      type="button"
                      onClick={() => {
                        setActiveReplayQueue(queue.id);
                        setPaletteOpen(false);
                        openJournalWorkspace();
                      }}
                      style={createButton({ compact: true, tone: "neutral" })}
                    >
                      {queue.name}
                    </button>
                  ))}
                  {!replayQueues.length ? <span style={createPillStyle("neutral")}>No replay queues yet</span> : null}
                </div>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "warning", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Continuity Macros</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {continuityWorkspaceMacros.slice(0, 4).map((macro) => (
                    <button
                      key={macro.id}
                      type="button"
                      onClick={() => {
                        handleLaunchContinuityMacro(macro);
                        setPaletteOpen(false);
                      }}
                      style={createButton({ compact: true, tone: activeContinuityMacroId === macro.id ? "warning" : "neutral" })}
                    >
                      {macro.name}
                    </button>
                  ))}
                  {!continuityWorkspaceMacros.length ? <span style={createPillStyle("neutral")}>No continuity macros yet</span> : null}
                </div>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "info", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Continuity Insight Shortcuts</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.55 }}>
                  Fast local actions for the active insight report, latest comparison pair, and latest saved collection.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportActiveContinuityInsight();
                      setPaletteOpen(false);
                    }}
                    style={createButton({ compact: true, tone: "success" })}
                  >
                    Export Active Insight
                  </button>
                  {hasContinuityInsightPair ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleReopenLatestContinuityPair();
                        setPaletteOpen(false);
                      }}
                      style={createButton({ compact: true, tone: "warning" })}
                    >
                      Reopen Latest Pair
                    </button>
                  ) : (
                    <span style={createPillStyle("neutral")}>No saved comparison pair yet</span>
                  )}
                  {latestContinuityInsightCollection ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleReopenLatestContinuityCollection();
                        setPaletteOpen(false);
                      }}
                      style={createButton({ compact: true, tone: "info" })}
                    >
                      Reopen Latest Collection
                    </button>
                  ) : (
                    <span style={createPillStyle("neutral")}>No saved collection yet</span>
                  )}
                </div>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "info", padding: 16, radius: "xl" }) }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Pinned Continuity Packs</div>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <div>
                    <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 800 }}>Pinned Handoffs</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {pinnedHandoffs.slice(0, 3).map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => {
                            applyHandoffContext(note);
                            setPaletteOpen(false);
                          }}
                          style={createButton({ compact: true, tone: "success" })}
                        >
                          {note.watchlistName || "Handoff"}
                        </button>
                      ))}
                      {!pinnedHandoffs.length ? <span style={createPillStyle("neutral")}>No pinned handoffs</span> : null}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 800 }}>Pinned Snapshots</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {pinnedSnapshots.slice(0, 3).map((snapshot) => (
                        <button
                          key={snapshot.id}
                          type="button"
                          onClick={() => {
                            loadReviewSnapshot(snapshot.id);
                            setPaletteOpen(false);
                            openJournalWorkspace();
                          }}
                          style={createButton({ compact: true, tone: "info" })}
                        >
                          {snapshot.name}
                        </button>
                      ))}
                      {!pinnedSnapshots.length ? <span style={createPillStyle("neutral")}>No pinned snapshots</span> : null}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 800 }}>Pinned Queues</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {pinnedQueues.slice(0, 3).map((queue) => (
                        <button
                          key={queue.id}
                          type="button"
                          onClick={() => {
                            setActiveReplayQueue(queue.id);
                            setPaletteOpen(false);
                            openJournalWorkspace();
                          }}
                          style={createButton({ compact: true, tone: "warning" })}
                        >
                          {queue.name}
                        </button>
                      ))}
                      {!pinnedQueues.length ? <span style={createPillStyle("neutral")}>No pinned queues</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {actions.map((action) => (
                <Link key={action.href} href={action.href} style={createButton({ primary: !!action.primary, tone: action.primary ? "success" : "neutral" })} onClick={() => setPaletteOpen(false)}>
                  {action.label}
                </Link>
              ))}
              {canResumeReview ? (
                <button
                  type="button"
                  onClick={() => {
                    handleResumeLastReview();
                    setPaletteOpen(false);
                  }}
                  style={createButton({ tone: "success" })}
                >
                  Resume Last Review
                </button>
              ) : null}
              <button type="button" onClick={saveSession} style={createButton({ tone: "neutral" })}>Save State</button>
              <button type="button" onClick={restoreSavedSession} style={createButton({ tone: "info" })}>Restore State</button>
              <button type="button" onClick={resetSession} style={createButton({ tone: "danger" })}>Reset Session</button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap }}>{children}</div>
    </div>
  );
}
