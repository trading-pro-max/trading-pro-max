function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
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

function directionTone(direction) {
  if (direction === "up" || direction === "improving") return "success";
  if (direction === "down" || direction === "softening") return "danger";
  if (direction === "shifted") return "warning";
  return "info";
}

function uniqBy(items = [], getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

function countWeakSnapshots(history = [], metricKey, threshold) {
  return history.filter((item) => Number(item?.[metricKey] || 0) < threshold).length;
}

function countLogMatches(log = [], matcher) {
  return log.filter((entry) => matcher(entry)).length;
}

function inferImprovementCategory(entry = {}) {
  if (entry.key === "apply-safe-feed-fallback") return "Live Data Quality";
  if (entry.key === "apply-safe-runtime-reset") return "Runtime Stability";
  if (entry.key === "apply-safe-session-recovery") return "Operator Workflow";
  if (entry.key === "apply-safe-risk-mode-downgrade") return "Risk Posture";
  if (entry.key === "apply-safe-ui-adjustment") return "UX / Product Polish";
  if (entry.key === "diagnose") return "Runtime Diagnosis";
  if (entry.key === "simulate") return "Paper Simulation";
  if (entry.key === "recommend") return "Improvement Recommendation";
  return "Operator Review";
}

function buildRecurringWeakAreas({ runtimeTrendHistory = [], recommendationLog = [], recoveryLog = [], evaluationModel }) {
  const areas = [
    {
      key: "live-data-quality",
      label: "Live Data Quality",
      score: evaluationModel.feedFreshness.score,
      count:
        countWeakSnapshots(runtimeTrendHistory, "feedFreshnessScore", 80) +
        countLogMatches(recommendationLog, (entry) => entry.key === "apply-safe-feed-fallback")
    },
    {
      key: "execution-quality",
      label: "Execution Quality",
      score: evaluationModel.executionIntegrity.score,
      count:
        countWeakSnapshots(runtimeTrendHistory, "executionIntegrityScore", 82) +
        countLogMatches(recommendationLog, (entry) => entry.key === "diagnose" && String(entry.detail || "").toLowerCase().includes("execution"))
    },
    {
      key: "runtime-stability",
      label: "Runtime Stability",
      score: Math.round((evaluationModel.workspaceHealth.score + evaluationModel.runtimeConfidence.score) / 2),
      count:
        countWeakSnapshots(runtimeTrendHistory, "workspaceHealthScore", 78) +
        countLogMatches(recoveryLog, (entry) => entry.key === "apply-safe-runtime-reset")
    },
    {
      key: "operator-workflow",
      label: "Operator Workflow",
      score: evaluationModel.sessionStability.score,
      count:
        countWeakSnapshots(runtimeTrendHistory, "sessionStabilityScore", 76) +
        countLogMatches(recoveryLog, (entry) => entry.key === "apply-safe-session-recovery")
    },
    {
      key: "ux-product-polish",
      label: "UX / Product Polish",
      score: Math.round((evaluationModel.workspaceHealth.score + evaluationModel.sessionStability.score) / 2),
      count:
        countWeakSnapshots(runtimeTrendHistory, "runtimeConfidenceScore", 82) +
        countLogMatches(recommendationLog, (entry) => entry.key === "apply-safe-ui-adjustment")
    }
  ];

  return areas
    .map((area) => ({
      ...area,
      tone: toneForScore(area.score),
      state: stateForScore(area.score),
      recurring: area.count >= 2,
      detail:
        area.count > 0
          ? `${area.count} recurring checkpoints or recommendations have flagged ${area.label.toLowerCase()}.`
          : `${area.label} has not shown recurring pressure in the current local memory.`
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.score - right.score;
    });
}

export function buildProductMemory({
  selectedSymbol,
  selectedRoute,
  runtimeSignals,
  evaluationModel,
  controlledAlerts,
  recentActions = [],
  autonomyAuditLog = [],
  recoveryLog = [],
  recommendationLog = [],
  runtimeTrendHistory = []
}) {
  const recurringWeakAreas = buildRecurringWeakAreas({
    runtimeTrendHistory,
    recommendationLog,
    recoveryLog,
    evaluationModel
  });
  const pastRuntimeIssues = uniqBy(
    [
      ...(controlledAlerts?.alerts || []).map((alert) => ({
        id: alert.id,
        label: alert.label,
        detail: alert.reason,
        severity: alert.severity,
        source: alert.source,
        tone: alert.tone
      })),
      ...runtimeSignals.signals
        .filter((signal) => signal.degraded)
        .map((signal) => ({
          id: signal.key,
          label: signal.label,
          detail: signal.detail,
          severity: signal.state,
          source: "Runtime Signal",
          tone: signal.tone
        }))
    ],
    (item) => item.id
  ).slice(0, 8);
  const improvementHistory = uniqBy(
    [
      ...autonomyAuditLog.map((entry) => ({
        ...entry,
        category: inferImprovementCategory(entry)
      })),
      ...recoveryLog.map((entry) => ({
        ...entry,
        category: inferImprovementCategory(entry)
      })),
      ...recommendationLog.map((entry) => ({
        ...entry,
        category: inferImprovementCategory(entry)
      }))
    ],
    (entry) => entry.id
  ).slice(0, 12);

  return {
    summary:
      pastRuntimeIssues.length > 0
        ? `${pastRuntimeIssues.length} runtime issues and ${recurringWeakAreas.filter((area) => area.count > 0).length} recurring weak areas are preserved in local product memory.`
        : "Local product memory is clean. Guarded autonomy has not recorded recurring runtime stress in the current session.",
    currentContext: {
      symbol: selectedSymbol || "No Symbol",
      route: selectedRoute?.name || "No Route"
    },
    memoryDepth:
      pastRuntimeIssues.length +
      recoveryLog.length +
      recommendationLog.length +
      recentActions.length,
    pastRuntimeIssues,
    pastRecoveryActions: recoveryLog.slice(0, 8),
    pastRecommendations: recommendationLog.slice(0, 8),
    pastOperatorActions: recentActions.slice(0, 8),
    recurringWeakAreas,
    improvementHistory,
    lastImprovement: improvementHistory[0] || null
  };
}

function createGoal({
  key,
  label,
  score,
  whyItMatters,
  recommendedAction,
  blockedReason = null,
  detail
}) {
  return {
    key,
    label,
    score,
    tone: toneForScore(score),
    state: stateForScore(score),
    whyItMatters,
    recommendedAction,
    blockedReason,
    blocked: Boolean(blockedReason),
    detail
  };
}

function actionMapForOrchestrator(guardedActions = []) {
  return Object.fromEntries(guardedActions.map((action) => [action.key, action]));
}

function pickAction(actionMap, preferredKey, fallbackKey = "observe") {
  return actionMap[preferredKey] || actionMap[fallbackKey] || { label: "Observe", key: "observe", status: "Allowed", tone: "info", reason: "Observe the runtime." };
}

export function buildInfinityLoop({
  runtimeSignals,
  evaluationModel,
  recommendationLoop,
  guardedActions,
  lastRecoveryAction,
  productMemory
}) {
  const actionMap = actionMapForOrchestrator(guardedActions);
  const recommendedAction = pickAction(actionMap, recommendationLoop.current.actionKey);
  const degraded = runtimeSignals.signals.some((signal) => signal.degraded);
  const lastOutcome = productMemory.lastImprovement;
  const stages = [
    {
      key: "observe",
      label: "Observe",
      status: "Active",
      tone: "success",
      detail: `Monitoring ${runtimeSignals.feedHealth.value}, ${runtimeSignals.executionHealth.value}, and ${runtimeSignals.workspaceStatus.value} across the shared workspace.`
    },
    {
      key: "score",
      label: "Score",
      status: "Active",
      tone: toneForScore(evaluationModel.runtimeConfidence.score),
      detail: `Runtime confidence is ${evaluationModel.runtimeConfidence.score} with ${evaluationModel.feedFreshness.score} feed freshness and ${evaluationModel.executionIntegrity.score} execution integrity.`
    },
    {
      key: "diagnose",
      label: "Diagnose",
      status: degraded ? "Active" : "Ready",
      tone: degraded ? "warning" : "info",
      detail: degraded
        ? recommendationLoop.summary
        : "Diagnosis is ready if runtime quality softens or an operator requests a deeper trace."
    },
    {
      key: "recommend",
      label: "Recommend",
      status: "Active",
      tone: recommendedAction.tone || "info",
      detail: `${recommendedAction.label} is the current safest next step.`
    },
    {
      key: "simulate",
      label: "Simulate",
      status: actionMap.simulate?.blocked ? "Blocked" : "Ready",
      tone: actionMap.simulate?.blocked ? "danger" : "info",
      detail: actionMap.simulate?.reason || "Paper-runtime simulation is ready for guarded operator use."
    },
    {
      key: "apply-safe-action",
      label: "Apply Safe Action",
      status: recommendedAction.key.startsWith("apply-safe") ? recommendedAction.status : "Standby",
      tone: recommendedAction.key.startsWith("apply-safe") ? recommendedAction.tone : "info",
      detail:
        recommendedAction.key.startsWith("apply-safe")
          ? recommendedAction.reason
          : "No automatic critical mutation is permitted. Safe action remains operator-triggered."
    },
    {
      key: "verify-result",
      label: "Verify Result",
      status: lastRecoveryAction ? "Ready" : "Standby",
      tone: lastRecoveryAction ? toneForScore(evaluationModel.runtimeConfidence.score) : "info",
      detail:
        lastRecoveryAction
          ? `Last guarded recovery was ${lastRecoveryAction.label.toLowerCase()} at ${lastRecoveryAction.time || "--:--"}.`
          : "No guarded recovery has been applied yet in this local session."
    },
    {
      key: "record-outcome",
      label: "Record Outcome",
      status: productMemory.improvementHistory.length ? "Active" : "Standby",
      tone: productMemory.improvementHistory.length ? "success" : "info",
      detail:
        productMemory.improvementHistory.length
          ? `${productMemory.improvementHistory.length} improvement and recovery records are preserved in local product memory.`
          : "Outcome recording is ready once the first guarded action or recommendation is logged."
    }
  ];

  const lastStage = stages.find((stage) => stage.status === "Active") || stages[0];
  const critical = runtimeSignals.workspaceStatus.tone === "danger" || runtimeSignals.executionHealth.tone === "danger";

  return {
    status: critical ? "Recovery Cycle Active" : degraded ? "Guided Improvement Active" : "Continuous Guarded Observation",
    tone: critical ? "danger" : degraded ? "warning" : "success",
    summary:
      critical
        ? "Infinity loop is prioritizing guarded recovery and verification."
        : degraded
          ? "Infinity loop is observing, scoring, diagnosing, and recommending safe local actions."
          : "Infinity loop is stable and continuing its guarded observe-score-recommend cycle.",
    iterationCount: productMemory.memoryDepth || 0,
    currentStage: lastStage,
    stages
  };
}

export function buildInfinityOrchestrator({
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
}) {
  const actionMap = actionMapForOrchestrator(guardedActions);
  const runtimeAction = pickAction(actionMap, "apply-safe-runtime-reset", "diagnose");
  const executionAction = pickAction(actionMap, "diagnose");
  const liveAction = pickAction(actionMap, "apply-safe-feed-fallback", "diagnose");
  const workflowAction = pickAction(actionMap, "apply-safe-session-recovery", "recommend");
  const polishAction = pickAction(actionMap, "apply-safe-ui-adjustment", "recommend");
  const liveRule = operatorPolicy.rules.find((rule) => rule.key === "live-data-adapter");

  const goals = [
    createGoal({
      key: "runtime-stability",
      label: "Runtime Stability",
      score: Math.round((evaluationModel.workspaceHealth.score + evaluationModel.runtimeConfidence.score) / 2),
      whyItMatters: "Stable runtime state keeps the shell, diagnostics, and session continuity synchronized across the product.",
      recommendedAction: runtimeAction,
      blockedReason: runtimeAction.blocked ? runtimeAction.reason : null,
      detail: runtimeSignals.workspaceStatus.detail
    }),
    createGoal({
      key: "execution-quality",
      label: "Execution Quality",
      score: evaluationModel.executionIntegrity.score,
      whyItMatters: "Paper execution realism and queue integrity keep terminal behavior trustworthy and safe.",
      recommendedAction: executionAction,
      blockedReason: executionAction.blocked ? executionAction.reason : null,
      detail: runtimeSignals.executionHealth.detail
    }),
    createGoal({
      key: "live-data-quality",
      label: "Live Data Quality",
      score: evaluationModel.feedFreshness.score,
      whyItMatters: "Cleaner quote and candle freshness improves route confidence, chart readiness, and market context across modules.",
      recommendedAction: liveAction,
      blockedReason:
        liveAction.blocked && liveRule?.reason
          ? liveRule.reason
          : liveAction.blocked
            ? liveAction.reason
            : null,
      detail: runtimeSignals.feedHealth.detail
    }),
    createGoal({
      key: "operator-workflow",
      label: "Operator Workflow",
      score: Math.round((evaluationModel.sessionStability.score + evaluationModel.runtimeConfidence.score) / 2),
      whyItMatters: "Operators need resilient local memory, recovery paths, and session continuity to keep the desk moving.",
      recommendedAction: workflowAction,
      blockedReason: workflowAction.blocked ? workflowAction.reason : null,
      detail: runtimeSignals.sessionContinuity.detail
    }),
    createGoal({
      key: "ux-product-polish",
      label: "UX / Product Polish",
      score: Math.round((evaluationModel.workspaceHealth.score + evaluationModel.sessionStability.score) / 2),
      whyItMatters: "Sharper local UX keeps the product legible and operator-grade during long desktop sessions.",
      recommendedAction: polishAction,
      blockedReason: polishAction.blocked ? polishAction.reason : null,
      detail: runtimeTrendSummary.summary
    })
  ].sort((left, right) => left.score - right.score);

  const weakPoints = goals
    .map((goal) => ({
      ...goal,
      recurringCount:
        productMemory.recurringWeakAreas.find((area) => area.key === goal.key)?.count || 0
    }))
    .filter((goal) => goal.score < 84 || goal.recurringCount > 0)
    .slice(0, 5);
  const safeActionQueue = guardedActions
    .filter((action) => !action.requiresSupportedAdapter)
    .sort((left, right) => {
      if (left.recommended !== right.recommended) return left.recommended ? -1 : 1;
      if (left.blocked !== right.blocked) return left.blocked ? 1 : -1;
      if (left.requiresApproval !== right.requiresApproval) return left.requiresApproval ? 1 : -1;
      return left.label.localeCompare(right.label);
    })
    .slice(0, 6);
  const recoveryQueue = safeActionQueue.filter((action) => action.key.startsWith("apply-safe")).slice(0, 5);
  const improvementRecommendations = recommendationLoop.candidates.slice(0, 5).map((candidate) => ({
    id: candidate.id,
    area: candidate.area,
    label: candidate.actionLabel,
    summary: candidate.summary,
    status: candidate.actionStatus,
    tone: candidate.tone
  }));
  const topPriority = weakPoints[0] || goals[0];
  const systemHealthScore = clamp(
    Math.round(
      (evaluationModel.runtimeConfidence.score +
        evaluationModel.workspaceHealth.score +
        evaluationModel.executionIntegrity.score +
        evaluationModel.feedFreshness.score) /
        4
    )
  );

  return {
    systemHealth: {
      score: systemHealthScore,
      tone: toneForScore(systemHealthScore),
      state: stateForScore(systemHealthScore),
      detail:
        controlledAlerts.highestSeverity === "Clear"
          ? "No critical operator alerts are active. The infinity loop can stay in guided observe mode."
          : `${controlledAlerts.highestSeverity} alerts are active, so guarded diagnosis and recovery remain prioritized.`
    },
    goals,
    activePriorities: weakPoints.length ? weakPoints : goals.slice(0, 3),
    weakPoints,
    safeActionQueue,
    recoveryQueue,
    improvementRecommendations,
    topPriority,
    currentWeakPoint: topPriority,
    lastImprovement: productMemory.lastImprovement,
    currentAutonomyMode: operatorPolicy.mode,
    infinityLoopStatus: infinityLoop.status,
    readinessSummary:
      connectorReadiness.summary ||
      "Local demo feed and paper execution remain the guarded baseline.",
    summary: `${topPriority.label} is the current top priority because it is scoring ${topPriority.score} and directly affects ${topPriority.whyItMatters.toLowerCase()}`,
    nextRecommendedAction: topPriority.recommendedAction
  };
}
