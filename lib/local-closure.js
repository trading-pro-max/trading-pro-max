import { buildLocalOSStatus } from "./local-os.js";
import { buildLocalQAStatus, autoFixLocalQA } from "./local-qa.js";
import { buildLocalFactoryStatus, seedLocalFactory } from "./local-factory.js";
import { buildLocalScenarioStatus, runLocalScenario } from "./local-scenarios.js";
import { buildLocalRecoveryStatus, createLocalSnapshot } from "./local-recovery.js";
import { buildLaunchpadStatus, runLaunchpadBoot } from "./local-launchpad.js";
import { buildReleaseBoard, authorizeRelease } from "./release-orchestrator.js";

function n(x) {
  return Number(x || 0);
}

function avg(values) {
  const clean = values.map((x) => Number(x || 0));
  return Number((clean.reduce((a, b) => a + b, 0) / clean.length).toFixed(2));
}

export function buildLocalClosureStatus() {
  const os = buildLocalOSStatus();
  const qa = buildLocalQAStatus();
  const factory = buildLocalFactoryStatus();
  const scenarios = buildLocalScenarioStatus();
  const recovery = buildLocalRecoveryStatus();
  const launchpad = buildLaunchpadStatus();
  const release = buildReleaseBoard();

  const checklist = [
    {
      key: "os-shell",
      title: "Local OS shell",
      ok: n(os.uiScore) >= 80,
      score: n(os.uiScore),
      detail: "ui " + n(os.uiScore) + "%"
    },
    {
      key: "qa-closure",
      title: "QA closure",
      ok: n(qa.summary?.readiness) >= 85,
      score: n(qa.summary?.readiness),
      detail: "qa " + n(qa.summary?.readiness) + "% · passed " + n(qa.summary?.passed) + "/" + n(qa.summary?.total)
    },
    {
      key: "factory-seed",
      title: "Factory seed",
      ok: n(factory.workspace?.orders) >= 1 && n(factory.growth?.customers) >= 1,
      score: n(factory.readiness),
      detail: "orders " + n(factory.workspace?.orders) + " · customers " + n(factory.growth?.customers)
    },
    {
      key: "scenario-runner",
      title: "Scenario runner",
      ok: n(scenarios.scenarios?.length) >= 6,
      score: n(scenarios.readiness),
      detail: "catalog " + n(scenarios.scenarios?.length) + " scenarios"
    },
    {
      key: "launchpad",
      title: "Launchpad",
      ok: n(launchpad.finalReadiness) >= 80,
      score: n(launchpad.finalReadiness),
      detail: "launchpad " + n(launchpad.finalReadiness) + "%"
    },
    {
      key: "release",
      title: "Release lane",
      ok: n(release.summary?.releaseReadiness) >= 78,
      score: n(release.summary?.releaseReadiness),
      detail: "release " + n(release.summary?.releaseReadiness) + "% · critical open " + n(release.summary?.criticalOpen)
    },
    {
      key: "recovery",
      title: "Recovery snapshots",
      ok: Array.isArray(recovery.snapshots) && recovery.snapshots.length >= 1,
      score: Array.isArray(recovery.snapshots) && recovery.snapshots.length >= 1 ? 92 : 24,
      detail: "snapshots " + (Array.isArray(recovery.snapshots) ? recovery.snapshots.length : 0)
    }
  ];

  const closed = checklist.filter((x) => x.ok).length;
  const total = checklist.length;
  const closureReadiness = avg(checklist.map((x) => x.score));

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Closure",
      progress: 96
    },
    summary: {
      closed,
      total,
      closureReadiness
    },
    scores: {
      os: n(os.uiScore),
      qa: n(qa.summary?.readiness),
      factory: n(factory.readiness),
      scenarios: n(scenarios.readiness),
      launchpad: n(launchpad.finalReadiness),
      release: n(release.summary?.releaseReadiness),
      recovery: Array.isArray(recovery.snapshots) && recovery.snapshots.length >= 1 ? 92 : 24
    },
    checklist,
    latestSnapshot: recovery.latestSnapshot || null,
    updatedAt: new Date().toISOString()
  };
}

export function runLocalClosure(mode = "FULL_CLOSE") {
  const x = String(mode || "").trim().toUpperCase();

  if (x === "FULL_CLOSE") {
    autoFixLocalQA();
    seedLocalFactory();
    runLaunchpadBoot("FULL_BOOT");
    runLocalScenario("MORNING_BOOT");
    runLocalScenario("BROKER_SYNC");
    runLocalScenario("CLIENT_INFLOW");
    createLocalSnapshot({ label: "local-closure-full" });
    authorizeRelease({ action: "AUTHORIZE", note: "local closure full sync" });
  }

  if (x === "SAFE_CLOSE") {
    autoFixLocalQA();
    seedLocalFactory();
    runLaunchpadBoot("SAFE_BOOT");
    runLocalScenario("MORNING_BOOT");
    createLocalSnapshot({ label: "local-closure-safe" });
    authorizeRelease({ action: "AUTHORIZE", note: "local closure safe sync" });
  }

  if (x === "SNAPSHOT_ONLY") {
    createLocalSnapshot({ label: "local-closure-snapshot-only" });
  }

  return buildLocalClosureStatus();
}
