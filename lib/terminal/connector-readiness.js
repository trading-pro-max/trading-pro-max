import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getProviderHealth } from "./market-provider.js";

const CONNECTOR_ENV_FILE = path.join(process.cwd(), ".env.connectors");
const INTERNAL_PIPELINE_FILE = path.join(process.cwd(), "data", "internal-market-pipeline.json");

export const CONNECTOR_IDS = [
  "demo-market-feed",
  "live-market-data-provider",
  "broker-execution-placeholder",
  "notification-transport-placeholder",
  "telegram-alerts-placeholder"
];

const CONNECTOR_STATE_SET = new Set([
  "not_configured",
  "configured",
  "validating",
  "ready",
  "blocked",
  "unsupported",
  "error"
]);

const BROKER_FIELDS = ["BROKER_PROVIDER", "BROKER_ACCOUNT_ID", "BROKER_API_KEY", "BROKER_API_SECRET"];
const NOTIFICATION_FIELDS = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
const TELEGRAM_FIELDS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stableJoin(parts = []) {
  return parts
    .flatMap((part) => {
      if (Array.isArray(part)) return [part.join("^")];
      if (part && typeof part === "object") return [JSON.stringify(part)];
      return [String(part ?? "")];
    })
    .join("::");
}

function formatValidationTime(value) {
  if (!value) return "Not validated";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function readinessLabel(code) {
  if (code === "not_configured") return "Not Configured";
  if (code === "configured") return "Configured";
  if (code === "validating") return "Validating";
  if (code === "ready") return "Ready";
  if (code === "blocked") return "Blocked";
  if (code === "unsupported") return "Unsupported";
  if (code === "error") return "Error";
  return "Unknown";
}

function readinessTone(code) {
  if (code === "ready") return "positive";
  if (code === "configured" || code === "validating") return "warning";
  if (code === "not_configured" || code === "unsupported") return "neutral";
  return "danger";
}

function checkTone(status) {
  if (status === "pass") return "positive";
  if (status === "warn" || status === "pending") return "warning";
  if (status === "info") return "neutral";
  return "danger";
}

function buildCheck(label, status, detail) {
  return {
    label,
    status,
    detail,
    tone: checkTone(status)
  };
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

function normalizeConnectorRecord(record = {}) {
  return {
    lastValidatedAt: record.lastValidatedAt || null,
    lastKnownStatus: CONNECTOR_STATE_SET.has(record.lastKnownStatus) ? record.lastKnownStatus : "not_configured",
    lastKnownSummary: record.lastKnownSummary || "",
    validationCount: Math.max(0, numeric(record.validationCount, 0))
  };
}

export function normalizeConnectorRegistry(registry = {}) {
  const records =
    registry.records && typeof registry.records === "object" && !Array.isArray(registry.records)
      ? Object.fromEntries(Object.entries(registry.records).map(([key, value]) => [key, normalizeConnectorRecord(value)]))
      : {};

  return {
    lastValidationSweepAt: registry.lastValidationSweepAt || null,
    lastRecheckAt: registry.lastRecheckAt || null,
    lastAction: registry.lastAction || null,
    records
  };
}

export function stampConnectorValidation(registry, connectorIds = CONNECTOR_IDS, timestamp = new Date().toISOString(), action = "validate") {
  const next = normalizeConnectorRegistry(registry);
  const ids = Array.isArray(connectorIds) && connectorIds.length ? connectorIds : CONNECTOR_IDS;

  ids.forEach((id) => {
    const current = normalizeConnectorRecord(next.records[id]);
    next.records[id] = {
      ...current,
      lastValidatedAt: timestamp,
      validationCount: current.validationCount + 1
    };
  });

  next.lastAction = action;
  if (action === "recheck") {
    next.lastRecheckAt = timestamp;
  } else {
    next.lastValidationSweepAt = timestamp;
  }

  return next;
}

export function syncConnectorRegistry(registry, connectors = []) {
  const next = normalizeConnectorRegistry(registry);

  connectors.forEach((connector) => {
    const current = normalizeConnectorRecord(next.records[connector.id]);
    next.records[connector.id] = {
      ...current,
      lastKnownStatus: connector.readinessStatus,
      lastKnownSummary: connector.operatorRecommendation || current.lastKnownSummary
    };
  });

  return next;
}

function envPresence(env, fields) {
  const present = fields.filter((field) => String(env[field] || "").trim());
  return {
    present,
    missing: fields.filter((field) => !present.includes(field))
  };
}

function connectorValidationTime(registry, id) {
  return registry.records[id]?.lastValidatedAt || null;
}

function connectorCard({
  id,
  name,
  category,
  configured,
  readinessStatus,
  capabilitySummary,
  missingFields = [],
  blockedReason = null,
  unsupportedReason = null,
  validationChecks = [],
  localSafeNotice,
  operatorRecommendation,
  lastValidationTime
}) {
  return {
    id,
    name,
    category,
    configured,
    readinessStatus,
    readinessLabel: readinessLabel(readinessStatus),
    readinessTone: readinessTone(readinessStatus),
    capabilitySummary,
    missingFields,
    blockedReason,
    unsupportedReason,
    validationChecks,
    localSafeNotice,
    operatorRecommendation,
    lastValidationTime,
    lastValidationLabel: formatValidationTime(lastValidationTime),
    signature: stableJoin([
      id,
      name,
      category,
      readinessStatus,
      configured ? 1 : 0,
      missingFields,
      blockedReason || "",
      unsupportedReason || "",
      lastValidationTime || "",
      operatorRecommendation || "",
      validationChecks.map((item) => stableJoin([item.label, item.status, item.detail]))
    ])
  };
}

function buildDemoMarketFeedConnector({ state, provider, registry }) {
  const active = state.providerKey === "demo";

  return connectorCard({
    id: "demo-market-feed",
    name: "Demo Market Feed",
    category: "market data",
    configured: true,
    readinessStatus: "ready",
    capabilitySummary: [
      "Deterministic quotes and candles are available for the full paper-trading desk.",
      active ? "Demo Feed is the active operator route." : "Demo Feed remains the fallback-safe route for terminal continuity.",
      "Paper execution, diagnostics, and explainability are already calibrated against this feed."
    ],
    validationChecks: [
      buildCheck("Deterministic quote lane", "pass", `${provider.label} can always supply local-safe paper quotes.`),
      buildCheck("Deterministic candle lane", "pass", "Candles can be rebuilt locally without external sessions."),
      buildCheck("Paper-only safeguard", "pass", "No external market-data login is opened from this connector.")
    ],
    localSafeNotice: "Local deterministic feed only. No external market-data session is established.",
    operatorRecommendation: active
      ? "Keep the demo feed active until an external-ready market-data route passes validation."
      : "Preserve the demo feed as the fallback-safe route for terminal recovery.",
    lastValidationTime: connectorValidationTime(registry, "demo-market-feed")
  });
}

async function buildLiveMarketDataConnector({ state, providerCatalog, registry }) {
  const bridgeRegistered = providerCatalog.some((item) => item.key === "local-bridge");
  const active = state.providerKey === "local-bridge";
  const bridgeHealth = bridgeRegistered ? await getProviderHealth("local-bridge") : null;
  const missingFields = [];
  const validationChecks = [];
  let readinessStatus = "not_configured";
  let blockedReason = null;
  let unsupportedReason = null;

  validationChecks.push(
    buildCheck(
      "Registry entry",
      bridgeRegistered ? "pass" : "fail",
      bridgeRegistered ? "Internal Bridge is registered as a future live-data route." : "No live-data bridge adapter is registered."
    )
  );

  if (!bridgeRegistered) {
    readinessStatus = "unsupported";
    unsupportedReason = "A future live market-data adapter is not registered in the provider catalog.";
  } else {
    const bridgeExists = fs.existsSync(INTERNAL_PIPELINE_FILE);
    validationChecks.push(
      buildCheck(
        "Bridge payload",
        bridgeExists ? "pass" : "warn",
        bridgeExists ? "Local bridge payload file is present." : "Local bridge payload file is missing."
      )
    );

    if (!bridgeExists) {
      readinessStatus = "not_configured";
      missingFields.push("data/internal-market-pipeline.json");
    } else if (bridgeHealth?.state === "unavailable" && String(bridgeHealth.reason || "").toLowerCase().includes("parse")) {
      readinessStatus = "error";
      blockedReason = bridgeHealth.reason || "Local bridge payload could not be parsed.";
    } else if (bridgeHealth?.state === "degraded" || bridgeHealth?.freshness === "Stale") {
      readinessStatus = "blocked";
      blockedReason = bridgeHealth?.reason || "Local bridge payload is stale and not ready for promotion.";
    } else if (bridgeHealth?.state === "ready" && active) {
      readinessStatus = "ready";
    } else if (bridgeHealth?.state === "ready") {
      readinessStatus = "configured";
    } else {
      readinessStatus = "configured";
    }

    validationChecks.push(
      buildCheck(
        "Bridge freshness",
        bridgeHealth?.state === "ready" ? "pass" : bridgeHealth?.state === "degraded" ? "warn" : "fail",
        bridgeHealth?.updatedAt
          ? `${bridgeHealth.freshness} payload health from Internal Bridge.`
          : bridgeHealth?.reason || "Bridge freshness could not be evaluated."
      )
    );
    validationChecks.push(
      buildCheck(
        "Active route selection",
        active ? "pass" : "info",
        active ? "Internal Bridge is selected as the active market-data route." : "Demo Feed remains the active market-data route."
      )
    );
  }

  return connectorCard({
    id: "live-market-data-provider",
    name: "Live Market Data Provider Placeholder",
    category: "market data",
    configured: readinessStatus !== "not_configured" && readinessStatus !== "unsupported",
    readinessStatus,
    capabilitySummary: [
      "Internal Bridge is the local-safe readiness contract for future external market-data integrations.",
      active ? "The live-data placeholder is selected and being evaluated against the bridge payload." : "The placeholder is prepared but not promoted into the active route.",
      "Validation checks only local file freshness, registry wiring, and operator route selection."
    ],
    missingFields,
    blockedReason,
    unsupportedReason,
    validationChecks,
    localSafeNotice: "Validation is limited to local bridge registration and payload freshness. No external market-data session is opened.",
    operatorRecommendation:
      readinessStatus === "ready"
        ? "Keep the bridge payload fresh and stable before promoting any future external market-data adapter."
        : readinessStatus === "configured"
          ? "Bridge readiness is staged. Promote it only after deliberate operator validation."
          : readinessStatus === "blocked"
            ? "Bridge payload must recover freshness before it can be considered live-data ready."
            : readinessStatus === "error"
              ? "Repair the bridge payload contract before any live-data integration work continues."
              : readinessStatus === "unsupported"
                ? "Register a live-data bridge adapter before attempting external data readiness work."
                : "Add the local bridge payload contract before live-data readiness can be validated.",
    lastValidationTime: connectorValidationTime(registry, "live-market-data-provider")
  });
}

function buildBrokerExecutionConnector({ env, registry }) {
  const presence = envPresence(env, BROKER_FIELDS);
  const hasAny = presence.present.length > 0;
  const isComplete = presence.missing.length === 0;
  const readinessStatus = isComplete ? "blocked" : hasAny ? "configured" : "not_configured";

  return connectorCard({
    id: "broker-execution-placeholder",
    name: "Broker Execution Placeholder",
    category: "broker execution",
    configured: hasAny,
    readinessStatus,
    capabilitySummary: [
      "Ticketing, paper fills, guardrails, and account state already model the future broker execution lifecycle.",
      "This placeholder only validates staged connector metadata and credential presence.",
      "No broker session can be activated from readiness phase 1."
    ],
    missingFields: presence.missing,
    blockedReason: isComplete ? "Real broker activation is intentionally hard-blocked in the local paper-only platform." : null,
    unsupportedReason: "Execution adapters are placeholder-only in readiness phase 1.",
    validationChecks: [
      buildCheck(
        "Credential placeholders",
        isComplete ? "pass" : hasAny ? "warn" : "warn",
        isComplete
          ? "Required broker connector placeholders are present."
          : hasAny
            ? "Partial broker connector configuration is staged."
            : "No broker connector placeholders are configured."
      ),
      buildCheck("Paper-only safeguard", "pass", "Real-money routing remains disabled regardless of connector config."),
      buildCheck("Execution adapter", "fail", "A live broker execution adapter is not installed in this build."),
      buildCheck("Secret exposure", "pass", "UI surfaces only field names and readiness outcomes, never secret values.")
    ],
    localSafeNotice: "Broker readiness is metadata-only. No login, session handshake, or order routing is performed.",
    operatorRecommendation: isComplete
      ? "Keep broker execution blocked and preserve the paper-only desk until a future activation phase explicitly unlocks it."
      : hasAny
        ? "Finish staging the remaining broker connector placeholders, but keep execution blocked."
        : "Leave broker execution unconfigured until a future live-routing program is formally started.",
    lastValidationTime: connectorValidationTime(registry, "broker-execution-placeholder")
  });
}

function buildNotificationConnector({ env, registry }) {
  const presence = envPresence(env, NOTIFICATION_FIELDS);
  const hasAny = presence.present.length > 0;
  const isComplete = presence.missing.length === 0;
  const readinessStatus = isComplete ? "ready" : hasAny ? "configured" : "not_configured";

  return connectorCard({
    id: "notification-transport-placeholder",
    name: "Notifications Placeholder",
    category: "notifications",
    configured: hasAny,
    readinessStatus,
    capabilitySummary: [
      "Runtime issues and operator recommendations are already produced locally and can be mapped into outbound alerts later.",
      "This placeholder validates transport field presence only.",
      "Notification dispatch stays disabled in readiness phase 1."
    ],
    missingFields: presence.missing,
    validationChecks: [
      buildCheck(
        "Transport fields",
        isComplete ? "pass" : hasAny ? "warn" : "warn",
        isComplete
          ? "Required notification transport placeholders are present."
          : hasAny
            ? "Notification transport config is partially staged."
            : "No notification transport placeholders are configured."
      ),
      buildCheck("Dispatch safety", "pass", "Outbound notifications remain disabled while readiness is being validated."),
      buildCheck("Secret exposure", "pass", "Readiness UI exposes field names and status only.")
    ],
    localSafeNotice: "Validation confirms placeholder configuration only. No outbound notification is sent.",
    operatorRecommendation: isComplete
      ? "Notification transport is locally ready for a future activation phase, but dispatch remains disabled."
      : hasAny
        ? "Complete the remaining notification transport placeholders before promoting alert readiness."
        : "Keep notifications local-only until a future outbound transport is intentionally staged.",
    lastValidationTime: connectorValidationTime(registry, "notification-transport-placeholder")
  });
}

function buildTelegramConnector({ env, registry }) {
  const presence = envPresence(env, TELEGRAM_FIELDS);
  const hasAny = presence.present.length > 0;
  const isComplete = presence.missing.length === 0;
  const readinessStatus = isComplete ? "ready" : hasAny ? "configured" : "not_configured";

  return connectorCard({
    id: "telegram-alerts-placeholder",
    name: "Telegram Alerts Placeholder",
    category: "telegram",
    configured: hasAny,
    readinessStatus,
    capabilitySummary: [
      "Operator alerts and runtime notices can already be shaped into Telegram-safe payloads.",
      "This placeholder validates bot and chat destination field presence without sending messages.",
      "Telegram dispatch remains disabled in readiness phase 1."
    ],
    missingFields: presence.missing,
    validationChecks: [
      buildCheck(
        "Telegram fields",
        isComplete ? "pass" : hasAny ? "warn" : "warn",
        isComplete
          ? "Bot token and chat destination placeholders are present."
          : hasAny
            ? "Telegram transport config is partially staged."
            : "Telegram transport placeholders are not configured."
      ),
      buildCheck("Dispatch safety", "pass", "Telegram delivery remains disabled while readiness is being evaluated."),
      buildCheck("Secret exposure", "pass", "No Telegram secret values are rendered into the UI.")
    ],
    localSafeNotice: "Validation is local-safe only. No Telegram message is sent from this readiness layer.",
    operatorRecommendation: isComplete
      ? "Telegram transport is staged for a future alert rollout, but messaging remains disabled."
      : hasAny
        ? "Complete Telegram transport placeholders before promoting alert readiness."
        : "Configure Telegram placeholders only when a future alert transport phase is formally approved.",
    lastValidationTime: connectorValidationTime(registry, "telegram-alerts-placeholder")
  });
}

function buildSummaryEntry(label, code, detail) {
  return {
    label,
    code,
    status: readinessLabel(code),
    tone: readinessTone(code),
    detail,
    ready: code === "ready"
  };
}

function buildAlertStatus(connectors) {
  const notificationConnectors = connectors.filter(
    (connector) => connector.id === "notification-transport-placeholder" || connector.id === "telegram-alerts-placeholder"
  );
  const readyConnector = notificationConnectors.find((connector) => connector.readinessStatus === "ready");
  const configuredConnector = notificationConnectors.find((connector) => connector.readinessStatus === "configured");
  const errorConnector = notificationConnectors.find((connector) => connector.readinessStatus === "error");

  if (readyConnector) {
    return buildSummaryEntry("Alert Ready", "ready", `${readyConnector.name} passed local-safe readiness checks.`);
  }

  if (configuredConnector) {
    return buildSummaryEntry("Alert Ready", "configured", `${configuredConnector.name} is partially staged and needs more config.`);
  }

  if (errorConnector) {
    return buildSummaryEntry("Alert Ready", "error", `${errorConnector.name} reported a readiness error.`);
  }

  return buildSummaryEntry("Alert Ready", "not_configured", "No alert transport has passed local-safe readiness validation.");
}

function buildConnectorRecommendations(connectors) {
  const recommendations = [];
  const liveData = connectors.find((connector) => connector.id === "live-market-data-provider");
  const broker = connectors.find((connector) => connector.id === "broker-execution-placeholder");
  const notifications = connectors.find((connector) => connector.id === "notification-transport-placeholder");
  const telegram = connectors.find((connector) => connector.id === "telegram-alerts-placeholder");

  if (liveData && liveData.readinessStatus !== "ready") {
    recommendations.push({
      id: "live-data",
      title: "Live-data route not ready",
      tone: liveData.readinessTone,
      detail: liveData.operatorRecommendation
    });
  }

  if (broker && broker.readinessStatus !== "ready") {
    recommendations.push({
      id: "broker",
      title: "Broker execution stays blocked",
      tone: broker.readinessTone,
      detail: broker.operatorRecommendation
    });
  }

  if (notifications && notifications.readinessStatus !== "ready") {
    recommendations.push({
      id: "notifications",
      title: "Notification transport incomplete",
      tone: notifications.readinessTone,
      detail: notifications.operatorRecommendation
    });
  }

  if (telegram && telegram.readinessStatus !== "ready") {
    recommendations.push({
      id: "telegram",
      title: "Telegram alerts incomplete",
      tone: telegram.readinessTone,
      detail: telegram.operatorRecommendation
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "maintain",
      title: "Maintain readiness discipline",
      tone: "positive",
      detail: "Connector readiness is stable. Keep the platform local-safe and avoid enabling external execution."
    });
  }

  return recommendations.slice(0, 4);
}

export async function buildConnectorRuntime({ state, provider, providerCatalog }) {
  const env = readConnectorEnv();
  const registry = normalizeConnectorRegistry(state.connectors);
  const connectors = [
    buildDemoMarketFeedConnector({ state, provider, registry }),
    await buildLiveMarketDataConnector({ state, providerCatalog, registry }),
    buildBrokerExecutionConnector({ env, registry }),
    buildNotificationConnector({ env, registry }),
    buildTelegramConnector({ env, registry })
  ];
  const counts = connectors.reduce(
    (accumulator, connector) => ({
      ...accumulator,
      [connector.readinessStatus]: (accumulator[connector.readinessStatus] || 0) + 1
    }),
    {
      not_configured: 0,
      configured: 0,
      validating: 0,
      ready: 0,
      blocked: 0,
      unsupported: 0,
      error: 0
    }
  );
  const liveDataConnector = connectors.find((connector) => connector.id === "live-market-data-provider");
  const brokerConnector = connectors.find((connector) => connector.id === "broker-execution-placeholder");
  const paperReady = buildSummaryEntry(
    "Paper Ready",
    state.accountMode === "Paper" && state.system.executionHealth === "Ready" ? "ready" : "configured",
    state.accountMode === "Paper"
      ? `Paper mode remains local-safe with ${state.system.executionHealth.toLowerCase()} execution health.`
      : "Preview mode is visible but the platform remains paper-only."
  );
  const liveDataReady = buildSummaryEntry(
    "Live-Data Ready",
    liveDataConnector?.readinessStatus || "not_configured",
    liveDataConnector?.operatorRecommendation || "Live market-data placeholder is not staged."
  );
  const brokerReady = buildSummaryEntry(
    "Broker Ready",
    brokerConnector?.readinessStatus || "not_configured",
    brokerConnector?.operatorRecommendation || "Broker readiness is not staged."
  );
  const alertReady = buildAlertStatus(connectors);
  const overall =
    liveDataReady.code === "ready" && alertReady.code === "ready"
      ? buildSummaryEntry("Connector Readiness", "ready", "Live-data and alert transports are locally ready while broker execution stays blocked.")
      : buildSummaryEntry(
          "Connector Readiness",
          liveDataReady.code === "error" || alertReady.code === "error" ? "error" : "configured",
          "Connector readiness remains local-safe and preparatory. No external execution is enabled."
        );
  const operatorRecommendations = buildConnectorRecommendations(connectors);
  const signature = stableJoin([
    connectors.map((connector) => connector.signature),
    paperReady.code,
    liveDataReady.code,
    brokerReady.code,
    alertReady.code,
    overall.code,
    registry.lastValidationSweepAt || "",
    registry.lastRecheckAt || ""
  ]);

  return {
    connectors,
    summary: {
      paperReady,
      liveDataReady,
      brokerReady,
      alertReady,
      overall,
      counts,
      lastValidationSweepAt: registry.lastValidationSweepAt,
      lastRecheckAt: registry.lastRecheckAt,
      signature
    },
    operatorRecommendations,
    registry
  };
}
