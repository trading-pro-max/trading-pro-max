"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildOperatorDeskAcceptanceModel,
  CANONICAL_OPERATOR_DESK_SURFACES,
  getCanonicalOperatorDeskSurface
} from "../../lib/tpm-operator-desk-contract.mjs";
import { ProductPill } from "./ProductShell";
import { selectHomeBaseSummary, useProductTradingStore } from "./product-trading-store";
import { createButton, createSurface, deskTheme, toneMap } from "./product-theme";

export function OperatorDeskAcceptancePanel({ surfaceHref = "/", compact = false }) {
  const homeBaseSummary = useProductTradingStore(selectHomeBaseSummary);
  const dayOpenWorkflow = useProductTradingStore((state) => state.homeBaseDayOpenWorkflow);
  const dayCloseWorkflow = useProductTradingStore((state) => state.homeBaseDayCloseWorkflow);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const activeWatchlist = useProductTradingStore((state) => state.activeWatchlist);
  const reviewSnapshots = useProductTradingStore((state) => state.reviewSnapshots);
  const activeReviewSnapshotId = useProductTradingStore((state) => state.activeReviewSnapshotId);
  const replayQueues = useProductTradingStore((state) => state.replayQueues);
  const activeReplayQueueId = useProductTradingStore((state) => state.activeReplayQueueId);
  const handoffNotes = useProductTradingStore((state) => state.handoffNotes);
  const continuityInsightReports = useProductTradingStore((state) => state.continuityInsightReports);
  const activeContinuityInsightReportId = useProductTradingStore((state) => state.activeContinuityInsightReportId);
  const continuityInsightCollections = useProductTradingStore((state) => state.continuityInsightCollections);
  const activeContinuityInsightCollectionId = useProductTradingStore((state) => state.activeContinuityInsightCollectionId);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const riskMode = useProductTradingStore((state) => state.riskMode);

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
  const acceptance = useMemo(
    () =>
      buildOperatorDeskAcceptanceModel({
        surfaceHref,
        homeBaseSummary,
        dayOpenWorkflow,
        dayCloseWorkflow,
        executionStatus,
        liveDataStatus,
        activeWatchlist,
        activeReviewSnapshot,
        activeReplayQueue,
        latestHandoff,
        activeContinuityCollection,
        activeContinuityReport,
        protectionState,
        riskMode
      }),
    [
      surfaceHref,
      homeBaseSummary,
      dayOpenWorkflow,
      dayCloseWorkflow,
      executionStatus,
      liveDataStatus,
      activeWatchlist,
      activeReviewSnapshot,
      activeReplayQueue,
      latestHandoff,
      activeContinuityCollection,
      activeContinuityReport,
      protectionState,
      riskMode
    ]
  );

  if (compact) {
    return (
      <div
        style={{
          ...createSurface({ level: "elevated", accent: acceptance.overallTone, padding: 16, radius: "xl" }),
          display: "grid",
          gap: 12
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
              Operator Desk Acceptance
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
              {acceptance.surface.label} | {acceptance.overallState} | {acceptance.overallScore}%
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{acceptance.summary}</div>
          </div>
          <ProductPill label={`${acceptance.acceptedCount}/${acceptance.checks.length} checks ready`} tone={acceptance.overallTone} />
        </div>

        <div
          style={{
            ...createSurface({ level: "elevated", accent: acceptance.bestNextMove.tone, padding: 14, radius: "lg" }),
            display: "grid",
            gap: 8
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
            Best Next Move
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{acceptance.bestNextMove.label}</strong>
            <ProductPill label={acceptance.bestNextMove.focusLabel} tone={acceptance.bestNextMove.tone} />
          </div>
          <div style={{ color: deskTheme.colors.soft, lineHeight: 1.55 }}>{acceptance.bestNextMove.detail}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={acceptance.bestNextMove.href} style={createButton({ primary: true, tone: acceptance.bestNextMove.tone })}>
              {acceptance.bestNextMove.label}
            </Link>
            {surfaceHref !== "/" ? (
              <Link href="/" style={createButton({ compact: true, tone: "neutral" })}>
                Home Base
              </Link>
            ) : null}
            <Link href="/journal-vault" style={createButton({ compact: true, tone: "info" })}>
              Review Desk
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {acceptance.checks.slice(0, 3).map((check) => (
            <span
              key={check.key}
              style={{
                ...createSurface({ level: "elevated", accent: check.tone, padding: 10, radius: "lg" }),
                color: toneMap[check.tone] || deskTheme.colors.text
              }}
            >
              {check.label} {check.score}%
            </span>
          ))}
          <span style={{ ...createSurface({ level: "elevated", accent: "slate", padding: 10, radius: "lg" }) }}>
            {acceptance.canonicalSurfaceCount} canonical surfaces
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...createSurface({ level: "elevated", accent: acceptance.overallTone, padding: 20, radius: "xl" }),
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(300px, 0.9fr)",
          gap: 16,
          alignItems: "start"
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
              Operator Desk Acceptance
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>
              {acceptance.surface.label} | {acceptance.overallState} | {acceptance.overallScore}%
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{acceptance.summary}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProductPill label={`${acceptance.acceptedCount}/${acceptance.checks.length} checks ready`} tone={acceptance.overallTone} />
            <ProductPill label={`${acceptance.moduleSwitchCount}/${acceptance.canonicalSurfaceCount - 1} desk lanes ranked`} tone="info" />
            <ProductPill label={`${acceptance.continuityArtifactCount} continuity anchors`} tone={acceptance.continuityArtifactCount ? "success" : "warning"} />
          </div>

          <div
            style={{
              ...createSurface({ level: "elevated", accent: acceptance.bestNextMove.tone, padding: 16, radius: "xl" }),
              display: "grid",
              gap: 10
            }}
          >
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
                Best Next Move
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{acceptance.bestNextMove.focusLabel}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{acceptance.bestNextMove.detail}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={acceptance.bestNextMove.href} style={createButton({ primary: true, tone: acceptance.bestNextMove.tone })}>
                {acceptance.bestNextMove.label}
              </Link>
              {surfaceHref !== "/" ? (
                <Link href="/" style={createButton({ tone: "neutral" })}>
                  Home Base
                </Link>
              ) : null}
              <Link href="/journal-vault" style={createButton({ tone: "info" })}>
                Review Desk
              </Link>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {acceptance.checks.map((check) => (
            <div
              key={check.key}
              style={{
                ...createSurface({ level: "elevated", accent: check.tone, padding: 14, radius: "lg" }),
                display: "grid",
                gap: 6
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{check.label}</strong>
                <ProductPill label={`${check.score}%`} tone={check.tone} />
              </div>
              <div style={{ color: "#f8fafc", fontWeight: 800 }}>{check.state}</div>
              <div style={{ color: deskTheme.colors.soft, lineHeight: 1.55 }}>{check.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>
          Canonical Desk Surfaces
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {CANONICAL_OPERATOR_DESK_SURFACES.map((surface) => {
            const active = surface.href === getCanonicalOperatorDeskSurface(surfaceHref).href;
            return (
              <Link
                key={surface.href}
                href={surface.href}
                style={{
                  ...createSurface({ level: "elevated", accent: active ? acceptance.overallTone : "slate", padding: 14, radius: "lg" }),
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{surface.label}</strong>
                  <ProductPill label={active ? "Active" : "Open"} tone={active ? acceptance.overallTone : "neutral"} />
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.55 }}>{surface.summary}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
