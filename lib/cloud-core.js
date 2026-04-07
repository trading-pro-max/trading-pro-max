import { randomUUID } from "crypto";
import { readDb, mutateDb } from "./core-db.js";
import { getState, addLog } from "./state.js";
import { getEngineStatus } from "./engine.js";
import { readAudit, readBackups } from "./ops-store.js";

function makeId(prefix = "CLD") {
  return prefix + "-" + randomUUID().slice(0, 8).toUpperCase();
}

function num(x) {
  return Number(x || 0);
}

function getDb() {
  const db = readDb();

  if (!Array.isArray(db.cloudDeployments)) {
    db.cloudDeployments = [];
  }

  return db;
}

function envScore(base, bonus) {
  return Math.max(0, Math.min(100, Number((base + bonus).toFixed(2))));
}

export function buildCloudStatus() {
  const state = getState();
  const engine = getEngineStatus();
  const db = getDb();
  const backups = readBackups();
  const audit = readAudit();

  const sessionActive = Boolean(db.session?.active);
  const onboardingClosed = Boolean(db.settings?.onboardingComplete);
  const brokers = Array.isArray(db.brokers) ? db.brokers.length : 0;
  const connectedBrokers = Array.isArray(db.brokers) ? db.brokers.filter(x => x.connected).length : 0;
  const watchlist = Array.isArray(db.watchlist) ? db.watchlist.length : 0;
  const alerts = Array.isArray(db.alerts) ? db.alerts.length : 0;
  const journal = Array.isArray(db.journal) ? db.journal.length : 0;
  const orders = Array.isArray(db.orders) ? db.orders.length : 0;
  const ledger = Array.isArray(db.ledger) ? db.ledger.length : 0;
  const users = Array.isArray(db.users) ? db.users.length : 0;
  const hasBackup = backups.length > 0;
  const recentAudit = audit.length > 0;

  const readinessBase = (
    num(state.metrics?.engineReadiness) +
    num(state.metrics?.platformReadiness) +
    num(state.metrics?.launchReadiness) +
    num(state.metrics?.privateOperatorStack)
  ) / 4;

  const local = envScore(readinessBase, 6);
  const staging = envScore(readinessBase, (sessionActive ? 4 : -8) + (hasBackup ? 5 : -5) + (engine.running ? 4 : -6));
  const production = envScore(readinessBase, (state.protection?.guardianStatus === "ARMED" ? 6 : -10) + (onboardingClosed ? 5 : -8) + (ledger > 0 ? 5 : -6) + (connectedBrokers > 0 ? 4 : -4));
  const desktop = envScore(readinessBase, 3 + (users > 0 ? 3 : 0));
  const mobile = envScore(readinessBase, 2 + (watchlist >= 5 ? 4 : 0));
  const cloud = envScore(readinessBase, (hasBackup ? 6 : -4) + (recentAudit ? 4 : -3) + (brokers > 0 ? 3 : 0));

  const environments = [
    {
      key: "LOCAL",
      title: "Local Core",
      score: local,
      status: "ONLINE",
      detail: "developer machine / private operator mode"
    },
    {
      key: "STAGING",
      title: "Staging Plane",
      score: staging,
      status: staging >= 70 ? "READY" : "BUILDING",
      detail: "pre-production verification and release rehearsal"
    },
    {
      key: "PRODUCTION",
      title: "Production Plane",
      score: production,
      status: production >= 78 ? "NEAR_READY" : "LOCKED",
      detail: "guarded release lane with risk and ops controls"
    },
    {
      key: "DESKTOP",
      title: "Desktop Layer",
      score: desktop,
      status: desktop >= 70 ? "READY" : "BUILDING",
      detail: "private desktop operating shell"
    },
    {
      key: "MOBILE",
      title: "Mobile Layer",
      score: mobile,
      status: mobile >= 68 ? "READY" : "BUILDING",
      detail: "mobile command and monitoring surface"
    },
    {
      key: "CLOUD",
      title: "Cloud Control",
      score: cloud,
      status: cloud >= 75 ? "NEAR_READY" : "BUILDING",
      detail: "deployment, recovery, and environment command plane"
    }
  ];

  const deploymentReadiness = Number((
    environments.reduce((s, x) => s + num(x.score), 0) / environments.length
  ).toFixed(2));

  const health = {
    engine: engine.running ? "RUNNING" : "STOPPED",
    guardian: state.protection?.guardianStatus || "UNKNOWN",
    session: sessionActive ? "ACTIVE" : "INACTIVE",
    backups: backups.length,
    auditEvents: audit.length,
    watchlist,
    alerts,
    journal,
    orders,
    ledger,
    users,
    brokers,
    connectedBrokers
  };

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Cloud Expansion",
      progress: 62
    },
    deploymentReadiness,
    environments,
    health,
    deployments: Array.isArray(db.cloudDeployments) ? db.cloudDeployments : [],
    updatedAt: new Date().toISOString()
  };
}

export function addDeployment(payload = {}) {
  const status = buildCloudStatus();

  const db = mutateDb((draft) => {
    if (!Array.isArray(draft.cloudDeployments)) {
      draft.cloudDeployments = [];
    }

    draft.cloudDeployments.unshift({
      id: makeId("DEP"),
      target: payload.target || "STAGING",
      channel: payload.channel || "MANUAL",
      version: payload.version || ("tpm-" + new Date().toISOString().slice(0, 10)),
      readiness: status.deploymentReadiness,
      result: payload.result || "SNAPSHOT_CREATED",
      note: payload.note || "deployment snapshot created",
      createdAt: new Date().toISOString()
    });

    draft.cloudDeployments = draft.cloudDeployments.slice(0, 80);
    return draft;
  });

  addLog("CLOUD -> DEPLOYMENT SNAPSHOT " + (payload.target || "STAGING"));
  return Array.isArray(db.cloudDeployments) ? db.cloudDeployments : [];
}

export function buildRolloutPlan() {
  const status = buildCloudStatus();
  const env = status.environments.reduce((acc, x) => {
    acc[x.key] = x;
    return acc;
  }, {});

  return [
    {
      stage: 1,
      title: "Stabilize staging plane",
      owner: "ops",
      priority: env.STAGING?.score >= 75 ? "medium" : "critical",
      detail: "lock staging verification, release rehearsal, and environment checks",
      gate: env.STAGING?.score || 0
    },
    {
      stage: 2,
      title: "Raise production readiness",
      owner: "guardian",
      priority: env.PRODUCTION?.score >= 80 ? "medium" : "critical",
      detail: "keep live trading gated until production plane crosses guarded threshold",
      gate: env.PRODUCTION?.score || 0
    },
    {
      stage: 3,
      title: "Close desktop and mobile layers",
      owner: "platform",
      priority: ((env.DESKTOP?.score || 0) >= 75 && (env.MOBILE?.score || 0) >= 75) ? "medium" : "high",
      detail: "align private desktop and mobile surfaces with production shell",
      gate: Number((((env.DESKTOP?.score || 0) + (env.MOBILE?.score || 0)) / 2).toFixed(2))
    },
    {
      stage: 4,
      title: "Promote cloud control plane",
      owner: "cloud",
      priority: env.CLOUD?.score >= 78 ? "medium" : "high",
      detail: "complete backup, recovery, deployment, and monitoring posture",
      gate: env.CLOUD?.score || 0
    }
  ];
}
