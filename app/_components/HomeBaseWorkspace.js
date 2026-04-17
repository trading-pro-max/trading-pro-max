"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { OperatorDeskAcceptancePanel } from "./OperatorDeskAcceptancePanel";
import { ProductCard, ProductGrid, ProductMetricRow, ProductPanel, ProductPill } from "./ProductShell";
import { ProductRuntimeDiagnostics } from "./ProductRuntimeDiagnostics";
import { selectHomeBaseSummary, useProductTradingStore } from "./product-trading-store";
import { createButton, createSurface, deskTheme } from "./product-theme";

function formatPnl(total) {
  const sign = total < 0 ? "-" : "+";
  return `${sign}$${Math.abs(total).toFixed(0)}`;
}

function parsePnl(value) {
  const parsed = Number.parseFloat(String(value || "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizeContinuityPosture(report) {
  if (!report) return { label: "Waiting", tone: "neutral", detail: "No saved continuity insight report is active." };
  const trendStates = (report.trendSnapshots || []).reduce(
    (accumulator, snapshot) => {
      const state = String(snapshot?.state || "").toLowerCase();
      if (state === "improving") accumulator.improving += 1;
      if (state === "stable") accumulator.stable += 1;
      if (state === "worsening") accumulator.worsening += 1;
      return accumulator;
    },
    { improving: 0, stable: 0, worsening: 0 }
  );
  const dominant = Object.entries(trendStates).sort((left, right) => right[1] - left[1])[0]?.[0] || "stable";
  return {
    label: dominant === "improving" ? "Improving" : dominant === "worsening" ? "Worsening" : "Stable",
    tone: dominant === "improving" ? "success" : dominant === "worsening" ? "warning" : "info",
    detail:
      report.reasoning?.[0] ||
      `${report.filters?.route || "All Routes"} | ${report.filters?.protectionState || "All Protection"} | ${report.filters?.symbol || "All Symbols"}`
  };
}

function workflowStatusTone(status) {
  if (status === "Ready" || status === "Wrapped") return "success";
  if (status === "In Progress") return "warning";
  return "info";
}

function formatWorkflowTimestamp(value) {
  if (!value) return "No local update recorded yet.";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function HomeBaseWorkspace({ data, runtime, workspace, market }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const homeBaseSummary = useProductTradingStore(selectHomeBaseSummary);
  const hydrated = useProductTradingStore((state) => state.hydrated);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const activeWatchlist = useProductTradingStore((state) => state.activeWatchlist);
  const activeWatch = useProductTradingStore((state) => state.activeWatch);
  const openPositions = useProductTradingStore((state) => state.openPositions);
  const recentOrders = useProductTradingStore((state) => state.recentOrders);
  const recentActions = useProductTradingStore((state) => state.recentActions);
  const reviewSnapshots = useProductTradingStore((state) => state.reviewSnapshots);
  const activeReviewSnapshotId = useProductTradingStore((state) => state.activeReviewSnapshotId);
  const replayQueues = useProductTradingStore((state) => state.replayQueues);
  const activeReplayQueueId = useProductTradingStore((state) => state.activeReplayQueueId);
  const handoffNotes = useProductTradingStore((state) => state.handoffNotes);
  const continuityInsightReports = useProductTradingStore((state) => state.continuityInsightReports);
  const activeContinuityInsightReportId = useProductTradingStore((state) => state.activeContinuityInsightReportId);
  const continuityInsightCollections = useProductTradingStore((state) => state.continuityInsightCollections);
  const activeContinuityInsightCollectionId = useProductTradingStore((state) => state.activeContinuityInsightCollectionId);
  const dayOpenWorkflow = useProductTradingStore((state) => state.homeBaseDayOpenWorkflow);
  const dayCloseWorkflow = useProductTradingStore((state) => state.homeBaseDayCloseWorkflow);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const riskMode = useProductTradingStore((state) => state.riskMode);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const riskSummary = useProductTradingStore((state) => state.riskSummary);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const marketPosture = useProductTradingStore((state) => state.marketPosture);
  const infinityLoop = useProductTradingStore((state) => state.infinityLoop);
  const infinityOrchestrator = useProductTradingStore((state) => state.infinityOrchestrator);
  const resumeLastReviewStack = useProductTradingStore((state) => state.resumeLastReviewStack);
  const restoreHandoffContext = useProductTradingStore((state) => state.restoreHandoffContext);
  const loadContinuityInsightCollection = useProductTradingStore((state) => state.loadContinuityInsightCollection);
  const loadContinuityInsightReport = useProductTradingStore((state) => state.loadContinuityInsightReport);
  const setActiveReplayQueue = useProductTradingStore((state) => state.setActiveReplayQueue);
  const startHomeBaseWorkflow = useProductTradingStore((state) => state.startHomeBaseWorkflow);
  const toggleHomeBaseWorkflowItem = useProductTradingStore((state) => state.toggleHomeBaseWorkflowItem);
  const setHomeBaseWorkflowStatus = useProductTradingStore((state) => state.setHomeBaseWorkflowStatus);
  const setHomeBaseWorkflowCapture = useProductTradingStore((state) => state.setHomeBaseWorkflowCapture);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  const activeReviewSnapshot = useMemo(
    () => reviewSnapshots.find((snapshot) => snapshot.id === activeReviewSnapshotId) || reviewSnapshots[0] || null,
    [activeReviewSnapshotId, reviewSnapshots]
  );
  const activeReplayQueue = useMemo(
    () => replayQueues.find((queue) => queue.id === activeReplayQueueId) || replayQueues[0] || null,
    [activeReplayQueueId, replayQueues]
  );
  const latestHandoff = useMemo(() => handoffNotes[0] || null, [handoffNotes]);
  const activeContinuityReport = useMemo(
    () =>
      continuityInsightReports.find((report) => report.id === activeContinuityInsightReportId) ||
      continuityInsightReports[0] ||
      null,
    [activeContinuityInsightReportId, continuityInsightReports]
  );
  const activeContinuityCollection = useMemo(
    () =>
      continuityInsightCollections.find((collection) => collection.id === activeContinuityInsightCollectionId) ||
      continuityInsightCollections[0] ||
      null,
    [activeContinuityInsightCollectionId, continuityInsightCollections]
  );
  const continuityPosture = useMemo(() => summarizeContinuityPosture(activeContinuityReport), [activeContinuityReport]);
  const currentMarket = market.watchlist?.find((item) => item.symbol === selectedSymbol) || market.watchlist?.[0] || null;
  const activePnl = useMemo(
    () => formatPnl(openPositions.reduce((total, position) => total + parsePnl(position.pnl), 0)),
    [openPositions]
  );
  const rankedDeskContexts = homeBaseSummary.topContexts || [];
  const rankedQuickActions = homeBaseSummary.quickActions || [];
  const resumeOptions = homeBaseSummary.resumeOptions || [];
  const rankedModuleSwitches = homeBaseSummary.moduleSwitches || [];
  const workflowBlocks = [
    { key: "open", workflow: dayOpenWorkflow, startLabel: dayOpenWorkflow?.isStale ? "Start Today" : "Restart Open Flow" },
    { key: "close", workflow: dayCloseWorkflow, startLabel: dayCloseWorkflow?.isStale ? "Start Today" : "Restart Close Flow" }
  ];
  const deskRhythmBlocks = [
    {
      key: "open",
      label: "Desk Start",
      tone: workflowStatusTone(dayOpenWorkflow?.status),
      value: dayOpenWorkflow?.status || "Waiting",
      detail: `${dayOpenWorkflow?.completedCount || 0}/${dayOpenWorkflow?.totalCount || 0} checks | ${
        dayOpenWorkflow?.summary || "Open flow is ready to capture the first desk posture."
      }`
    },
    {
      key: "resume",
      label: "Best Resume",
      tone: homeBaseSummary.resumeTarget?.tone || "success",
      value: homeBaseSummary.resumeTarget?.focusLabel || "Execution Center",
      detail: homeBaseSummary.resumeTarget?.detail || "Resume the strongest operating context from Home Base."
    },
    {
      key: "close",
      label: "Desk Close Guard",
      tone: workflowStatusTone(dayCloseWorkflow?.status),
      value: dayCloseWorkflow?.status || "Waiting",
      detail: `${dayCloseWorkflow?.completedCount || 0}/${dayCloseWorkflow?.totalCount || 0} checks | ${
        dayCloseWorkflow?.summary || "Close flow is ready to preserve review and continuity posture."
      }`
    }
  ];

  const homeBaseStats = [
    {
      label: "Desk Session",
      value: hydrated ? "Live" : "Loading",
      hint: hydrated ? "Home Base is running on the shared product store." : "Initializing shared trading state.",
      tone: hydrated ? "success" : "warning"
    },
    ...(homeBaseSummary.scorecards || []).map((item) => ({
      label: item.label,
      value: `${item.score}%`,
      hint: `${item.state} | ${item.detail}`,
      tone: item.tone
    }))
  ];

  const contextBlocks = (homeBaseSummary.contextRankings || []).map((item) => ({
    title: `${item.rank}. ${item.label}`,
    tone: item.tone,
    value: item.state,
    detail: item.detail
  }));

  function openPath(path) {
    if (typeof window === "undefined") return;
    window.location.assign(path);
  }

  function handleResumeMostRelevant() {
    const source = homeBaseSummary.resumeTarget?.source || "";

    if (source === "handoff" && latestHandoff) {
      restoreHandoffContext(latestHandoff.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "continuity-collection" && activeContinuityCollection) {
      loadContinuityInsightCollection(activeContinuityCollection.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "replay-queue" && activeReplayQueue) {
      setActiveReplayQueue(activeReplayQueue.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "review-snapshot" && activeReviewSnapshot) {
      resumeLastReviewStack();
      openPath("/journal-vault");
      return;
    }
    if (source === "continuity-report" && activeContinuityReport) {
      loadContinuityInsightReport(activeContinuityReport.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "risk-control") {
      openPath("/risk-control");
      return;
    }
    if (source === "market-intelligence" || source === "watchlist") {
      openPath("/market-intelligence");
      return;
    }
    openPath(homeBaseSummary.resumeTarget?.path || "/execution-center");
  }

  function handleDeskCommand(action) {
    const commandKey = String(action?.commandKey || "").trim();
    const source = String(action?.source || "").trim();

    if (commandKey === "resume-best-context") {
      handleResumeMostRelevant();
      return;
    }
    if (commandKey === "resume-review-stack") {
      if (activeReplayQueue) {
        setActiveReplayQueue(activeReplayQueue.id);
      } else if (activeReviewSnapshot) {
        resumeLastReviewStack();
      }
      openPath("/journal-vault");
      return;
    }
    if (commandKey === "open-continuity-posture") {
      if (latestHandoff) {
        restoreHandoffContext(latestHandoff.id);
      } else if (activeContinuityCollection) {
        loadContinuityInsightCollection(activeContinuityCollection.id);
      } else if (activeContinuityReport) {
        loadContinuityInsightReport(activeContinuityReport.id);
      }
      openPath("/journal-vault");
      return;
    }
    if (source === "handoff" && latestHandoff) {
      restoreHandoffContext(latestHandoff.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "continuity-collection" && activeContinuityCollection) {
      loadContinuityInsightCollection(activeContinuityCollection.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "replay-queue" && activeReplayQueue) {
      setActiveReplayQueue(activeReplayQueue.id);
      openPath("/journal-vault");
      return;
    }
    if (source === "review-snapshot" && activeReviewSnapshot) {
      resumeLastReviewStack();
      openPath("/journal-vault");
      return;
    }
    if (source === "continuity-report" && activeContinuityReport) {
      loadContinuityInsightReport(activeContinuityReport.id);
      openPath("/journal-vault");
      return;
    }

    openPath(action?.path || "/");
  }

  function handleWorkflowLink(linkTarget) {
    if (linkTarget === "review") {
      if (activeReplayQueue || activeReviewSnapshot) {
        handleDeskCommand({ commandKey: "resume-review-stack" });
        return;
      }
      openPath("/journal-vault");
      return;
    }
    if (linkTarget === "continuity") {
      if (latestHandoff || activeContinuityCollection || activeContinuityReport) {
        handleDeskCommand({ commandKey: "open-continuity-posture" });
        return;
      }
      openPath("/journal-vault");
      return;
    }
    if (linkTarget === "risk") {
      openPath("/risk-control");
      return;
    }
    openPath("/execution-center");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ProductMetricRow items={homeBaseStats} />

      <ProductPanel
        title="Operator Desk Acceptance"
        subtitle="Reusable readiness checks keep the Home Base shell honest about workflow posture, shared command language, continuity anchors, and paper-safe desk behavior."
      >
        <OperatorDeskAcceptancePanel surfaceHref="/" />
      </ProductPanel>

      <ProductGrid>
        <ProductPanel
          title="Daily Operating Overview"
          subtitle={
            homeBaseSummary.summary ||
            "Home Base turns Trading Pro Max into the trader's first and last screen by keeping market, execution, risk, review, and continuity posture in one operating layer."
          }
          aside={runtime.releaseGate || "LOCAL_PRODUCT_BUILD"}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.9fr)", gap: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              {rankedDeskContexts.map((item) => (
                <div key={item.key} style={{ ...createSurface({ level: "elevated", accent: item.tone, padding: 16, radius: "lg" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{item.rank}. {item.label}</strong>
                    <ProductPill label={`${item.score}%`} tone={item.tone} />
                  </div>
                  <div style={{ color: "#f8fafc", marginTop: 10, fontWeight: 800 }}>{item.state}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{item.detail}</div>
                </div>
              ))}
            </div>

            <div style={{ ...createSurface({ level: "elevated", accent: homeBaseSummary.overallTone || "success", padding: 18, radius: "xl" }), display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Home Base Summary</div>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
                  {homeBaseSummary.overallState} | {homeBaseSummary.overallScore}%
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>
                  {homeBaseSummary.summary}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Resume Desk</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 10 }}>
                  {homeBaseSummary.resumeTarget?.focusLabel || homeBaseSummary.resumeTarget?.label || "Execution Center"}
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>
                  {homeBaseSummary.resumeTarget?.detail || "Resume the active execution desk."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={handleResumeMostRelevant} style={createButton({ primary: true, tone: "success" })}>
                  {homeBaseSummary.resumeTarget?.actionLabel || "Resume Most Relevant Context"}
                </button>
                <Link href="/journal-vault" style={createButton({ tone: "info" })}>
                  Open Review Desk
                </Link>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {rankedModuleSwitches.slice(0, 4).map((module) => (
                  <Link key={module.href} href={module.href} style={createButton({ compact: true, tone: module.tone })}>
                    {module.rank}. {module.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ProductPanel>

        <ProductPanel title="Current Market Posture" subtitle="The active desk symbol, route quality, live feed state, and local market read stay visible at Home Base.">
          <div style={{ display: "grid", gap: 12 }}>
            <ProductCard
              title="Lead Market"
              value={selectedSymbol || currentMarket?.symbol || "No symbol"}
              tone="info"
              description={`${currentMarket?.bias || "Monitoring"} | ${currentMarket?.confidence || liveDataStatus?.freshness || "Awaiting live context"}`}
            />
            <ProductCard
              title="Active Route"
              value={selectedRoute?.name || workspace.routes?.[0]?.name || "No route"}
              tone="warning"
              description={selectedRoute?.state || workspace.routes?.[0]?.state || "Route state is waiting for qualification."}
            />
            <ProductCard
              title="Market Feed"
              value={liveDataStatus?.label || "Demo / Local"}
              tone={liveDataStatus?.tone || "neutral"}
              description={`${liveDataStatus?.state || "Paper-safe data mode"} | ${liveDataStatus?.providerSymbol || selectedSymbol || "No provider symbol"}`}
            />
          </div>
        </ProductPanel>
      </ProductGrid>

      <ProductPanel
        title="Day Open / Day Close Workflow"
        subtitle="The daily desk now begins and ends from Home Base with persisted workflow blocks for review, execution, risk, and continuity posture."
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {deskRhythmBlocks.map((item) => (
              <div
                key={item.key}
                style={{
                  ...createSurface({ level: "elevated", accent: item.tone, padding: 16, radius: "lg" }),
                  display: "grid",
                  gap: 8
                }}
              >
                <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{item.value}</div>
                <div style={{ color: deskTheme.colors.soft, lineHeight: 1.6 }}>{item.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {workflowBlocks.map(({ key, workflow, startLabel }) => (
            <div
              key={key}
              style={{
                ...createSurface({
                  level: "elevated",
                  accent: workflowStatusTone(workflow?.status),
                  padding: 18,
                  radius: "xl"
                }),
                display: "grid",
                gap: 14
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
                    {workflow?.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{workflow?.sessionLabel || "Current session"}</div>
                  <div style={{ color: deskTheme.colors.soft, lineHeight: 1.6 }}>{workflow?.summary}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <ProductPill label={workflow?.status || "Waiting"} tone={workflowStatusTone(workflow?.status)} />
                  <ProductPill label={`${workflow?.completedCount || 0}/${workflow?.totalCount || 0}`} tone="info" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" onClick={() => startHomeBaseWorkflow(key)} style={createButton({ tone: "info" })}>
                  {startLabel}
                </button>
                {workflow?.isStale ? <ProductPill label="Last session" tone="warning" /> : null}
                <div style={{ color: deskTheme.colors.soft, fontSize: 13 }}>
                  Last update: {formatWorkflowTimestamp(workflow?.lastUpdatedAt)}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
                    Workflow Status
                  </span>
                  <select
                    value={workflow?.status || workflow?.defaultStatus || "Waiting"}
                    onChange={(event) => setHomeBaseWorkflowStatus(key, event.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(148, 163, 184, 0.28)",
                      background: "rgba(15, 23, 42, 0.76)",
                      color: "#f8fafc",
                      padding: "12px 14px",
                      font: "inherit"
                    }}
                  >
                    {(workflow?.statuses || []).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
                    {workflow?.captureLabel || "Status Capture"}
                  </span>
                  <textarea
                    value={workflow?.statusCapture || ""}
                    onChange={(event) => setHomeBaseWorkflowCapture(key, event.target.value)}
                    placeholder={workflow?.capturePlaceholder || "Capture the latest workflow posture."}
                    rows={4}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid rgba(148, 163, 184, 0.28)",
                      background: "rgba(15, 23, 42, 0.76)",
                      color: "#f8fafc",
                      padding: "12px 14px",
                      font: "inherit",
                      resize: "vertical"
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {(workflow?.items || []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      ...createSurface({ level: "elevated", accent: item.checked ? "success" : "slate", padding: 14, radius: "lg" }),
                      display: "grid",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(item.checked)}
                          onChange={() => toggleHomeBaseWorkflowItem(key, item.id)}
                          style={{ marginTop: 4 }}
                        />
                        <span style={{ display: "grid", gap: 6 }}>
                          <strong>{item.label}</strong>
                          <span style={{ color: deskTheme.colors.soft, lineHeight: 1.6 }}>{item.detail}</span>
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleWorkflowLink(item.linkTarget)}
                        style={createButton({ compact: true, tone: item.checked ? "success" : "info" })}
                      >
                        {item.actionLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      </ProductPanel>

      <ProductPanel
        title="Operator Command Rail"
        subtitle="Ranked desk actions, explicit resume controls, and faster module switching keep Home Base feeling like one real operating desk."
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.18fr) minmax(320px, 0.82fr)", gap: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {rankedQuickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleDeskCommand(action)}
                style={{
                  ...createSurface({ level: "elevated", accent: action.tone, padding: 16, radius: "lg" }),
                  textAlign: "left",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{action.rank}. {action.label}</strong>
                  <ProductPill label={action.actionLabel} tone={action.tone} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>{action.focusLabel}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{action.detail}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...createSurface({ level: "elevated", accent: homeBaseSummary.resumeTarget?.tone || "success", padding: 16, radius: "xl" }), display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Resume Controls</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 10 }}>{homeBaseSummary.resumeTarget?.focusLabel || "Execution Center"}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>
                  {homeBaseSummary.resumeTarget?.detail || "Resume the best available desk context."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={handleResumeMostRelevant} style={createButton({ primary: true, tone: "success" })}>
                  {homeBaseSummary.resumeTarget?.actionLabel || "Resume Best Context"}
                </button>
                {resumeOptions.slice(1, 4).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleDeskCommand(option)}
                    style={createButton({ compact: true, tone: option.tone })}
                  >
                    {option.focusLabel}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...createSurface({ level: "elevated", accent: "info", padding: 16, radius: "xl" }), display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>Priority Module Switches</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>
                  The fastest next desk lanes are ordered off the shared Home Base context scores.
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {rankedModuleSwitches.map((module) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    style={{
                      ...createSurface({ level: "elevated", accent: module.tone, padding: 14, radius: "lg" }),
                      textDecoration: "none",
                      color: "inherit"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{module.rank}. {module.label}</strong>
                      <ProductPill label={`${module.priority}%`} tone={module.tone} />
                    </div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.55 }}>{module.reason}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProductPanel>

      <ProductPanel
        title="Active Desk Context"
        subtitle="Home Base ranks market posture, watchlist intent, review state, execution readiness, risk posture, and continuity/handoff posture without making the trader jump between pages."
      >
        <ProductMetricRow
          items={contextBlocks.map((item) => ({
            label: item.title,
            value: item.value,
            hint: item.detail,
            tone: item.tone
          }))}
        />
      </ProductPanel>

      <ProductGrid>
        <ProductPanel title="Top Priorities" subtitle="Autonomy and diagnostics surface the most relevant operator tasks for this session.">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...createSurface({ level: "elevated", accent: infinityLoop?.tone || "info", padding: 16, radius: "lg" }) }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{infinityLoop?.status || "Guarded standby"}</strong>
                <ProductPill label={infinityLoop?.tone === "warning" ? "Review" : "Stable"} tone={infinityLoop?.tone || "info"} />
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 10, lineHeight: 1.6 }}>
                {infinityOrchestrator?.summary || "Autonomy loop is monitoring runtime, execution, and continuity posture."}
              </div>
            </div>
            {(recentActions || []).slice(0, 4).map((action) => (
              <div key={action.id} style={{ ...createSurface({ level: "elevated", accent: "slate", padding: 16, radius: "lg" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{action.title}</strong>
                  <ProductPill label={action.status || "Logged"} tone={action.status === "Blocked" ? "danger" : action.status === "Ready" ? "success" : "info"} />
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 10, lineHeight: 1.6 }}>{action.detail}</div>
              </div>
            ))}
          </div>
        </ProductPanel>

        <ProductPanel title="Operating Desk Lanes" subtitle="Module switching stays ranked by the current desk posture instead of behaving like a static page list.">
          <div style={{ display: "grid", gap: 12 }}>
            {rankedModuleSwitches.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                style={{
                  ...createSurface({ level: "elevated", accent: module.tone, padding: 16, radius: "lg" }),
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{module.rank}. {module.label}</strong>
                  <ProductPill label={`${module.priority}%`} tone={module.tone} />
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 10, lineHeight: 1.6 }}>{module.reason}</div>
                <div style={{ color: "#d6e2f2", marginTop: 10, lineHeight: 1.6 }}>{module.handoff}</div>
              </Link>
            ))}
          </div>
        </ProductPanel>
      </ProductGrid>

      <ProductGrid>
        <ProductPanel title="Watchlist And Execution Focus" subtitle="The lead market set, route stack, and paper-safe execution context are ready from the first screen of the day.">
          <div style={{ display: "grid", gap: 12 }}>
            <ProductCard
              title="Active Market Set"
              value={activeWatchlist?.name || "No active market set"}
              tone="info"
              description={`${activeWatchlist?.symbols?.slice(0, 4).join(", ") || "No saved symbols"} | ${activeWatchlist?.sessionIntent || "No intent"}`}
            />
            <ProductCard
              title="Execution Queue"
              value={executionStatus?.label || "Paper-safe"}
              tone={executionStatus?.tone || "warning"}
              description={`${openPositions.length} positions | ${(recentOrders || []).length} recent orders | ${activePnl}`}
            />
            <div style={{ display: "grid", gap: 10 }}>
              {(market.watchlist || []).slice(0, 4).map((item) => (
                <div key={item.symbol} style={{ ...createSurface({ level: "elevated", accent: item.symbol === selectedSymbol ? "info" : "slate", padding: 14, radius: "lg" }) }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "center" }}>
                    <strong>{item.symbol}</strong>
                    <span style={{ color: deskTheme.colors.soft }}>{item.bias}</span>
                    <ProductPill label={item.confidence} tone={item.symbol === selectedSymbol ? "success" : "neutral"} />
                  </div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        </ProductPanel>

        <ProductPanel title="Continuity And Risk Guard" subtitle="Home Base stays connected to review, handoff, continuity intelligence, and shared risk posture.">
          <div style={{ display: "grid", gap: 12 }}>
            <ProductCard
              title="Risk Guard"
              value={`${riskMode} / ${protectionState}`}
              tone={protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "info"}
              description={`${riskSummary?.drawdown || "--"} drawdown | ${riskSummary?.openRisk || "--"} open risk`}
            />
            <ProductCard
              title="Latest Handoff"
              value={latestHandoff?.watchlistName || "No handoff packet"}
              tone={latestHandoff ? "success" : "neutral"}
              description={
                latestHandoff
                  ? `${latestHandoff.sessionIntent || "No intent"} | ${latestHandoff.snapshotName || "No snapshot"} | ${latestHandoff.replayQueueName || "No queue"}`
                  : "Journal Vault will surface the next handoff packet here."
              }
            />
            <ProductCard
              title="Continuity Review"
              value={activeContinuityCollection?.name || activeContinuityReport?.name || "No continuity review set"}
              tone={continuityPosture.tone}
              description={activeContinuityCollection?.summary || continuityPosture.detail}
            />
          </div>
        </ProductPanel>
      </ProductGrid>

      <ProductPanel title="Connected Runtime Diagnostics" subtitle="Home Base inherits the existing diagnostics layer so the operating desk stays honest about feed, execution, route, and symbol health.">
        <ProductRuntimeDiagnostics
          title="Home Base Runtime"
          subtitle="Shared runtime diagnostics across the current operator desk, zero-cost mode, and paper-safe execution stack."
          accent="info"
          compact
          maxSymbols={4}
        />
      </ProductPanel>
    </div>
  );
}
