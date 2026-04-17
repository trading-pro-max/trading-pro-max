import fs from "node:fs";
import path from "node:path";
import { getInstrumentMeta } from "./market-catalog.js";
import { createDeskId } from "./persistence.js";

const CONNECTOR_ENV_FILE = path.join(process.cwd(), ".env.connectors");

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function last(values = [], count = 1) {
  return values.slice(Math.max(0, values.length - count));
}

function describeLiquidity(liquidity = "") {
  const normalized = liquidity.toLowerCase();
  if (normalized.includes("deep")) return 12;
  if (normalized.includes("improving")) return 9;
  if (normalized.includes("fragmented")) return 7;
  return 8;
}

function formatDelta(label, previousValue, nextValue, suffix = "") {
  return `${label} changed from ${previousValue}${suffix} to ${nextValue}${suffix}.`;
}

function structureStateFromCandles(candles = [], lastPrice = 0, vwap = 0) {
  if (!candles.length) return "Unavailable";

  const recentHighs = last(candles.map((item) => item.high), 6);
  const recentLows = last(candles.map((item) => item.low), 6);
  const highsSlope = recentHighs[recentHighs.length - 1] - recentHighs[0];
  const lowsSlope = recentLows[recentLows.length - 1] - recentLows[0];

  if (highsSlope > 0 && lowsSlope > 0 && lastPrice >= vwap) return "Higher High / Higher Low";
  if (highsSlope < 0 && lowsSlope < 0 && lastPrice <= vwap) return "Lower High / Lower Low";
  if (Math.abs(highsSlope) < Math.max(1e-9, lastPrice * 0.002) && Math.abs(lowsSlope) < Math.max(1e-9, lastPrice * 0.002)) {
    return "Compression Balance";
  }
  if (lastPrice > vwap) return "Auction Above Value";
  if (lastPrice < vwap) return "Auction Below Value";
  return "Two-Way Rotation";
}

function buildConfidenceBreakdown({
  momentumPct,
  volatilityPct,
  structureState,
  chart,
  provider,
  selectedMarket,
  riskPenalty
}) {
  const trendScore = clamp(12 + Math.abs(momentumPct) * 22, 6, 22);
  const structureScore =
    structureState === "Higher High / Higher Low" || structureState === "Lower High / Lower Low"
      ? 18
      : structureState === "Compression Balance"
        ? 12
        : 14;
  const volatilityScore = clamp(volatilityPct <= 0.35 ? 11 : volatilityPct <= 1.15 ? 16 : 8, 6, 16);
  const freshnessScore = chart.freshness === "Fresh" ? 16 : chart.freshness === "Warm" ? 11 : 5;
  const providerScore = provider.fallbackActive ? 6 : 14;
  const liquidityScore = describeLiquidity(selectedMarket.liquidity);
  const riskAdjustment = clamp(-riskPenalty, -18, -2);

  return [
    {
      label: "Trend",
      value: round(trendScore, 1),
      tone: trendScore >= 16 ? "positive" : "warning",
      detail: `Momentum slope is ${momentumPct >= 0 ? "supportive" : "adverse"} at ${round(momentumPct, 2)}%.`
    },
    {
      label: "Structure",
      value: round(structureScore, 1),
      tone: structureScore >= 16 ? "positive" : "neutral",
      detail: `${structureState} is the active market structure state.`
    },
    {
      label: "Volatility",
      value: round(volatilityScore, 1),
      tone: volatilityPct > 1.4 ? "warning" : "positive",
      detail: `ATR regime is ${round(volatilityPct, 2)}% of last price.`
    },
    {
      label: "Freshness",
      value: freshnessScore,
      tone: chart.freshness === "Fresh" ? "positive" : "warning",
      detail: `${chart.freshness} chart state influences operator trust.`
    },
    {
      label: "Provider",
      value: providerScore,
      tone: provider.fallbackActive ? "warning" : "positive",
      detail: provider.fallbackActive ? "Demo fallback is active." : "Primary provider path is stable."
    },
    {
      label: "Liquidity",
      value: liquidityScore,
      tone: liquidityScore >= 10 ? "positive" : "neutral",
      detail: `${selectedMarket.liquidity} supports controlled paper routing.`
    },
    {
      label: "Risk Deductions",
      value: riskAdjustment,
      tone: "warning",
      detail: `${riskPenalty} points deducted for live operator constraints.`
    }
  ];
}

function buildWhatChanged(previousEntry, nextEntry) {
  if (!previousEntry) {
    return [
      "First explainability snapshot was captured for this market/timeframe lane.",
      `Bias initialized at ${nextEntry.bias}.`,
      `Structure initialized at ${nextEntry.structureState}.`
    ];
  }

  const changes = [];

  if (previousEntry.bias !== nextEntry.bias) {
    changes.push(`Directional bias shifted from ${previousEntry.bias} to ${nextEntry.bias}.`);
  }
  if (previousEntry.structureState !== nextEntry.structureState) {
    changes.push(`Structure changed from ${previousEntry.structureState} to ${nextEntry.structureState}.`);
  }
  if (previousEntry.regime !== nextEntry.regime) {
    changes.push(`Volatility regime changed from ${previousEntry.regime} to ${nextEntry.regime}.`);
  }
  if (previousEntry.momentumState !== nextEntry.momentumState) {
    changes.push(`Momentum posture moved from ${previousEntry.momentumState} to ${nextEntry.momentumState}.`);
  }
  if (Math.abs(numeric(previousEntry.confidence, 0) - numeric(nextEntry.confidence, 0)) >= 5) {
    changes.push(formatDelta("Confidence", previousEntry.confidence, nextEntry.confidence, "%"));
  }
  if (Math.abs(numeric(previousEntry.opportunityScore, 0) - numeric(nextEntry.opportunityScore, 0)) >= 6) {
    changes.push(formatDelta("Opportunity score", previousEntry.opportunityScore, nextEntry.opportunityScore));
  }
  if (Math.abs(numeric(previousEntry.riskScore, 0) - numeric(nextEntry.riskScore, 0)) >= 6) {
    changes.push(formatDelta("Risk score", previousEntry.riskScore, nextEntry.riskScore));
  }

  return changes.length ? changes : ["No structural regime break was detected since the previous decision snapshot."];
}

export function buildDecisionSnapshot({ selectedMarket, chart, state, provider }) {
  const meta = getInstrumentMeta(selectedMarket.symbol);
  const candles = chart.candles || [];
  const closes = candles.map((item) => item.close);
  const highs = candles.map((item) => item.high);
  const lows = candles.map((item) => item.low);
  const volumes = candles.map((item) => item.volume || 0);
  const fast = average(last(closes, 6));
  const medium = average(last(closes, 12));
  const slow = average(last(closes, 24));
  const vwap =
    volumes.reduce((sum, value, index) => sum + value * (closes[index] || 0), 0) /
    Math.max(volumes.reduce((sum, value) => sum + value, 0), 1);
  const lastPrice = numeric(closes[closes.length - 1], chart.rawLast);
  const previousPrice = numeric(closes[Math.max(0, closes.length - 2)], lastPrice);
  const momentumPct = slow ? ((fast - slow) / slow) * 100 : 0;
  const velocityPct = medium ? ((lastPrice - medium) / medium) * 100 : 0;
  const rangePct = lastPrice ? ((Math.max(...highs, lastPrice) - Math.min(...lows, lastPrice)) / lastPrice) * 100 : 0;
  const volatilityPct = lastPrice ? (numeric(chart.atr, 0) / lastPrice) * 100 : 0;
  const openPosition = (state.positions || []).find((position) => position.symbol === selectedMarket.symbol);
  const pendingOrders = (state.orders || []).filter((order) => order.symbol === selectedMarket.symbol && order.status === "Pending");
  const symbolExposure = numeric(state.account.exposureBySymbol?.[selectedMarket.symbol], 0);
  const totalExposure = Object.values(state.account.exposureBySymbol || {}).reduce((sum, value) => sum + numeric(value, 0), 0);
  const drawdownPct =
    (Math.max(0, numeric(state.account.startingBalance, 100000) - numeric(state.account.equity, 100000)) /
      Math.max(1, numeric(state.account.startingBalance, 100000))) *
    100;

  const bias =
    momentumPct > 0.22 && velocityPct > -0.05
      ? "Bullish"
      : momentumPct < -0.22 && velocityPct < 0.05
        ? "Bearish"
        : "Balanced";
  const momentumState =
    momentumPct > 0.65
      ? "Impulse Up"
      : momentumPct > 0.2
        ? "Firm Uptrend"
        : momentumPct < -0.65
          ? "Impulse Down"
          : momentumPct < -0.2
            ? "Firm Downtrend"
            : "Balanced";
  const volatilityState =
    volatilityPct > 1.65
      ? "Elevated"
      : volatilityPct > 0.85
        ? "Expanding"
        : volatilityPct < 0.32
          ? "Compressed"
          : "Contained";
  const structureState = structureStateFromCandles(candles, lastPrice, vwap);
  const regime =
    Math.abs(momentumPct) > 0.55
      ? volatilityPct > 1.05
        ? "Trend Expansion"
        : "Trend Continuation"
      : volatilityPct < 0.35
        ? "Compression"
        : "Two-Way Auction";

  const riskFlags = [];
  if (provider.fallbackActive) riskFlags.push("Primary provider is unavailable and demo fallback is active.");
  if (chart.freshness === "Stale") riskFlags.push("Selected chart lane is stale.");
  if (chart.freshness === "Warm") riskFlags.push("Chart freshness is warm and should be confirmed before escalation.");
  if (openPosition && numeric(openPosition.stopLoss, 0) <= 0) riskFlags.push("Open position on this symbol is missing a stop loss.");
  if (pendingOrders.length > 1) riskFlags.push("Multiple working orders are staged on the same symbol.");
  if (symbolExposure > numeric(state.risk.maxSymbolExposure, 0) * 0.82) riskFlags.push("Symbol exposure is near the configured limit.");
  if (totalExposure > numeric(state.risk.maxSessionExposure, 0) * 0.88) riskFlags.push("Total session exposure is near the desk ceiling.");
  if (numeric(state.account.sessionPnl, 0) <= -numeric(state.risk.maxSessionLoss, 0) * 0.72) {
    riskFlags.push("Session loss is deteriorating toward the configured threshold.");
  }
  if (drawdownPct > 4.5) riskFlags.push("Drawdown pressure is elevated for the current paper session.");

  const confidenceBreakdown = buildConfidenceBreakdown({
    momentumPct,
    volatilityPct,
    structureState,
    chart,
    provider,
    selectedMarket,
    riskPenalty: riskFlags.length * 3 + (bias === "Balanced" ? 2 : 0)
  });
  const confidence = clamp(
    round(confidenceBreakdown.reduce((sum, item) => sum + numeric(item.value, 0), 0), 0),
    38,
    97
  );
  const opportunityScore = clamp(
    round(confidence + (bias === "Balanced" ? -6 : 6) + (regime.includes("Trend") ? 4 : 0) - riskFlags.length * 2, 0),
    24,
    98
  );
  const riskScore = clamp(
    round(42 + volatilityPct * 18 + riskFlags.length * 6 + (provider.fallbackActive ? 10 : 0) + (drawdownPct > 3 ? 7 : 0), 0),
    16,
    96
  );

  const draftEntry = {
    symbol: selectedMarket.symbol,
    timeframe: chart.key,
    bias,
    confidence,
    confidenceBreakdown,
    momentumState,
    volatilityState,
    structureState,
    regime,
    opportunityScore,
    riskScore,
    whyTrade: [
      `${selectedMarket.symbol} is printing ${structureState.toLowerCase()} with ${momentumState.toLowerCase()} on the ${chart.label.toLowerCase()} lane.`,
      `${selectedMarket.liquidity} and ${chart.freshness.toLowerCase()} feed state support deterministic paper execution review.`,
      `${selectedMarket.catalyst} keeps the setup explainable against the broader desk context.`
    ],
    whyNot: [
      provider.fallbackActive ? "Primary provider quality is degraded and conviction should be discounted." : "Paper routing still requires discipline inside the local guardrails.",
      volatilityState === "Elevated" ? "Volatility is elevated and mark-to-market swings can outrun size discipline." : "Momentum is not yet one-way enough to justify aggressive size.",
      pendingOrders.length ? "Working inventory already exists on this symbol and can distort the next decision." : "Risk quality still depends on stop placement and session context."
    ],
    invalidationFactors: [
      bias === "Bullish" ? `Loss of ${structureState.toLowerCase()} support below VWAP ${round(vwap, meta.digits)}.` : `Failure to continue below value near VWAP ${round(vwap, meta.digits)}.`,
      `Chart freshness falling beyond the ${chart.key} tolerance window.`,
      `Session risk score expanding beyond ${Math.min(96, riskScore + 8)}.`
    ],
    riskFlags
  };

  const previousEntry = (state.decisionJournal || []).find(
    (entry) => entry.symbol === selectedMarket.symbol && entry.timeframe === chart.key
  );
  const whatChanged = buildWhatChanged(previousEntry, draftEntry);

  return {
    ...draftEntry,
    whatChanged,
    warnings: riskFlags,
    headline:
      `${selectedMarket.symbol} holds ${bias.toLowerCase()} bias with ${confidence}% confidence, ${opportunityScore} opportunity score, and ${riskScore} risk score on the ${chart.label.toLowerCase()} lane.`,
    summary:
      previousEntry && confidence < numeric(previousEntry.confidence, confidence)
        ? "Confidence has softened versus the previous snapshot and operator discipline should tighten."
        : "Explainability remains aligned with the current market structure and paper desk context."
  };
}

export function recordDecisionSnapshot(state, snapshot) {
  const latest = state.decisionJournal?.[0];
  const unchanged =
    latest &&
    latest.symbol === snapshot.symbol &&
    latest.timeframe === snapshot.timeframe &&
    latest.bias === snapshot.bias &&
    latest.structureState === snapshot.structureState &&
    latest.regime === snapshot.regime &&
    latest.momentumState === snapshot.momentumState &&
    Math.abs(numeric(latest.confidence, 0) - snapshot.confidence) < 4 &&
    Math.abs(numeric(latest.opportunityScore, 0) - snapshot.opportunityScore) < 5 &&
    Math.abs(numeric(latest.riskScore, 0) - snapshot.riskScore) < 5;

  if (unchanged) return false;

  state.decisionJournal.unshift({
    id: createDeskId("JRN"),
    time: new Date().toISOString(),
    symbol: snapshot.symbol,
    timeframe: snapshot.timeframe,
    bias: snapshot.bias,
    confidence: snapshot.confidence,
    confidenceBreakdown: snapshot.confidenceBreakdown,
    momentumState: snapshot.momentumState,
    volatilityState: snapshot.volatilityState,
    structureState: snapshot.structureState,
    regime: snapshot.regime,
    opportunityScore: snapshot.opportunityScore,
    riskScore: snapshot.riskScore,
    whyTrade: snapshot.whyTrade,
    whyNot: snapshot.whyNot,
    whatChanged: snapshot.whatChanged,
    invalidationFactors: snapshot.invalidationFactors,
    riskFlags: snapshot.riskFlags
  });

  state.auditTrail.unshift({
    id: createDeskId("AUD"),
    time: new Date().toISOString(),
    level: "INFO",
    message: `Decision snapshot updated for ${snapshot.symbol} ${snapshot.timeframe}.`
  });

  return true;
}

export function buildOperatorAssistant({ state, provider, chart, decisionSnapshot, recoveryAvailable }) {
  const previousDecision = (state.decisionJournal || []).find((item, index) => {
    if (item.symbol !== decisionSnapshot.symbol || item.timeframe !== decisionSnapshot.timeframe) return false;
    if (
      index === 0 &&
      item.bias === decisionSnapshot.bias &&
      item.structureState === decisionSnapshot.structureState &&
      item.regime === decisionSnapshot.regime &&
      Math.abs(numeric(item.confidence, 0) - decisionSnapshot.confidence) < 1
    ) {
      return false;
    }
    return true;
  });
  const recommendations = [];

  if (provider.fallbackActive || chart.freshness === "Stale") {
    recommendations.push({
      code: "feed-stale",
      title: "Feed stale",
      detail: "Market-data trust is degraded. New paper risk should wait for a fresh quote/candle handshake.",
      action: "Pause new routing and refresh the provider lane.",
      severity: "danger"
    });
  }

  if (decisionSnapshot.volatilityState === "Elevated") {
    recommendations.push({
      code: "volatility-elevated",
      title: "Volatility elevated",
      detail: "The active ATR regime is elevated and can distort stop placement quality.",
      action: "Reduce size or wait for volatility normalization.",
      severity: "warning"
    });
  }

  if (numeric(state.account.sessionPnl, 0) <= -numeric(state.risk.maxSessionLoss, 0) * 0.6) {
    recommendations.push({
      code: "reduce-exposure",
      title: "Reduce exposure",
      detail: "Session loss is deteriorating toward the configured threshold.",
      action: "Shrink open risk and avoid adding fresh size until the session stabilizes.",
      severity: "danger"
    });
  }

  if (decisionSnapshot.bias === "Bearish" && decisionSnapshot.riskScore >= 68) {
    recommendations.push({
      code: "avoid-new-longs",
      title: "Avoid new longs",
      detail: "Bias and risk posture do not support new long exposure on the selected lane.",
      action: "Keep the desk defensive until structure improves.",
      severity: "warning"
    });
  }

  if (previousDecision && previousDecision.symbol === decisionSnapshot.symbol && previousDecision.timeframe === decisionSnapshot.timeframe) {
    if (numeric(previousDecision.confidence, 0) - decisionSnapshot.confidence >= 8) {
      recommendations.push({
        code: "confidence-deteriorating",
        title: "Confidence deteriorating",
        detail: "Explainability confidence dropped materially versus the previous snapshot.",
        action: "Re-qualify the setup before staging new paper orders.",
        severity: "warning"
      });
    }
  }

  if (recoveryAvailable && state.controls?.lastClearedExecutionAt && !(state.positions || []).length && !(state.orders || []).some((order) => order.status === "Pending")) {
    recommendations.push({
      code: "restore-session",
      title: "Restore session",
      detail: "A local recovery checkpoint is available after the last destructive session action.",
      action: "Use session recovery if the desk should return to the previous state.",
      severity: "info"
    });
  }

  if (decisionSnapshot.riskScore >= 70 && numeric(state.risk.maxPaperPositionNotional, 0) > 0) {
    recommendations.push({
      code: "market-unsuitable",
      title: "Market unsuitable for policy",
      detail: "Current volatility and risk posture are misaligned with the active paper risk policy.",
      action: "Trade smaller, switch symbols, or wait for a cleaner regime.",
      severity: "warning"
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      code: "maintain-discipline",
      title: "Maintain discipline",
      detail: "Desk state is nominal. The main operator task is preserving sizing and stop quality.",
      action: "Route only if the setup still matches the explainability snapshot.",
      severity: "info"
    });
  }

  const signature = recommendations.map((item) => `${item.code}:${item.severity}`).join("|");
  const previousSignature = state.recommendationHistory?.[0]?.signature || "";
  const previousCodes = new Set(
    (state.recommendationHistory || [])
      .slice(0, 8)
      .filter((item) => item.signature === previousSignature)
      .map((item) => item.code)
  );
  const currentCodes = new Set(recommendations.map((item) => item.code));
  const whatChanged = [];

  recommendations.forEach((item) => {
    if (!previousCodes.has(item.code)) {
      whatChanged.push(`${item.title} entered the operator recommendation set.`);
    }
  });

  previousCodes.forEach((code) => {
    if (!currentCodes.has(code)) {
      whatChanged.push(`${code.replace(/-/g, " ")} dropped out of the active recommendation set.`);
    }
  });

  if (!whatChanged.length) {
    whatChanged.push("Operator recommendation priorities are unchanged versus the previous state.");
  }

  return {
    headline:
      recommendations[0].severity === "danger"
        ? "Operator intervention is advised before additional paper risk is added."
        : "Operator assistance remains advisory and driven by the current live desk state.",
    recommendations: recommendations.map((item) => ({
      ...item,
      changed: !previousCodes.has(item.code),
      signature
    })),
    whatChanged,
    history: (state.recommendationHistory || []).slice(0, 5)
  };
}

export function recordOperatorRecommendations(state, assistant, symbol, timeframe) {
  const latestSignature = state.recommendationHistory?.[0]?.signature || "";
  if (
    latestSignature === assistant.recommendations[0]?.signature &&
    state.recommendationHistory?.[0]?.symbol === symbol &&
    state.recommendationHistory?.[0]?.timeframe === timeframe
  ) {
    return false;
  }

  assistant.recommendations.forEach((recommendation) => {
    state.recommendationHistory.unshift({
      id: createDeskId("REC"),
      time: new Date().toISOString(),
      symbol,
      timeframe,
      code: recommendation.code,
      title: recommendation.title,
      detail: recommendation.detail,
      action: recommendation.action,
      severity: recommendation.severity,
      signature: recommendation.signature,
      changed: recommendation.changed
    });
  });

  state.auditTrail.unshift({
    id: createDeskId("AUD"),
    time: new Date().toISOString(),
    level: "INFO",
    message: `Operator recommendations refreshed for ${symbol} ${timeframe}.`
  });

  return true;
}

function readConnectorEnv() {
  const values = {};

  if (!fs.existsSync(CONNECTOR_ENV_FILE)) return values;

  const content = fs.readFileSync(CONNECTOR_ENV_FILE, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    values[key] = value;
  });

  return values;
}

function readinessCard({
  id,
  label,
  configured,
  capabilitySummary,
  missingFields = [],
  blockedReason = null,
  unsupportedReason = null,
  validationState = "Ready"
}) {
  return {
    id,
    label,
    configured,
    capabilitySummary,
    missingFields,
    blockedReason,
    unsupportedReason,
    validationState
  };
}

export function buildConnectorReadiness({ state, provider, providerCatalog }) {
  const connectorEnv = readConnectorEnv();
  const selectedProviderConfig = providerCatalog.find((item) => item.key === state.providerKey) || providerCatalog[0];
  const alertConfigured = Boolean(connectorEnv.SMTP_HOST && connectorEnv.SMTP_USER && connectorEnv.SMTP_PASS);
  const telegramConfigured = Boolean(connectorEnv.TELEGRAM_BOT_TOKEN && connectorEnv.TELEGRAM_CHAT_ID);

  return [
    readinessCard({
      id: "market-data",
      label: "Market Data Provider Readiness",
      configured: true,
      capabilitySummary: [
        `${selectedProviderConfig.label} selected as the operator data route.`,
        selectedProviderConfig.description,
        provider.fallbackActive ? "Fallback routing is currently engaged for desk stability." : "Primary data path is healthy for local paper operations."
      ],
      missingFields: state.providerKey === "local-bridge" ? ["data/internal-market-pipeline.json freshness policy"] : [],
      blockedReason: provider.fallbackActive ? provider.blockedReason || "Requested provider is not ready." : null,
      unsupportedReason: null,
      validationState: provider.fallbackActive ? "Attention" : "Ready"
    }),
    readinessCard({
      id: "broker",
      label: "Broker Execution Readiness",
      configured: false,
      capabilitySummary: [
        "Ticketing, fills, guardrails, and account diagnostics are modeled locally.",
        "Execution adapters remain intentionally disabled in this paper-only surface."
      ],
      missingFields: ["broker connector", "credentials", "account mapping", "execution adapter"],
      blockedReason: "Real broker execution is intentionally blocked in this local-safe build.",
      unsupportedReason: "Live routing is not enabled.",
      validationState: "Blocked"
    }),
    readinessCard({
      id: "alerts",
      label: "Alert / Notification Readiness",
      configured: alertConfigured,
      capabilitySummary: [
        "Operator recommendations and runtime issues are generated locally.",
        alertConfigured ? "SMTP configuration is present for future outbound notifications." : "No outbound alert transport is configured yet."
      ],
      missingFields: alertConfigured ? [] : ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
      blockedReason: alertConfigured ? null : "Outbound notifications are not configured.",
      unsupportedReason: null,
      validationState: alertConfigured ? "Ready" : "Attention"
    }),
    readinessCard({
      id: "telegram",
      label: "Telegram Readiness",
      configured: telegramConfigured,
      capabilitySummary: [
        "Recommendation and runtime payloads are ready for a future chat transport.",
        telegramConfigured ? "Bot token and chat destination are present." : "Telegram transport keys are missing."
      ],
      missingFields: telegramConfigured ? [] : ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
      blockedReason: telegramConfigured ? null : "Telegram connector is not configured.",
      unsupportedReason: null,
      validationState: telegramConfigured ? "Ready" : "Attention"
    })
  ];
}
