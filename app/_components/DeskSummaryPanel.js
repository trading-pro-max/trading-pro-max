"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getCanonicalOperatorDeskSurface } from "../../lib/tpm-operator-desk-contract.mjs";
import { ProductMetricRow, ProductPill } from "./ProductShell";
import { selectHomeBaseSummary, useProductTradingStore } from "./product-trading-store";
import { createButton, createSurface, deskTheme, toneMap } from "./product-theme";

export function DeskSummaryPanel({ moduleHref = "", compact = false }) {
  const homeBaseSummary = useProductTradingStore(selectHomeBaseSummary);
  const hydrated = useProductTradingStore((state) => state.hydrated);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const riskMode = useProductTradingStore((state) => state.riskMode);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const riskSummary = useProductTradingStore((state) => state.riskSummary);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const handoffNotes = useProductTradingStore((state) => state.handoffNotes);
  const reviewSnapshots = useProductTradingStore((state) => state.reviewSnapshots);
  const activeReviewSnapshotId = useProductTradingStore((state) => state.activeReviewSnapshotId);
  const replayQueues = useProductTradingStore((state) => state.replayQueues);
  const activeReplayQueueId = useProductTradingStore((state) => state.activeReplayQueueId);
  const continuityInsightReports = useProductTradingStore((state) => state.continuityInsightReports);
  const activeContinuityInsightReportId = useProductTradingStore((state) => state.activeContinuityInsightReportId);
  const continuityInsightCollections = useProductTradingStore((state) => state.continuityInsightCollections);
  const activeContinuityInsightCollectionId = useProductTradingStore((state) => state.activeContinuityInsightCollectionId);
  const resumeLastReviewStack = useProductTradingStore((state) => state.resumeLastReviewStack);
  const restoreHandoffContext = useProductTradingStore((state) => state.restoreHandoffContext);
  const loadContinuityInsightReport = useProductTradingStore((state) => state.loadContinuityInsightReport);
  const loadContinuityInsightCollection = useProductTradingStore((state) => state.loadContinuityInsightCollection);
  const setActiveReplayQueue = useProductTradingStore((state) => state.setActiveReplayQueue);

  const rankedContexts = homeBaseSummary.topContexts || [];
  const rankedQuickActions = homeBaseSummary.quickActions || [];
  const rankedResumeOptions = homeBaseSummary.resumeOptions || [];
  const rankedModuleSwitches = (homeBaseSummary.moduleSwitches || []).filter((module) => module.href !== moduleHref);
  const activeSurface = useMemo(() => getCanonicalOperatorDeskSurface(moduleHref || "/"), [moduleHref]);
  const surfacePills = [
    { label: activeSurface.label, tone: moduleHref ? "info" : homeBaseSummary.overallTone || "info" },
    { label: selectedSymbol || "No symbol", tone: "neutral" },
    { label: selectedRoute?.name || "No route", tone: "info" },
    {
      label: protectionState ? `${protectionState} Risk` : riskMode || "Guarded",
      tone: protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "info"
    },
    { label: liveDataStatus?.label || "Demo / Local", tone: liveDataStatus?.tone || "neutral" }
  ];

  const latestHandoff = useMemo(() => handoffNotes[0] || null, [handoffNotes]);
  const activeReviewSnapshot = useMemo(
    () => reviewSnapshots.find((snapshot) => snapshot.id === activeReviewSnapshotId) || reviewSnapshots[0] || null,
    [activeReviewSnapshotId, reviewSnapshots]
  );
  const activeReplayQueue = useMemo(
    () => replayQueues.find((queue) => queue.id === activeReplayQueueId) || replayQueues[0] || null,
    [activeReplayQueueId, replayQueues]
  );
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
  const scoreCards = useMemo(
    () =>
      (homeBaseSummary.scorecards || []).map((item) => ({
        label: item.label,
        value: `${item.score}%`,
        hint: `${item.state} | ${item.detail}`,
        tone: item.tone
      })),
    [homeBaseSummary.scorecards]
  );

  function openPath(path) {
    if (typeof window === "undefined" || !path) return;
    if (window.location.pathname !== path) window.location.assign(path);
  }

  function handleResumeBestContext() {
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
      handleResumeBestContext();
      return;
    }
    if (commandKey === "resume-review-stack") {
      if (activeReplayQueue) setActiveReplayQueue(activeReplayQueue.id);
      else if (activeReviewSnapshot) resumeLastReviewStack();
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

  if (!hydrated) {
    return (
      <div
        style={{
          ...createSurface({ level: "elevated", accent: "slate", padding: 16, radius: "xl" }),
          display: "grid",
          gap: 10
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
          Home Base Desk Summary
        </div>
        <div style={{ color: deskTheme.colors.soft, lineHeight: 1.6 }}>Initializing shared desk state...</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        style={{
          ...createSurface({ level: "elevated", accent: homeBaseSummary.overallTone || "info", padding: 16, radius: "xl" }),
          display: "grid",
          gap: 12
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
              Home Base Desk Summary
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {surfacePills.slice(0, 4).map((item, index) => (
                <ProductPill key={`${item.label}-${index}`} label={item.label} tone={item.tone} />
              ))}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
              {homeBaseSummary.overallState} | {homeBaseSummary.overallScore}%
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{homeBaseSummary.summary}</div>
          </div>
          <ProductPill label={homeBaseSummary.resumeTarget?.actionLabel || "Desk Ready"} tone={homeBaseSummary.overallTone || "info"} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={handleResumeBestContext} style={createButton({ primary: true, tone: "success" })}>
            {homeBaseSummary.resumeTarget?.actionLabel || "Resume Best Context"}
          </button>
          {rankedQuickActions.slice(0, 3).map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => handleDeskCommand(action)}
              style={createButton({ compact: true, tone: action.tone })}
            >
              {action.rank}. {action.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {rankedModuleSwitches.slice(0, 4).map((module) => (
            <Link key={module.href} href={module.href} style={createButton({ compact: true, tone: module.tone })}>
              {module.rank}. {module.label}
            </Link>
          ))}
          <Link href="/" style={createButton({ compact: true, tone: "neutral" })}>
            Back To Home Base
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...createSurface({ level: "elevated", accent: homeBaseSummary.overallTone || "info", padding: 20, radius: "xl" }),
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
          gap: 18,
          alignItems: "start"
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
              Home Base Desk Summary
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {surfacePills.map((item, index) => (
                <ProductPill key={`${item.label}-${index}`} label={item.label} tone={item.tone} />
              ))}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>
              {homeBaseSummary.overallState} | {homeBaseSummary.overallScore}%
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{homeBaseSummary.summary}</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {rankedContexts.slice(0, 4).map((item) => (
              <div
                key={item.key}
                style={{
                  ...createSurface({ level: "elevated", accent: item.tone, padding: 14, radius: "lg" }),
                  display: "grid",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13 }}>
                    {item.rank}. {item.label}
                  </strong>
                  <ProductPill label={`${item.score}%`} tone={item.tone} />
                </div>
                <div style={{ color: "#f8fafc", fontWeight: 800 }}>{item.state}</div>
                <div style={{ color: deskTheme.colors.soft, lineHeight: 1.55, fontSize: 13 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              ...createSurface({ level: "elevated", accent: homeBaseSummary.resumeTarget?.tone || "success", padding: 16, radius: "xl" }),
              display: "grid",
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
                Resume Desk
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {homeBaseSummary.resumeTarget?.focusLabel || homeBaseSummary.resumeTarget?.label || "Execution Center"}
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>
                {homeBaseSummary.resumeTarget?.detail || "Resume the active execution desk."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={handleResumeBestContext} style={createButton({ primary: true, tone: "success" })}>
                {homeBaseSummary.resumeTarget?.actionLabel || "Resume Best Context"}
              </button>
              {rankedResumeOptions.slice(1, 3).map((option) => (
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

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
              Ranked Desk Actions
            </div>
            {rankedQuickActions.slice(0, 3).map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleDeskCommand(action)}
                style={{
                  ...createSurface({ level: "elevated", accent: action.tone, padding: 12, radius: "lg" }),
                  textAlign: "left",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13 }}>
                    {action.rank}. {action.label}
                  </strong>
                  <ProductPill label={action.actionLabel} tone={action.tone} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 8 }}>{action.focusLabel}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.55, fontSize: 13 }}>{action.detail}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
              Priority Module Switches
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {rankedModuleSwitches.slice(0, 4).map((module) => (
                <Link key={module.href} href={module.href} style={createButton({ compact: true, tone: module.tone })}>
                  {module.rank}. {module.label}
                </Link>
              ))}
              <Link href="/" style={createButton({ compact: true, tone: "neutral" })}>
                Back To Home Base
              </Link>
            </div>
          </div>
        </div>
      </div>

      {scoreCards.length > 0 ? <ProductMetricRow items={scoreCards} /> : null}

      <div
        style={{
          ...createSurface({ level: "elevated", accent: "slate", padding: 16, radius: "xl" }),
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12
        }}
      >
        {[
          { label: "Symbol", value: selectedSymbol || "No symbol", hint: "Shared desk symbol", tone: "neutral" },
          { label: "Route", value: selectedRoute?.name || "No route", hint: selectedRoute?.state || "Route state pending", tone: "info" },
          {
            label: "Risk Mode",
            value: riskMode,
            hint: `${protectionState} protection`,
            tone: protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "info"
          },
          { label: "Open Risk", value: riskSummary?.openRisk || "--", hint: riskSummary?.guardStatus || "Risk posture", tone: "warning" },
          {
            label: "Execution",
            value: executionStatus?.label || "Paper-safe",
            hint: executionStatus?.mode || "Paper execution",
            tone: executionStatus?.tone || "neutral"
          },
          {
            label: "Feed",
            value: liveDataStatus?.label || "Demo / Local",
            hint: liveDataStatus?.state || "Local feed",
            tone: liveDataStatus?.tone || "neutral"
          }
        ].map((item) => (
          <div
            key={item.label}
            style={{
              ...createSurface({
                level: "elevated",
                accent: item.tone === "neutral" ? "slate" : item.tone,
                padding: 14,
                radius: "lg"
              })
            }}
          >
            <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 800 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8, color: toneMap[item.tone] || deskTheme.colors.text }}>
              {item.value}
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>{item.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
