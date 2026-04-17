export const CANONICAL_OPERATOR_DESK_SURFACES = [
  {
    key: "home-base",
    href: "/",
    label: "Home Base",
    shell: "home-base",
    pageFile: "app/page.js",
    summary: "Daily operating desk and workflow anchor."
  },
  {
    key: "market-intelligence",
    href: "/market-intelligence",
    label: "Market Intelligence",
    shell: "module-page",
    pageFile: "app/market-intelligence/page.js",
    summary: "Shared market posture and watchlist context."
  },
  {
    key: "execution-center",
    href: "/execution-center",
    label: "Execution Center",
    shell: "execution-shell",
    pageFile: "app/execution-center/page.js",
    summary: "Paper-safe execution terminal and queue control."
  },
  {
    key: "risk-control",
    href: "/risk-control",
    label: "Risk Control",
    shell: "module-page",
    pageFile: "app/risk-control/page.js",
    summary: "Protection posture and guard controls."
  },
  {
    key: "ai-copilot",
    href: "/ai-copilot",
    label: "AI Copilot",
    shell: "module-page",
    pageFile: "app/ai-copilot/page.js",
    summary: "Operator guidance and next-step interpretation."
  },
  {
    key: "journal-vault",
    href: "/journal-vault",
    label: "Journal Vault",
    shell: "module-page",
    pageFile: "app/journal-vault/page.js",
    summary: "Review memory and continuity handoff."
  },
  {
    key: "strategy-lab",
    href: "/strategy-lab",
    label: "Strategy Lab",
    shell: "module-page",
    pageFile: "app/strategy-lab/page.js",
    summary: "Route qualification and execution prep."
  }
];

export const CANONICAL_OPERATOR_MODULE_SURFACES = CANONICAL_OPERATOR_DESK_SURFACES.filter(
  (surface) => surface.href !== "/"
);

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function getOperatorDeskTone(score) {
  if (score >= 84) return "success";
  if (score >= 64) return "info";
  if (score >= 44) return "warning";
  return "danger";
}

export function getOperatorDeskState(score) {
  if (score >= 84) return "Accepted";
  if (score >= 64) return "Ready";
  if (score >= 44) return "Needs Review";
  return "At Risk";
}

export function getCanonicalOperatorDeskSurface(href = "/") {
  return CANONICAL_OPERATOR_DESK_SURFACES.find((surface) => surface.href === href) || CANONICAL_OPERATOR_DESK_SURFACES[0];
}

function scoreWorkflowRecord(workflow = {}) {
  const progress = Number(workflow?.progressPct || 0);
  const statusCapture = String(workflow?.statusCapture || "").trim();
  const isComplete = Boolean(workflow?.isComplete);
  const isStale = Boolean(workflow?.isStale);
  const base = 24 + progress * 0.5 + (statusCapture ? 14 : 0) + (isComplete ? 16 : 0) + (isStale ? 0 : 10);
  return clampScore(base);
}

function buildContinuityArtifacts({
  activeReviewSnapshot,
  activeReplayQueue,
  latestHandoff,
  activeContinuityCollection,
  activeContinuityReport
}) {
  return [
    activeReviewSnapshot ? "review snapshot" : "",
    activeReplayQueue ? "replay queue" : "",
    latestHandoff ? "handoff packet" : "",
    activeContinuityCollection ? "continuity collection" : "",
    activeContinuityReport ? "continuity insight" : ""
  ].filter(Boolean);
}

function buildDailyWorkflowCheck(dayOpenWorkflow, dayCloseWorkflow) {
  const openScore = scoreWorkflowRecord(dayOpenWorkflow);
  const closeScore = scoreWorkflowRecord(dayCloseWorkflow);
  const score = clampScore((openScore + closeScore) / 2);

  return {
    key: "daily-workflow",
    label: "Daily Workflow",
    score,
    tone: getOperatorDeskTone(score),
    state: getOperatorDeskState(score),
    detail: `${dayOpenWorkflow?.status || "Waiting"} open | ${dayCloseWorkflow?.status || "Waiting"} close | ${
      dayOpenWorkflow?.completedCount || 0
    }/${dayOpenWorkflow?.totalCount || 0} open items | ${dayCloseWorkflow?.completedCount || 0}/${
      dayCloseWorkflow?.totalCount || 0
    } close items`
  };
}

function buildCommandSpineCheck(homeBaseSummary = {}) {
  const quickActions = homeBaseSummary.quickActions || [];
  const resumeOptions = homeBaseSummary.resumeOptions || [];
  const moduleSwitches = homeBaseSummary.moduleSwitches || [];
  const moduleCoverage = Math.min(moduleSwitches.length, CANONICAL_OPERATOR_MODULE_SURFACES.length);
  const score = clampScore(
    (homeBaseSummary.resumeTarget ? 28 : 0) +
      Math.min(quickActions.length, 4) * 12 +
      Math.min(resumeOptions.length, 4) * 10 +
      (moduleCoverage / Math.max(CANONICAL_OPERATOR_MODULE_SURFACES.length, 1)) * 24
  );

  return {
    key: "command-spine",
    label: "Command Spine",
    score,
    tone: getOperatorDeskTone(score),
    state: getOperatorDeskState(score),
    detail: `${quickActions.length} quick actions | ${resumeOptions.length} resume options | ${moduleCoverage}/${CANONICAL_OPERATOR_MODULE_SURFACES.length} module switches`
  };
}

function buildPaperSafeCheck(executionStatus = {}, liveDataStatus = {}, protectionState = "", riskMode = "") {
  const executionMode = `${executionStatus?.label || ""} ${executionStatus?.mode || ""}`.toLowerCase();
  const feedMode = `${liveDataStatus?.label || ""} ${liveDataStatus?.mode || ""} ${liveDataStatus?.state || ""}`.toLowerCase();
  const executionScore = executionMode.includes("paper") ? 100 : executionMode.includes("sim") ? 92 : 72;
  const feedScore =
    feedMode.includes("demo") || feedMode.includes("local") || feedMode.includes("fallback")
      ? 100
      : feedMode.includes("live")
        ? 78
        : 86;
  const guardScore = protectionState === "Guarded" ? 98 : protectionState === "Locked" ? 94 : 86;
  const score = clampScore((executionScore + feedScore + guardScore) / 3);

  return {
    key: "paper-safe",
    label: "Paper-Safe Guard",
    score,
    tone: getOperatorDeskTone(score),
    state: getOperatorDeskState(score),
    detail: `${executionStatus?.label || executionStatus?.mode || "Execution pending"} | ${
      liveDataStatus?.label || liveDataStatus?.mode || "Local feed"
    } | ${protectionState || riskMode || "Guarded posture"}`
  };
}

function buildContinuityCheck({
  activeReviewSnapshot,
  activeReplayQueue,
  latestHandoff,
  activeContinuityCollection,
  activeContinuityReport
}) {
  const artifacts = buildContinuityArtifacts({
    activeReviewSnapshot,
    activeReplayQueue,
    latestHandoff,
    activeContinuityCollection,
    activeContinuityReport
  });
  const score = clampScore(28 + Math.min(artifacts.length, 4) * 18);

  return {
    key: "continuity",
    label: "Continuity Readiness",
    score,
    tone: getOperatorDeskTone(score),
    state: getOperatorDeskState(score),
    detail: artifacts.length ? artifacts.join(" | ") : "No review or continuity artifact is active yet."
  };
}

function buildShellCoverageCheck(surfaceHref, homeBaseSummary = {}) {
  const surface = getCanonicalOperatorDeskSurface(surfaceHref);
  const moduleSwitches = homeBaseSummary.moduleSwitches || [];
  const coverage = Math.min(moduleSwitches.length, CANONICAL_OPERATOR_MODULE_SURFACES.length);
  const score = clampScore(
    34 +
      (surface ? 18 : 0) +
      (homeBaseSummary.summary ? 12 : 0) +
      (homeBaseSummary.overallScore ? 12 : 0) +
      (coverage / Math.max(CANONICAL_OPERATOR_MODULE_SURFACES.length, 1)) * 24
  );

  return {
    key: "shell-coverage",
    label: "Canonical Shell",
    score,
    tone: getOperatorDeskTone(score),
    state: getOperatorDeskState(score),
    detail: `${surface.label} is aligned with ${CANONICAL_OPERATOR_DESK_SURFACES.length} canonical desk surfaces | ${coverage}/${CANONICAL_OPERATOR_MODULE_SURFACES.length} module lanes ranked`
  };
}

function buildBestNextMove(surfaceHref, homeBaseSummary = {}, protectionState = "") {
  const resumeTarget = homeBaseSummary.resumeTarget || null;

  if (protectionState === "Locked") {
    return {
      label: "Review Risk Control",
      focusLabel: "Risk Control",
      detail: "Protection is locked. Confirm the guard state before resuming any downstream desk flow.",
      href: "/risk-control",
      tone: "danger"
    };
  }

  if (resumeTarget?.path || resumeTarget?.label || resumeTarget?.focusLabel) {
    return {
      label: resumeTarget.actionLabel || "Resume Best Context",
      focusLabel: resumeTarget.focusLabel || resumeTarget.label || "Execution Center",
      detail: resumeTarget.detail || "Resume the strongest shared operating context from Home Base.",
      href: resumeTarget.path || "/execution-center",
      tone: resumeTarget.tone || "success"
    };
  }

  if (surfaceHref === "/") {
    return {
      label: "Open Execution Center",
      focusLabel: "Execution Center",
      detail: "Move from Home Base into the live paper-safe execution desk with the current shared posture.",
      href: "/execution-center",
      tone: "warning"
    };
  }

  return {
    label: "Return To Home Base",
    focusLabel: "Home Base",
    detail: "Return to the canonical operating desk to resume ranked context, continuity, and module switching.",
    href: "/",
    tone: "info"
  };
}

export function buildOperatorDeskAcceptanceModel({
  surfaceHref = "/",
  homeBaseSummary = {},
  dayOpenWorkflow = {},
  dayCloseWorkflow = {},
  executionStatus = {},
  liveDataStatus = {},
  activeWatchlist = null,
  activeReviewSnapshot = null,
  activeReplayQueue = null,
  latestHandoff = null,
  activeContinuityCollection = null,
  activeContinuityReport = null,
  protectionState = "",
  riskMode = ""
} = {}) {
  const surface = getCanonicalOperatorDeskSurface(surfaceHref);
  const checks = [
    buildDailyWorkflowCheck(dayOpenWorkflow, dayCloseWorkflow),
    buildCommandSpineCheck(homeBaseSummary),
    buildPaperSafeCheck(executionStatus, liveDataStatus, protectionState, riskMode),
    buildContinuityCheck({
      activeReviewSnapshot,
      activeReplayQueue,
      latestHandoff,
      activeContinuityCollection,
      activeContinuityReport
    }),
    buildShellCoverageCheck(surfaceHref, homeBaseSummary)
  ];
  const overallScore = clampScore(
    checks.reduce((total, item) => total + item.score, 0) / Math.max(checks.length, 1)
  );
  const artifacts = buildContinuityArtifacts({
    activeReviewSnapshot,
    activeReplayQueue,
    latestHandoff,
    activeContinuityCollection,
    activeContinuityReport
  });

  return {
    surface,
    overallScore,
    overallTone: getOperatorDeskTone(overallScore),
    overallState: getOperatorDeskState(overallScore),
    bestNextMove: buildBestNextMove(surfaceHref, homeBaseSummary, protectionState),
    checks,
    acceptedCount: checks.filter((item) => item.score >= 64).length,
    moduleSwitchCount: homeBaseSummary.moduleSwitches?.length || 0,
    canonicalSurfaceCount: CANONICAL_OPERATOR_DESK_SURFACES.length,
    continuityArtifactCount: artifacts.length,
    summary: `${surface.label} is operating with ${homeBaseSummary.quickActions?.length || 0} quick desk actions, ${
      homeBaseSummary.resumeOptions?.length || 0
    } resume lanes, and ${artifacts.length} continuity anchors.`
  };
}
