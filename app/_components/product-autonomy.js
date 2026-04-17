"use client";

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseMetricValue(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || fallback).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toneForScore(score) {
  if (score >= 88) return "success";
  if (score >= 72) return "warning";
  if (score >= 50) return "danger";
  return "danger";
}

function stateForScore(score) {
  if (score >= 88) return "Healthy";
  if (score >= 72) return "Warning";
  if (score >= 50) return "Degraded";
  return "Blocked";
}

function freshnessBaseScore(freshness) {
  if (freshness === "Fresh") return 96;
  if (freshness === "Warm") return 84;
  if (freshness === "Delayed") return 76;
  if (freshness === "Session Closed") return 74;
  if (freshness === "Mixed") return 68;
  if (freshness === "Stable") return 62;
  if (freshness === "Lagging") return 52;
  if (freshness === "Stale") return 32;
  return 48;
}

function routeBaseScore(routeState) {
  if (routeState === "Ready" || routeState === "Qualified") return 92;
  if (routeState === "Momentum") return 86;
  if (routeState === "Watch") return 68;
  if (routeState === "Protected") return 46;
  if (routeState === "Blocked") return 28;
  return 58;
}

function decisionTone(decision) {
  if (decision === "allowed") return "success";
  if (decision === "approval-required") return "warning";
  if (decision === "requires-supported-live-adapter") return "warning";
  return "danger";
}

function decisionLabel(decision) {
  if (decision === "allowed") return "Allowed";
  if (decision === "approval-required") return "Approval Required";
  if (decision === "requires-supported-live-adapter") return "Supported Adapter Required";
  return "Blocked";
}

function createSignal({ key, label, value, tone, detail, metrics = {} }) {
  return {
    key,
    label,
    value,
    tone,
    detail,
    metrics,
    state:
      tone === "success"
        ? "Healthy"
        : tone === "warning"
          ? "Warning"
          : tone === "danger"
            ? "Degraded"
            : "Stable",
    healthy: tone === "success" || tone === "info",
    degraded: tone === "danger" || tone === "warning"
  };
}

function createScoreCard(label, score, detail) {
  return {
    label,
    score,
    tone: toneForScore(score),
    state: stateForScore(score),
    detail
  };
}

function createPolicyRule({ key, label, decision, reason, scope, category = "action" }) {
  return {
    key,
    label,
    decision,
    status: decisionLabel(decision),
    tone: decisionTone(decision),
    reason,
    scope,
    category,
    allowed: decision === "allowed",
    blocked: decision === "blocked",
    requiresApproval: decision === "approval-required",
    requiresSupportedAdapter: decision === "requires-supported-live-adapter"
  };
}

function createDiagnosticCheck({ label, state, detail, tone = "info" }) {
  return {
    label,
    state,
    detail,
    tone
  };
}

function createConfigField({ label, required = true, placeholder, state, detail, tone }) {
  const derivedTone =
    tone ||
    (state === "Valid" || state === "Ready"
      ? "success"
      : state === "Pending" || state === "Awaiting Configuration"
        ? "warning"
        : state === "Not Required" || state === "Disabled"
          ? "info"
          : "danger");

  return {
    label,
    required,
    placeholder,
    state,
    detail,
    tone: derivedTone
  };
}

function createAlert({ id, label, severity, reason, recommendedAction, source, tone }) {
  return {
    id,
    label,
    severity,
    reason,
    recommendedAction,
    source,
    tone,
    state: "Active"
  };
}

function reportPreviewLines(payload) {
  const preview = [];

  if (payload.summary) {
    preview.push(payload.summary);
  }

  if (payload.entries?.length) {
    preview.push(`${payload.entries.length} entries ready for local operator review.`);
  }

  if (payload.checkpoints?.length) {
    preview.push(`${payload.checkpoints.length} local runtime checkpoints included.`);
  }

  if (payload.adapters?.length) {
    preview.push(`${payload.adapters.length} adapter readiness lanes summarized.`);
  }

  if (payload.alerts?.length) {
    preview.push(`${payload.alerts.length} active controlled alerts included.`);
  }

  if (payload.currentRecommendation?.label) {
    preview.push(`Current recommendation: ${payload.currentRecommendation.label}.`);
  }

  return preview.slice(0, 3);
}

function createReport({ id, label, summary, payload }) {
  return {
    id,
    label,
    summary,
    filename: `trading-pro-max-${id}.json`,
    previewLines: reportPreviewLines(payload),
    payload
  };
}

function createTrendMetric(label, current, previous) {
  if (!Number.isFinite(previous)) {
    return {
      label,
      current,
      previous: null,
      delta: 0,
      direction: "baseline"
    };
  }

  const delta = current - previous;
  const direction = delta >= 4 ? "up" : delta <= -4 ? "down" : "flat";

  return {
    label,
    current,
    previous,
    delta,
    direction
  };
}

export function getGuardedActionCatalog() {
  return [
    {
      key: "observe",
      label: "Observe",
      scope: "Read-only runtime observation",
      description: "Inspect feed, execution, route, protection, and session state without changing the workspace."
    },
    {
      key: "diagnose",
      label: "Diagnose",
      scope: "Explain the active runtime condition",
      description: "Trace degraded runtime signals and summarize the most likely local operator issue."
    },
    {
      key: "recommend",
      label: "Recommend",
      scope: "Generate safe operator guidance",
      description: "Propose the safest next manual step based on runtime, route, and risk posture."
    },
    {
      key: "simulate",
      label: "Simulate",
      scope: "Paper-runtime scenario testing",
      description: "Run safe local scenario preparation against the paper execution layer only."
    },
    {
      key: "apply-safe-ui-adjustment",
      label: "Apply Safe UI Adjustment",
      scope: "Local workspace ergonomics",
      description: "Adjust local density and visual ergonomics without changing critical trading logic or connectivity."
    },
    {
      key: "apply-safe-runtime-reset",
      label: "Apply Safe Runtime Reset",
      scope: "Non-destructive runtime recovery",
      description: "Refresh the local runtime state only when active execution risk is not disrupted."
    },
    {
      key: "apply-safe-session-recovery",
      label: "Apply Safe Session Recovery",
      scope: "Recover the shared local session",
      description: "Recover the last saved local session snapshot without modifying critical trading logic."
    },
    {
      key: "apply-safe-risk-mode-downgrade",
      label: "Apply Safe Risk Mode Downgrade",
      scope: "Reduce risk posture safely",
      description: "Lower local risk mode when protection posture or drawdown demands a safer stance."
    },
    {
      key: "apply-safe-feed-fallback",
      label: "Apply Safe Feed Fallback",
      scope: "Fallback to the safest local feed",
      description: "Return to the local demo feed when a supported live adapter is unavailable or degraded."
    }
  ];
}

export function buildRuntimeSignals({
  hydrated,
  selectedSymbol,
  selectedRoute,
  liveDataStatus,
  liveDataDiagnostics,
  executionStatus,
  riskSummary,
  protectionState,
  riskMode,
  recentActions = [],
  sessionNotes = [],
  executionEvents = [],
  symbolRuntimeHealth = []
}) {
  const activeRuntime =
    symbolRuntimeHealth.find((item) => item.symbol === selectedSymbol) || symbolRuntimeHealth[0] || null;
  const degradedSymbols = liveDataDiagnostics?.degradedSymbols ?? 0;
  const staleSymbols = liveDataDiagnostics?.staleSymbols ?? 0;
  const latestAction = recentActions[0];
  const routeState = selectedRoute?.state || "Watch";
  const feedTone =
    liveDataDiagnostics?.feedHealth === "Healthy"
      ? "success"
      : liveDataDiagnostics?.feedHealth === "Stable" ||
          liveDataDiagnostics?.feedHealth === "Delayed" ||
          liveDataStatus?.freshness === "Warm" ||
          liveDataStatus?.freshness === "Delayed"
        ? "warning"
        : liveDataDiagnostics?.feedHealth === "Session Closed" || liveDataStatus?.freshness === "Session Closed"
          ? "info"
        : liveDataDiagnostics?.feedHealth === "Attention" ||
            liveDataDiagnostics?.feedHealth === "Degraded" ||
            liveDataDiagnostics?.feedHealth === "Awaiting Connector" ||
            liveDataStatus?.freshness === "Stale"
          ? "danger"
          : "info";
  const executionTone =
    (executionStatus?.rejectedOrders ?? 0) > 0
      ? "danger"
      : (executionStatus?.partialFills ?? 0) > 0 || (executionStatus?.pendingOrders ?? 0) > 0
        ? "warning"
        : executionStatus?.state === "Clear" || executionStatus?.state === "Ready"
          ? "success"
          : "info";
  const routeTone =
    routeState === "Ready" || routeState === "Qualified"
      ? "success"
      : routeState === "Watch"
        ? "warning"
        : routeState === "Protected" || routeState === "Blocked"
          ? "danger"
          : "info";
  const protectionTone =
    protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "success";
  const workspaceTone =
    !hydrated
      ? "danger"
      : feedTone === "danger" || executionTone === "danger"
        ? "danger"
        : feedTone === "warning" || executionTone === "warning" || routeTone === "warning"
          ? "warning"
          : "success";
  const sessionTone =
    !hydrated
      ? "danger"
      : recentActions.length >= 2 && selectedSymbol && selectedRoute?.name
        ? "success"
        : recentActions.length || sessionNotes.length || executionEvents.length
          ? "warning"
          : "info";

  const feedHealth = createSignal({
    key: "feed-health",
    label: "Feed Health",
    value: liveDataDiagnostics?.feedHealth || liveDataStatus?.state || "Awaiting Feed",
    tone: feedTone,
    detail: `${liveDataDiagnostics?.providerState || liveDataStatus?.label || "No provider"} | ${
      liveDataDiagnostics?.freshness || liveDataStatus?.freshness || "Unknown freshness"
    } | ${liveDataDiagnostics?.lastUpdate || liveDataStatus?.heartbeat || "--:--:--"}`,
    metrics: {
      providerState: liveDataDiagnostics?.providerState || liveDataStatus?.state || "Disconnected",
      freshness: liveDataDiagnostics?.freshness || liveDataStatus?.freshness || "Unknown",
      lastUpdate: liveDataDiagnostics?.lastUpdate || liveDataStatus?.heartbeat || "--:--:--",
      degradedSymbols,
      staleSymbols,
      signalState: liveDataDiagnostics?.signalState || activeRuntime?.signalState || "Monitoring"
    }
  });

  const executionHealth = createSignal({
    key: "execution-health",
    label: "Execution Health",
    value:
      executionTone === "danger"
        ? "Degraded"
        : executionTone === "warning"
          ? "Under Watch"
          : executionStatus?.state || "Ready",
    tone: executionTone,
    detail: `${executionStatus?.label || "No execution engine"} | ${executionStatus?.eventCount ?? 0} events | ${
      executionStatus?.lastEvent || "No recent event"
    }`,
    metrics: {
      provider: executionStatus?.label || "No provider",
      pendingOrders: executionStatus?.pendingOrders ?? 0,
      partialFills: executionStatus?.partialFills ?? 0,
      rejectedOrders: executionStatus?.rejectedOrders ?? 0,
      amendAcks: executionStatus?.amendAcks ?? 0,
      lastEventDetail: executionStatus?.lastEventDetail || "No execution event recorded."
    }
  });

  const routeReadiness = createSignal({
    key: "route-readiness",
    label: "Route Readiness",
    value: routeState,
    tone: routeTone,
    detail: `${selectedRoute?.name || "No route"} | ${selectedRoute?.confidence || "--"} confidence | ${
      selectedSymbol || "No symbol"
    }`,
    metrics: {
      route: selectedRoute?.name || "No route",
      asset: selectedRoute?.asset || selectedSymbol || "No symbol",
      confidence: selectedRoute?.confidence || "--",
      state: routeState
    }
  });

  const protectionPosture = createSignal({
    key: "protection-posture",
    label: "Protection Posture",
    value: protectionState,
    tone: protectionTone,
    detail: `${riskMode} mode | ${riskSummary?.openRisk || "--"} open risk | ${riskSummary?.drawdown || "--"} drawdown`,
    metrics: {
      riskMode,
      openRisk: riskSummary?.openRisk || "--",
      drawdown: riskSummary?.drawdown || "--",
      guardStatus: riskSummary?.guardStatus || "Protection state unavailable."
    }
  });

  const workspaceStatus = createSignal({
    key: "workspace-status",
    label: "Workspace Health",
    value:
      workspaceTone === "danger"
        ? "Degraded"
        : workspaceTone === "warning"
          ? "Under Watch"
          : hydrated
            ? "Synchronized"
            : "Recovering",
    tone: workspaceTone,
    detail: `${selectedSymbol || "No symbol"} | ${selectedRoute?.name || "No route"} | ${
      latestAction?.title || "No recent action"
    }`,
    metrics: {
      hydrated: hydrated ? "Hydrated" : "Cold start",
      latestAction: latestAction?.title || "No recent action",
      actionDetail: latestAction?.detail || "No shared session activity recorded."
    }
  });

  const sessionContinuity = createSignal({
    key: "session-continuity",
    label: "Session Continuity",
    value:
      sessionTone === "success"
        ? "Stable"
        : sessionTone === "warning"
          ? "Watch"
          : sessionTone === "danger"
            ? "Recovering"
            : "Connected",
    tone: sessionTone,
    detail: `${recentActions.length} actions | ${sessionNotes.length} notes | ${executionEvents.length} execution events`,
    metrics: {
      recentActions: recentActions.length,
      sessionNotes: sessionNotes.length,
      executionEvents: executionEvents.length,
      activeRuntime: activeRuntime?.runtimeHealth || liveDataDiagnostics?.runtimeHealth || "Monitoring"
    }
  });

  return {
    feedHealth,
    executionHealth,
    routeReadiness,
    protectionPosture,
    workspaceStatus,
    sessionContinuity,
    activeRuntime,
    signals: [
      feedHealth,
      executionHealth,
      routeReadiness,
      protectionPosture,
      workspaceStatus,
      sessionContinuity
    ]
  };
}

export function buildOperatorPolicy({
  liveDataSource,
  liveDataStatus,
  executionProvider,
  executionStatus,
  runtimeSignals,
  riskMode,
  hasSavedSession
}) {
  const pendingOrders = runtimeSignals.executionHealth.metrics.pendingOrders || 0;
  const partialFills = runtimeSignals.executionHealth.metrics.partialFills || 0;
  const queueActive = pendingOrders > 0 || partialFills > 0;
  const supportedLiveAdapter = liveDataSource === "demo" || liveDataSource === "twelve-data";
  const liveAdapterConfigured = liveDataSource === "demo" || liveDataStatus?.validationState === "Valid";
  const liveAdapterRequired = liveDataSource !== "demo" && !supportedLiveAdapter;
  const brokerAdapterRequired = executionProvider !== "paper";

  const rules = [
    createPolicyRule({
      key: "observe",
      label: "Observe",
      decision: "allowed",
      scope: "Read-only runtime observation",
      reason: "Observation is always allowed because it does not change trading, packaging, or code paths."
    }),
    createPolicyRule({
      key: "diagnose",
      label: "Diagnose",
      decision: "allowed",
      scope: "Runtime diagnosis",
      reason: "Diagnosis is allowed because it explains runtime conditions without changing product behavior."
    }),
    createPolicyRule({
      key: "recommend",
      label: "Recommend",
      decision: "allowed",
      scope: "Operator recommendation",
      reason: "Recommendations are allowed because they guide an operator instead of mutating critical logic."
    }),
    createPolicyRule({
      key: "simulate",
      label: "Simulate",
      decision: "allowed",
      scope: "Paper-only simulation",
      reason: "Simulation is restricted to the local paper execution layer and never sends unsupported live orders."
    }),
    createPolicyRule({
      key: "apply-safe-ui-adjustment",
      label: "Apply Safe UI Adjustment",
      decision: "allowed",
      scope: "Local workspace ergonomics",
      reason: "Safe UI adjustment is allowed because it changes only local presentation ergonomics and not trading logic."
    }),
    createPolicyRule({
      key: "apply-safe-runtime-reset",
      label: "Apply Safe Runtime Reset",
      decision: queueActive ? "approval-required" : "allowed",
      scope: "Local runtime recovery",
      reason: queueActive
        ? "Runtime reset needs explicit operator approval while working or partially filled orders are active."
        : "Runtime reset is allowed when the execution queue is not at risk."
    }),
    createPolicyRule({
      key: "apply-safe-session-recovery",
      label: "Apply Safe Session Recovery",
      decision: !hasSavedSession ? "blocked" : queueActive ? "approval-required" : "allowed",
      scope: "Restore saved local session",
      reason: !hasSavedSession
        ? "Session recovery is blocked because no saved local session snapshot is available."
        : queueActive
          ? "Session recovery requires approval while the execution queue is active."
          : "Session recovery is allowed because it restores local state without editing critical logic."
    }),
    createPolicyRule({
      key: "apply-safe-risk-mode-downgrade",
      label: "Apply Safe Risk Mode Downgrade",
      decision: riskMode === "Defensive" ? "blocked" : "allowed",
      scope: "Reduce local risk mode",
      reason:
        riskMode === "Defensive"
          ? "Risk mode downgrade is blocked because the workspace is already in the most defensive supported mode."
          : "Risk mode downgrade is allowed because it only reduces local risk exposure."
    }),
    createPolicyRule({
      key: "apply-safe-feed-fallback",
      label: "Apply Safe Feed Fallback",
      decision: liveDataSource === "demo" ? "blocked" : "allowed",
      scope: "Fallback to demo feed",
      reason:
        liveDataSource === "demo"
          ? "Feed fallback is blocked because the safest local demo feed is already active."
          : "Feed fallback is allowed because it restores the safest supported local market-data source."
    }),
    createPolicyRule({
      key: "live-data-adapter",
      label: "Live Data Adapter",
      decision: liveAdapterRequired
        ? "requires-supported-live-adapter"
        : liveAdapterConfigured
          ? "allowed"
          : "blocked",
      scope: "External market-data connectivity",
      category: "boundary",
      reason: liveAdapterRequired
        ? "A supported live market-data adapter is required before the selected live feed can operate."
        : liveAdapterConfigured
          ? liveDataSource === "twelve-data"
            ? "Twelve Data is supported in read-only mode and can operate when its local configuration is valid."
            : "The product is operating on the local demo feed and does not require a live adapter."
          : liveDataStatus?.blockedReason ||
            "The selected live-data adapter is supported, but its required local configuration is still missing."
    }),
    createPolicyRule({
      key: "broker-execution-adapter",
      label: "Broker Execution Adapter",
      decision: brokerAdapterRequired ? "requires-supported-live-adapter" : "allowed",
      scope: "Broker execution connectivity",
      category: "boundary",
      reason: brokerAdapterRequired
        ? "A supported compliant broker adapter is required before broker mode can send any real execution traffic."
        : "The product is operating in local paper execution mode."
    }),
    createPolicyRule({
      key: "real-money-execution",
      label: "Real-Money Execution",
      decision: "blocked",
      scope: "Live capital deployment",
      category: "boundary",
      reason: "Real-money execution is blocked in this build until a supported compliant broker integration is available."
    }),
    createPolicyRule({
      key: "unsupported-broker-connectivity",
      label: "Unsupported Broker Connectivity",
      decision: "blocked",
      scope: "Unverified broker connections",
      category: "boundary",
      reason: "Unsupported broker connectivity is blocked to keep the product lawful, safe, and local-first."
    }),
    createPolicyRule({
      key: "critical-product-logic-edit",
      label: "Critical Product Logic Edit",
      decision: "blocked",
      scope: "Self-modifying product logic",
      category: "boundary",
      reason: "Automatic editing of critical product logic is blocked in the autonomy foundation."
    }),
    createPolicyRule({
      key: "packaging-mutation",
      label: "Packaging Mutation",
      decision: "blocked",
      scope: "Installer or packaging changes",
      category: "boundary",
      reason: "Automatic packaging or release changes are blocked in the autonomy foundation."
    })
  ];

  const approvalRequired = rules.filter((rule) => rule.requiresApproval);
  const blocked = rules.filter((rule) => rule.blocked);
  const adapterRequired = rules.filter((rule) => rule.requiresSupportedAdapter);
  const allowed = rules.filter((rule) => rule.allowed);

  const mode =
    runtimeSignals.feedHealth.tone === "danger" ||
    runtimeSignals.executionHealth.tone === "danger" ||
    runtimeSignals.workspaceStatus.tone === "danger"
      ? "Guarded Recovery"
      : approvalRequired.length
        ? "Approval-Gated"
        : adapterRequired.length
          ? "Adapter-Limited"
          : "Guarded Observe";

  return {
    mode,
    summary:
      mode === "Guarded Recovery"
        ? "Runtime degradation is active. Only guarded recovery and diagnostic behaviors should be considered."
        : mode === "Approval-Gated"
          ? "At least one safe runtime action requires explicit operator approval before execution."
          : mode === "Adapter-Limited"
            ? "The autonomy layer is active, but some live capabilities remain limited until supported adapters are configured."
            : "The autonomy layer is operating in guarded observe mode with local-safe actions available.",
    rules,
    allowed,
    blocked,
    approvalRequired,
    adapterRequired
  };
}

export function buildEvaluationModel({ runtimeSignals, operatorPolicy }) {
  const feedSignal = runtimeSignals.feedHealth;
  const executionSignal = runtimeSignals.executionHealth;
  const routeSignal = runtimeSignals.routeReadiness;
  const protectionSignal = runtimeSignals.protectionPosture;
  const workspaceSignal = runtimeSignals.workspaceStatus;
  const sessionSignal = runtimeSignals.sessionContinuity;
  const policyPenalty =
    operatorPolicy.blocked.length * 2 +
    operatorPolicy.approvalRequired.length * 4 +
    operatorPolicy.adapterRequired.length * 5;

  const feedFreshnessScore = clamp(
    freshnessBaseScore(feedSignal.metrics.freshness) -
      (feedSignal.metrics.degradedSymbols || 0) * 10 -
      (feedSignal.metrics.staleSymbols || 0) * 12
  );
  const executionIntegrityScore = clamp(
    96 -
      (executionSignal.metrics.rejectedOrders || 0) * 28 -
      (executionSignal.metrics.partialFills || 0) * 10 -
      (executionSignal.metrics.pendingOrders || 0) * 4
  );
  const openRisk = parseMetricValue(protectionSignal.metrics.openRisk, 1.4);
  const drawdown = parseMetricValue(protectionSignal.metrics.drawdown, 0.7);
  const protectionOffset =
    protectionSignal.value === "Locked" ? -12 : protectionSignal.value === "Guarded" ? -4 : 6;
  const riskModeOffset =
    protectionSignal.metrics.riskMode === "Defensive"
      ? 4
      : protectionSignal.metrics.riskMode === "Aggressive"
        ? -8
        : 0;
  const riskPostureScore = clamp(92 - openRisk * 11 - drawdown * 18 + protectionOffset + riskModeOffset);
  const workspaceHealthScore = clamp(
    Math.round((feedFreshnessScore + executionIntegrityScore + routeBaseScore(routeSignal.value)) / 3) +
      (workspaceSignal.tone === "success" ? 4 : workspaceSignal.tone === "warning" ? -6 : -16)
  );
  const sessionStabilityScore = clamp(
    68 +
      Math.min(16, sessionSignal.metrics.recentActions * 4) +
      Math.min(10, sessionSignal.metrics.sessionNotes * 2) +
      Math.min(10, sessionSignal.metrics.executionEvents * 2) +
      (sessionSignal.tone === "success" ? 8 : sessionSignal.tone === "warning" ? -6 : 0)
  );
  const runtimeConfidenceScore = clamp(
    Math.round(
      (feedFreshnessScore +
        executionIntegrityScore +
        riskPostureScore +
        workspaceHealthScore +
        sessionStabilityScore) /
        5
    ) - policyPenalty
  );

  const scores = {
    feedFreshness: createScoreCard(
      "Feed Freshness",
      feedFreshnessScore,
      `${feedSignal.metrics.freshness} freshness with ${feedSignal.metrics.degradedSymbols || 0} degraded symbols in view.`
    ),
    executionIntegrity: createScoreCard(
      "Execution Integrity",
      executionIntegrityScore,
      `${executionSignal.metrics.rejectedOrders || 0} rejects, ${executionSignal.metrics.partialFills || 0} partials, ${
        executionSignal.metrics.pendingOrders || 0
      } active queue items.`
    ),
    riskPosture: createScoreCard(
      "Risk Posture",
      riskPostureScore,
      `${protectionSignal.metrics.riskMode} mode with ${protectionSignal.metrics.openRisk} open risk and ${protectionSignal.metrics.drawdown} drawdown.`
    ),
    sessionStability: createScoreCard(
      "Session Stability",
      sessionStabilityScore,
      `${sessionSignal.metrics.recentActions} actions, ${sessionSignal.metrics.sessionNotes} notes, ${sessionSignal.metrics.executionEvents} execution events carried across the session.`
    ),
    workspaceHealth: createScoreCard(
      "Workspace Health",
      workspaceHealthScore,
      `${workspaceSignal.value} workspace with ${routeSignal.value.toLowerCase()} route readiness on ${routeSignal.metrics.asset}.`
    ),
    runtimeConfidence: createScoreCard(
      "Runtime Confidence",
      runtimeConfidenceScore,
      `${operatorPolicy.mode} with ${operatorPolicy.adapterRequired.length} adapter-gated rules and ${operatorPolicy.approvalRequired.length} approval-gated actions.`
    )
  };

  return {
    ...scores,
    overall: scores.runtimeConfidence
  };
}

export function buildGuardedActions({ runtimeSignals, evaluationModel, operatorPolicy }) {
  const catalog = getGuardedActionCatalog();
  const policyMap = Object.fromEntries(operatorPolicy.rules.map((rule) => [rule.key, rule]));
  const riskSignal = runtimeSignals.protectionPosture;
  const feedSignal = runtimeSignals.feedHealth;
  const workspaceSignal = runtimeSignals.workspaceStatus;

  return catalog.map((action) => {
    const policyRule = policyMap[action.key];
    const tone = policyRule ? policyRule.tone : "info";
    const recommended =
      action.key === "diagnose"
        ? feedSignal.tone === "danger" || runtimeSignals.executionHealth.tone === "danger"
        : action.key === "apply-safe-ui-adjustment"
          ? evaluationModel.workspaceHealth.score < 84 && !policyRule?.blocked
        : action.key === "apply-safe-risk-mode-downgrade"
          ? riskSignal.tone === "danger" && !policyRule?.blocked
          : action.key === "apply-safe-feed-fallback"
            ? !policyRule?.blocked && operatorPolicy.adapterRequired.some((rule) => rule.key === "live-data-adapter")
            : action.key === "apply-safe-runtime-reset"
              ? !policyRule?.blocked && workspaceSignal.tone === "danger"
              : false;

    return {
      ...action,
      decision: policyRule?.decision || "allowed",
      status: policyRule?.status || "Allowed",
      tone,
      reason: policyRule?.reason || action.description,
      allowed: policyRule?.allowed ?? true,
      blocked: policyRule?.blocked ?? false,
      requiresApproval: policyRule?.requiresApproval ?? false,
      requiresSupportedAdapter: policyRule?.requiresSupportedAdapter ?? false,
      recommended
    };
  });
}

export function buildConnectorReadiness({
  liveDataSource,
  liveDataStatus,
  executionProvider,
  executionStatus,
  operatorPolicy
}) {
  const liveRule = operatorPolicy.rules.find((rule) => rule.key === "live-data-adapter");
  const brokerRule = operatorPolicy.rules.find((rule) => rule.key === "broker-execution-adapter");
  const liveAdapterSelected = liveDataSource !== "demo" || liveDataStatus?.key !== "demo";
  const liveAdapterSupported = liveDataSource === "twelve-data" || liveDataStatus?.key === "twelve-data";
  const liveAdapterConfigured = liveDataStatus?.validationState === "Valid";
  const brokerAdapterSelected = executionProvider !== "paper";

  const liveData = {
    key: "live-data",
    label: "Live Data Adapter",
    adapterName: liveAdapterSelected
      ? liveAdapterSupported
        ? "Twelve Data"
        : "Unsupported Live Data Selection"
      : "Supported Live Data Adapter Slot",
    capabilitySummary:
      liveAdapterSupported
        ? "Supports optional read-only live polling, provider-symbol mapping, live candle readiness, shared runtime freshness telemetry, symbol health diagnostics, and guarded demo fallback."
        : "Supports provider abstraction, freshness telemetry, symbol runtime health, and guarded feed fallback once a compliant adapter exists.",
    validationState: liveAdapterSelected
      ? liveAdapterSupported
        ? liveDataStatus?.validationState || "Awaiting Configuration"
        : "Invalid"
      : "Awaiting Configuration",
    readinessState: liveAdapterSelected
      ? liveAdapterSupported
        ? liveDataStatus?.state || (liveAdapterConfigured ? "Ready" : "Awaiting API Key")
        : "Awaiting Supported Adapter"
      : "Scaffolded",
    tone: liveAdapterSelected
      ? liveAdapterSupported
        ? liveDataStatus?.tone || (liveAdapterConfigured ? "success" : "warning")
        : "warning"
      : "info",
    capabilityChecks: [
      createDiagnosticCheck({
        label: "Provider Abstraction",
        state: "Ready",
        detail: "Demo and live-ready feed lanes are wired into the shared runtime state.",
        tone: "success"
      }),
      createDiagnosticCheck({
        label: "Health Telemetry",
        state: "Ready",
        detail: "Freshness, symbol health, signal state, and feed diagnostics are already exposed.",
        tone: "success"
      }),
      createDiagnosticCheck({
        label: "Provider Mapping",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? liveDataStatus?.providerSymbol
              ? "Ready"
              : "Pending"
            : "Missing"
          : "Standby",
        detail: liveAdapterSelected
          ? liveAdapterSupported
            ? liveDataStatus?.providerSymbol
              ? `Active runtime mapping is using ${liveDataStatus.providerSymbol}${liveDataStatus.mappingState === "Mapped" ? " through a provider translation layer." : "."}`
              : "Provider-symbol mapping will activate once a runtime symbol is selected."
            : "Provider-symbol mapping stays unavailable until a supported live adapter is selected."
          : "Provider-symbol mapping remains scaffolded while the demo feed is active.",
        tone: liveAdapterSelected
          ? liveAdapterSupported
            ? liveDataStatus?.providerSymbol
              ? "success"
              : "warning"
            : "danger"
          : "info"
      }),
      createDiagnosticCheck({
        label: "Live Candle Runtime",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? liveDataStatus?.chartReadiness || "Pending"
            : "Missing"
          : "Standby",
        detail: liveAdapterSelected
          ? liveAdapterSupported
            ? liveDataStatus?.lastCandleUpdate
              ? `Chart lane is ${String(liveDataStatus.chartReadiness || "ready").toLowerCase()} with ${liveDataStatus.chartFreshness || "unknown"} candle freshness.`
              : "Chart readiness will activate once live candles are loaded for the active symbol."
            : "Live candle runtime stays unavailable until a supported live adapter is selected."
          : "Live candle runtime is scaffolded and inactive while the demo feed is active.",
        tone: liveAdapterSelected
          ? liveAdapterSupported
            ? liveDataStatus?.chartReadiness === "Ready"
              ? "success"
              : "warning"
            : "danger"
          : "info"
      }),
      createDiagnosticCheck({
        label: "Connector Bridge",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? liveAdapterConfigured
              ? "Connected"
              : "Blocked"
            : "Missing"
          : "Standby",
        detail: liveAdapterSelected
          ? liveAdapterSupported
            ? liveRule?.reason || liveDataStatus?.blockedReason || "Twelve Data is selected in read-only mode."
            : liveRule?.reason || "A supported connector bridge is required before live data can become active."
          : "Demo mode remains the default-safe lane. Twelve Data can be enabled later as an optional read-only enhancer.",
        tone: liveAdapterSelected
          ? liveAdapterSupported
            ? liveAdapterConfigured
              ? "success"
              : "warning"
            : "danger"
          : "warning"
      })
    ],
    configValidation: [
      createDiagnosticCheck({
        label: "Adapter Registration",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? "Registered"
            : "Missing"
          : "Not Required",
        detail: liveAdapterSelected
          ? liveAdapterSupported
            ? "Twelve Data is registered as the first supported read-only live-data adapter."
            : "No supported live market-data adapter has been registered for this build."
          : "Demo mode does not require external adapter registration and remains fully usable on its own.",
        tone: liveAdapterSelected
          ? liveAdapterSupported
            ? "success"
            : "danger"
          : "info"
      }),
      createDiagnosticCheck({
        label: "Credential Envelope",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? liveAdapterConfigured
              ? "Valid"
              : "Missing"
            : "Missing"
          : "Not Required",
        detail: liveAdapterSelected
          ? liveAdapterSupported
            ? liveAdapterConfigured
              ? "The Twelve Data API key envelope is present and validated for read-only polling."
              : liveDataStatus?.blockedReason || "A Twelve Data API key is required before live polling can start."
            : "Live connector credentials and transport config are intentionally absent."
          : "No external credential envelope is required while the demo feed is active.",
        tone: liveAdapterSelected
          ? liveAdapterSupported
            ? liveAdapterConfigured
              ? "success"
              : "warning"
            : "danger"
          : "info"
      })
    ],
    requiredConfigFields: [
      createConfigField({
        label: "Adapter Registration",
        placeholder: "twelve-data",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? "Ready"
            : "Missing"
          : "Pending",
        detail: "Select `twelve-data` as the supported read-only market-data adapter."
      }),
      createConfigField({
        label: "Transport Endpoint",
        placeholder: "https://api.twelvedata.com",
        state: liveAdapterSelected && liveAdapterSupported ? "Ready" : liveAdapterSelected ? "Missing" : "Pending",
        detail: "Trading Pro Max uses a safe polling path for Twelve Data and keeps WebSocket connectivity disabled."
      }),
      createConfigField({
        label: "Credential Envelope",
        placeholder: "TWELVE_DATA_API_KEY in .env.local",
        state: liveAdapterSelected
          ? liveAdapterSupported
            ? liveAdapterConfigured
              ? "Valid"
              : "Missing"
            : "Missing"
          : "Pending",
        detail: "Provide the Twelve Data API key locally without exposing it to the browser."
      }),
      createConfigField({
        label: "Optional Base URL",
        required: false,
        placeholder: "TWELVE_DATA_BASE_URL=https://api.twelvedata.com",
        state: liveAdapterSelected && liveAdapterSupported ? "Ready" : "Pending",
        detail: "Optional override for the Twelve Data API host when local networking needs a custom base URL."
      }),
      createConfigField({
        label: "Polling Cadence",
        required: false,
        placeholder: "TWELVE_DATA_POLL_MS=20000",
        state: liveAdapterSelected && liveAdapterSupported ? "Ready" : "Pending",
        detail: "Optional local polling interval in milliseconds for the read-only Twelve Data refresh path."
      })
    ],
    blockedReason: liveAdapterSelected
      ? liveAdapterSupported
        ? liveRule?.reason ||
          liveDataStatus?.blockedReason ||
          (liveAdapterConfigured
            ? "Twelve Data is connected in lawful read-only mode while the default-safe local demo path remains available."
            : "Twelve Data is selected, but its local configuration is still missing. The workspace remains safe on demo mode.")
        : liveRule?.reason || "Live data remains blocked until a supported connector is configured."
      : "Live-ready connectivity remains disabled until an operator explicitly selects and configures a supported adapter. Demo mode stays active by default.",
    unsupportedReason:
      "Unsupported live market-data connectivity is intentionally disabled in this build."
  };

  const broker = {
    key: "broker",
    label: "Broker Execution Adapter",
    adapterName: brokerAdapterSelected ? "Unsupported Broker Selection" : "Supported Broker Adapter Slot",
    capabilitySummary:
      "Supports paper execution today and reserves a clean compliant path for broker connectivity, execution acknowledgements, and guarded policy enforcement later.",
    validationState: brokerAdapterSelected ? "Invalid" : "Awaiting Configuration",
    readinessState: brokerAdapterSelected ? "Awaiting Supported Adapter" : "Paper Mode Active",
    tone: brokerAdapterSelected ? "warning" : "info",
    capabilityChecks: [
      createDiagnosticCheck({
        label: "Paper Execution Engine",
        state: "Ready",
        detail: "Local paper execution supports staging, amendments, partial fills, rejects, and closes.",
        tone: "success"
      }),
      createDiagnosticCheck({
        label: "Execution Audit Trail",
        state: "Ready",
        detail: "Execution events, recovery actions, and journal-linked session history are active locally.",
        tone: "success"
      }),
      createDiagnosticCheck({
        label: "Broker Connector",
        state: brokerAdapterSelected ? "Missing" : "Standby",
        detail: brokerRule?.reason || "A supported compliant broker adapter is required before broker mode can activate.",
        tone: brokerAdapterSelected ? "danger" : "warning"
      })
    ],
    configValidation: [
      createDiagnosticCheck({
        label: "Compliance Boundary",
        state: "Enforced",
        detail: "Unsupported real-money execution remains blocked behind lawful policy rules.",
        tone: "success"
      }),
      createDiagnosticCheck({
        label: "Broker Credentials",
        state: brokerAdapterSelected ? "Missing" : "Not Required",
        detail: brokerAdapterSelected
          ? "No supported broker credentials or compliance envelope are configured."
          : "Paper mode does not require broker credentials.",
        tone: brokerAdapterSelected ? "danger" : "info"
      })
    ],
    requiredConfigFields: [
      createConfigField({
        label: "Adapter Registration",
        placeholder: "supported-broker-adapter",
        state: brokerAdapterSelected ? "Missing" : "Pending",
        detail: "Register a supported compliant broker adapter key before broker mode can become available."
      }),
      createConfigField({
        label: "Paper or Broker Account Scope",
        placeholder: "paper-account-id / future-supported-broker-account",
        state: brokerAdapterSelected ? "Missing" : "Pending",
        detail: "Execution scope must identify the local paper account or future supported broker account envelope."
      }),
      createConfigField({
        label: "Order Routing Policy",
        placeholder: "limit-only / bracket-required / venue policy",
        state: brokerAdapterSelected ? "Missing" : "Pending",
        detail: "Routing rules are required before any compliant broker path can be considered ready."
      }),
      createConfigField({
        label: "Compliance Envelope",
        placeholder: "approval token / policy profile / region",
        state: brokerAdapterSelected ? "Missing" : "Pending",
        detail: "Compliance settings must be validated before real broker connectivity can ever be supported."
      }),
      createConfigField({
        label: "Execution Audit Sink",
        placeholder: "local-journal / operator-review-log",
        state: brokerAdapterSelected ? "Missing" : "Pending",
        detail: "Broker readiness requires a defined audit trail for fills, rejects, amendments, and closes."
      })
    ],
    blockedReason: brokerAdapterSelected
      ? brokerRule?.reason || "Broker mode remains blocked until a supported compliant adapter is configured."
      : "Broker mode stays inactive while the product is operating in lawful paper execution mode.",
    unsupportedReason:
      "Unsupported broker connectivity and unsupported live execution remain disabled in this build."
  };

  return {
    liveData,
    broker,
    summary:
      liveAdapterSupported && liveAdapterConfigured
        ? "Demo feed remains the default-safe lane, while Twelve Data is available as an optional supported read-only live-data adapter. Paper execution remains the only execution mode."
        : liveAdapterSelected || brokerAdapterSelected
          ? "Adapter-ready slots exist, but the product still keeps local demo feed and paper execution as the safe baseline until supported connectors are fully configured."
          : "Local demo feed and paper execution are active. Live adapter slots remain scaffolded, optional, and blocked until supported connectors are configured."
  };
}

export function buildControlledAlerts({
  runtimeSignals,
  executionStatus,
  protectionState,
  recommendationLoop,
  runtimeTrendSummary
}) {
  const alerts = [];

  if (runtimeSignals.feedHealth.tone === "danger" || runtimeSignals.feedHealth.tone === "warning") {
    alerts.push(
      createAlert({
        id: "feed-health",
        label: "Feed Health Alert",
        severity: runtimeSignals.feedHealth.tone === "danger" ? "Critical" : "Warning",
        source: "Live Data",
        tone: runtimeSignals.feedHealth.tone === "danger" ? "danger" : "warning",
        reason: runtimeSignals.feedHealth.detail,
        recommendedAction:
          runtimeSignals.feedHealth.tone === "danger"
            ? "Run Diagnose or apply the safe feed fallback."
            : "Observe freshness and diagnose before escalating."
      })
    );
  }

  if ((executionStatus?.rejectedOrders ?? 0) > 0) {
    alerts.push(
      createAlert({
        id: "execution-rejects",
        label: "Execution Reject Alert",
        severity: "Critical",
        source: "Execution",
        tone: "danger",
        reason:
          executionStatus?.lastEventDetail ||
          `${executionStatus?.rejectedOrders ?? 0} rejected orders are active in the local execution history.`,
        recommendedAction: "Review the reject reason and diagnose the execution queue before sending new orders."
      })
    );
  }

  if (protectionState === "Locked") {
    alerts.push(
      createAlert({
        id: "protection-lock",
        label: "Protection Lock Alert",
        severity: "Warning",
        source: "Risk Control",
        tone: "warning",
        reason: runtimeSignals.protectionPosture.detail,
        recommendedAction: "Keep risk mode defensive and avoid expanding exposure until protection unlocks."
      })
    );
  }

  if (runtimeTrendSummary.metrics.recommendationShift.direction === "shifted") {
    alerts.push(
      createAlert({
        id: "recommendation-shift",
        label: "Recommendation Shift",
        severity: "Notice",
        source: "Autonomy",
        tone: "info",
        reason: `Recommended action changed from ${runtimeTrendSummary.metrics.recommendationShift.previous || "baseline"} to ${runtimeTrendSummary.metrics.recommendationShift.current}.`,
        recommendedAction: "Review the new recommendation before applying any guarded action."
      })
    );
  }

  if (
    runtimeSignals.workspaceStatus.tone === "danger" ||
    runtimeSignals.sessionContinuity.tone === "danger" ||
    runtimeTrendSummary.metrics.runtimeConfidence.direction === "down"
  ) {
    alerts.push(
      createAlert({
        id: "runtime-instability",
        label: "Runtime Instability",
        severity:
          runtimeSignals.workspaceStatus.tone === "danger" || runtimeSignals.sessionContinuity.tone === "danger"
            ? "Critical"
            : "Warning",
        source: "Workspace",
        tone:
          runtimeSignals.workspaceStatus.tone === "danger" || runtimeSignals.sessionContinuity.tone === "danger"
            ? "danger"
            : "warning",
        reason: `${runtimeSignals.workspaceStatus.detail} | ${runtimeTrendSummary.summary}`,
        recommendedAction:
          recommendationLoop.current.actionLabel === "Apply Safe Runtime Reset"
            ? "Run the guarded runtime reset if the queue is protected."
            : `Follow ${recommendationLoop.current.actionLabel} before taking stronger action.`
      })
    );
  }

  const severityRank = { Critical: 3, Warning: 2, Notice: 1 };
  const highestSeverity =
    alerts.reduce((highest, alert) => (severityRank[alert.severity] > severityRank[highest] ? alert.severity : highest), "Notice");

  return {
    alerts,
    highestSeverity: alerts.length ? highestSeverity : "Clear",
    summary: alerts.length
      ? `${alerts.length} controlled operator alerts are active. ${alerts[0].label} is the highest-priority review item.`
      : "No active controlled alerts. Runtime, protection, execution, and recommendation lanes are currently within guarded limits."
  };
}

export function buildOperatorReports({
  autonomyAuditLog = [],
  runtimeTrendHistory = [],
  runtimeTrendSummary,
  recoveryLog = [],
  recommendationLog = [],
  connectorReadiness,
  controlledAlerts,
  operatorPolicy,
  evaluationModel,
  runtimeSignals,
  lastRecoveryAction,
  recommendationLoop
}) {
  const generatedAtLocal = new Date().toLocaleString();
  const generatedAtIso = new Date().toISOString();

  return [
    createReport({
      id: "autonomy-audit-history",
      label: "Autonomy Audit History",
      summary: "Guarded operator actions, blocked requests, and diagnostic runs across the current local session.",
      payload: {
        generatedAtLocal,
        generatedAtIso,
        summary: "Guarded autonomy audit trail for local operator review.",
        autonomyMode: operatorPolicy.mode,
        entries: autonomyAuditLog.slice(0, 24)
      }
    }),
    createReport({
      id: "runtime-trend-history",
      label: "Runtime Trend History",
      summary: "Feed quality, execution integrity, workspace health, session stability, and confidence checkpoints.",
      payload: {
        generatedAtLocal,
        generatedAtIso,
        summary: runtimeTrendSummary.summary,
        readinessDirection: runtimeTrendSummary.readinessDirection,
        metrics: runtimeTrendSummary.metrics,
        checkpoints: runtimeTrendHistory.slice(0, 24)
      }
    }),
    createReport({
      id: "recovery-history",
      label: "Recovery History",
      summary: "Guarded recovery actions taken across the shared local session.",
      payload: {
        generatedAtLocal,
        generatedAtIso,
        summary: lastRecoveryAction
          ? `Most recent recovery action: ${lastRecoveryAction.label}.`
          : "No guarded recovery action has been recorded yet.",
        lastRecoveryAction,
        entries: recoveryLog.slice(0, 24)
      }
    }),
    createReport({
      id: "recommendation-shifts",
      label: "Recommendation Shifts",
      summary: "Current safe recommendation plus recent recommendation changes and supporting runtime signals.",
      payload: {
        generatedAtLocal,
        generatedAtIso,
        summary: recommendationLoop.summary,
        currentRecommendation: recommendationLoop.current,
        recommendationHistory: recommendationLog.slice(0, 24),
        activeSignals: runtimeSignals.signals.map((signal) => ({
          label: signal.label,
          value: signal.value,
          state: signal.state,
          detail: signal.detail
        }))
      }
    }),
    createReport({
      id: "connector-readiness-summary",
      label: "Connector Readiness Summary",
      summary: "Readiness, validation, blocked reasons, and unsupported reasons for future live-data and broker adapters.",
      payload: {
        generatedAtLocal,
        generatedAtIso,
        summary: connectorReadiness.summary,
        runtimeConfidence: evaluationModel.runtimeConfidence,
        alerts: controlledAlerts.alerts,
        adapters: [connectorReadiness.liveData, connectorReadiness.broker].map((adapter) => ({
          label: adapter.label,
          adapterName: adapter.adapterName,
          capabilitySummary: adapter.capabilitySummary,
          validationState: adapter.validationState,
          readinessState: adapter.readinessState,
          blockedReason: adapter.blockedReason,
          unsupportedReason: adapter.unsupportedReason,
          requiredConfigFields: adapter.requiredConfigFields,
          capabilityChecks: adapter.capabilityChecks,
          configValidation: adapter.configValidation
        }))
      }
    })
  ];
}

export function buildRecommendationLoop({
  runtimeSignals,
  evaluationModel,
  guardedActions,
  operatorPolicy
}) {
  const actionMap = Object.fromEntries(guardedActions.map((action) => [action.key, action]));
  const candidates = [];

  function pushCandidate(area, scoreCard, actionKey, detail) {
    const action = actionMap[actionKey] || actionMap.observe;
    candidates.push({
      id: `${area}-${actionKey}`,
      area,
      score: scoreCard.score,
      state: scoreCard.state,
      tone: scoreCard.tone,
      label: scoreCard.label,
      actionKey: action.key,
      actionLabel: action.label,
      actionStatus: action.status,
      actionDecision: action.decision,
      summary: detail
    });
  }

  if (evaluationModel.feedFreshness.score < 80 || runtimeSignals.feedHealth.tone !== "success") {
    pushCandidate(
      "feed",
      evaluationModel.feedFreshness,
      actionMap["apply-safe-feed-fallback"]?.blocked ? "diagnose" : "apply-safe-feed-fallback",
      "Feed quality is below target. Prefer the safest local feed or deepen diagnosis before stronger automation."
    );
  }

  if (evaluationModel.executionIntegrity.score < 82 || runtimeSignals.executionHealth.tone !== "success") {
    pushCandidate(
      "execution",
      evaluationModel.executionIntegrity,
      "diagnose",
      "Execution integrity is below target. Diagnose queue state, rejects, and partial fills before escalation."
    );
  }

  if (evaluationModel.riskPosture.score < 82 || runtimeSignals.protectionPosture.tone !== "success") {
    pushCandidate(
      "risk",
      evaluationModel.riskPosture,
      actionMap["apply-safe-risk-mode-downgrade"]?.blocked ? "recommend" : "apply-safe-risk-mode-downgrade",
      "Risk posture is elevated. Lower local aggression before taking additional execution risk."
    );
  }

  if (evaluationModel.sessionStability.score < 76 || runtimeSignals.sessionContinuity.tone === "danger") {
    pushCandidate(
      "session",
      evaluationModel.sessionStability,
      actionMap["apply-safe-session-recovery"]?.blocked ? "diagnose" : "apply-safe-session-recovery",
      "Session continuity is below target. Recover a stable local snapshot if available."
    );
  }

  if (evaluationModel.workspaceHealth.score < 78 || runtimeSignals.workspaceStatus.tone === "danger") {
    pushCandidate(
      "workspace",
      evaluationModel.workspaceHealth,
      actionMap["apply-safe-runtime-reset"]?.blocked ? "diagnose" : "apply-safe-runtime-reset",
      "Workspace health is degraded. Use a guarded runtime reset only if the execution queue is protected."
    );
  }

  if (evaluationModel.runtimeConfidence.score < 82) {
    pushCandidate(
      "runtime-confidence",
      evaluationModel.runtimeConfidence,
      "recommend",
      "Runtime confidence is below the target band. Keep the autonomy layer in guided recommendation mode."
    );
  }

  if (!candidates.length) {
    pushCandidate(
      "observe",
      evaluationModel.runtimeConfidence,
      "observe",
      "Runtime conditions are stable. Continue guarded observation and keep recommendations ready."
    );
  }

  candidates.sort((left, right) => left.score - right.score);

  const current = candidates[0];

  return {
    summary:
      current.actionStatus === "Blocked"
        ? `${current.label} is the weakest area, but ${current.actionLabel} is blocked by policy.`
        : `${current.label} is the weakest area. ${current.actionLabel} is the safest next improvement action.`,
    candidates,
    current,
    mode:
      operatorPolicy.mode === "Guarded Recovery"
        ? "Recovery-first"
        : operatorPolicy.mode === "Approval-Gated"
          ? "Approval-aware"
          : "Observe-and-recommend"
    };
}

export function createRuntimeTrendSnapshot({
  evaluationModel,
  recommendationLoop,
  operatorPolicy,
  lastRecoveryAction,
  recoveryLog = [],
  recommendationLog = []
}) {
  const timestamp = Date.now();
  return {
    id: `TREND-${timestamp}`,
    timestamp,
    time: new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    feedFreshnessScore: evaluationModel.feedFreshness.score,
    executionIntegrityScore: evaluationModel.executionIntegrity.score,
    workspaceHealthScore: evaluationModel.workspaceHealth.score,
    sessionStabilityScore: evaluationModel.sessionStability.score,
    runtimeConfidenceScore: evaluationModel.runtimeConfidence.score,
    recommendationKey: recommendationLoop.current.actionKey,
    recommendationLabel: recommendationLoop.current.actionLabel,
    autonomyMode: operatorPolicy.mode,
    recoveryKey: lastRecoveryAction?.key || "none",
    recoveryCount: recoveryLog.length,
    recommendationCount: recommendationLog.length
  };
}

export function mergeRuntimeTrendHistory(history = [], currentSnapshot) {
  const previous = history[0];
  if (!previous) {
    return [currentSnapshot];
  }

  const significant =
    Math.abs(currentSnapshot.feedFreshnessScore - previous.feedFreshnessScore) >= 8 ||
    Math.abs(currentSnapshot.executionIntegrityScore - previous.executionIntegrityScore) >= 8 ||
    Math.abs(currentSnapshot.workspaceHealthScore - previous.workspaceHealthScore) >= 8 ||
    Math.abs(currentSnapshot.sessionStabilityScore - previous.sessionStabilityScore) >= 8 ||
    Math.abs(currentSnapshot.runtimeConfidenceScore - previous.runtimeConfidenceScore) >= 8 ||
    currentSnapshot.recommendationKey !== previous.recommendationKey ||
    currentSnapshot.recoveryKey !== previous.recoveryKey ||
    currentSnapshot.autonomyMode !== previous.autonomyMode ||
    currentSnapshot.timestamp - previous.timestamp >= 120000;

  if (!significant) {
    return history;
  }

  return [currentSnapshot, ...history].slice(0, 16);
}

export function buildRuntimeTrendSummary({
  currentSnapshot,
  history = [],
  recoveryLog = [],
  recommendationLog = []
}) {
  const previous = history[0];
  const metrics = {
    feedQuality: createTrendMetric(
      "Feed Quality",
      currentSnapshot.feedFreshnessScore,
      previous?.feedFreshnessScore
    ),
    executionIntegrity: createTrendMetric(
      "Execution Integrity",
      currentSnapshot.executionIntegrityScore,
      previous?.executionIntegrityScore
    ),
    workspaceHealth: createTrendMetric(
      "Workspace Health",
      currentSnapshot.workspaceHealthScore,
      previous?.workspaceHealthScore
    ),
    sessionStability: createTrendMetric(
      "Session Stability",
      currentSnapshot.sessionStabilityScore,
      previous?.sessionStabilityScore
    ),
    runtimeConfidence: createTrendMetric(
      "Runtime Confidence",
      currentSnapshot.runtimeConfidenceScore,
      previous?.runtimeConfidenceScore
    ),
    recoveryEvents: {
      label: "Recovery Events",
      current: recoveryLog.length,
      previous: previous?.recoveryCount ?? null,
      delta: Number.isFinite(previous?.recoveryCount) ? recoveryLog.length - previous.recoveryCount : 0,
      direction: !Number.isFinite(previous?.recoveryCount) ? "baseline" : recoveryLog.length > previous.recoveryCount ? "up" : recoveryLog.length < previous.recoveryCount ? "down" : "flat"
    },
    recommendationShift: {
      label: "Recommendation Shift",
      current: currentSnapshot.recommendationLabel,
      previous: previous?.recommendationLabel || null,
      delta: 0,
      direction:
        !previous?.recommendationLabel
          ? "baseline"
          : currentSnapshot.recommendationLabel === previous.recommendationLabel
            ? "flat"
            : "shifted"
    }
  };

  const upward = Object.values(metrics).filter((metric) => metric.direction === "up").length;
  const downward = Object.values(metrics).filter((metric) => metric.direction === "down").length;
  const shifted = metrics.recommendationShift.direction === "shifted";

  return {
    metrics,
    summary:
      !previous
        ? "Current runtime quality is the local baseline for guarded autonomy trend tracking."
        : downward > upward
          ? "Runtime quality is trending down versus the prior local checkpoint. Favor guarded diagnosis and recovery."
          : upward > downward
            ? "Runtime quality is trending up versus the prior local checkpoint."
            : shifted
              ? "Runtime quality is steady, but the recommended action has shifted since the prior checkpoint."
              : "Runtime quality is broadly stable versus the prior local checkpoint.",
    readinessDirection:
      metrics.runtimeConfidence.direction === "up"
        ? "Improving"
        : metrics.runtimeConfidence.direction === "down"
          ? "Softening"
          : metrics.runtimeConfidence.direction === "baseline"
            ? "Baseline"
            : "Stable",
    historyRows: history.slice(0, 6)
  };
}

export function buildAutonomyDiagnostics({
  runtimeSignals,
  evaluationModel,
  guardedActions,
  operatorPolicy,
  recommendationLoop,
  lastRecoveryAction
}) {
  const healthy = runtimeSignals.signals
    .filter((signal) => signal.tone === "success" || signal.tone === "info")
    .slice(0, 4)
    .map((signal) => `${signal.label} is ${signal.value.toLowerCase()}: ${signal.detail}`);
  const degraded = runtimeSignals.signals
    .filter((signal) => signal.tone === "danger" || signal.tone === "warning")
    .slice(0, 4)
    .map((signal) => `${signal.label} is ${signal.value.toLowerCase()}: ${signal.detail}`);
  const recommendedAction =
    guardedActions.find((action) => action.key === recommendationLoop.current.actionKey) ||
    guardedActions.find((action) => action.recommended) ||
    guardedActions[0];
  const blockedAction =
    operatorPolicy.blocked[0] ||
    operatorPolicy.adapterRequired[0] ||
    guardedActions.find((action) => action.blocked || action.requiresSupportedAdapter) || {
      label: "No Blocked Action",
      status: "Open",
      tone: "success",
      reason: "All guarded action classes are currently available within local safety boundaries."
    };
  const recovery =
    lastRecoveryAction || {
      label: "No Recovery Applied",
      detail: "No guarded recovery action has been applied in the current local session.",
      status: "Standby",
      tone: "info",
      time: "--:--"
    };

  return {
    summary:
      degraded.length > 0
        ? `Lawful guarded autonomy is active. ${recommendationLoop.current.actionLabel} is the preferred next step while degraded conditions are still present.`
        : `Lawful guarded autonomy is stable. ${recommendationLoop.current.actionLabel} remains ready as the safest next step.`,
    healthy,
    degraded,
    recommendedAction: {
      ...recommendedAction,
      detail: recommendationLoop.current.summary
    },
    blockedAction,
    lastRecoveryAction: recovery,
    currentAutonomyMode: operatorPolicy.mode,
    policyHighlights: [
      ...operatorPolicy.approvalRequired.slice(0, 2),
      ...operatorPolicy.adapterRequired.slice(0, 2),
      ...operatorPolicy.blocked.slice(0, 2)
    ],
    scores: [
      evaluationModel.feedFreshness,
      evaluationModel.executionIntegrity,
      evaluationModel.riskPosture,
      evaluationModel.sessionStability,
      evaluationModel.workspaceHealth,
      evaluationModel.runtimeConfidence
    ]
  };
}
