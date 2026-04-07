import { buildLocalClosureStatus, runLocalClosure } from "./local-closure.js";
import { buildLocalRecoveryStatus, createLocalSnapshot } from "./local-recovery.js";
import { buildLaunchpadStatus } from "./local-launchpad.js";
import { buildReleaseBoard } from "./release-orchestrator.js";

function n(x) {
  return Number(x || 0);
}

function avg(values) {
  const clean = values.map((x) => Number(x || 0));
  return Number((clean.reduce((a, b) => a + b, 0) / clean.length).toFixed(2));
}

export function buildLocalFinalStatus() {
  const closure = buildLocalClosureStatus();
  const recovery = buildLocalRecoveryStatus();
  const launchpad = buildLaunchpadStatus();
  const release = buildReleaseBoard();

  const recoveryScore = Array.isArray(recovery.snapshots) && recovery.snapshots.length >= 1 ? 96 : 24;
  const finalReadiness = avg([
    n(closure.summary?.closureReadiness),
    n(launchpad.finalReadiness),
    n(release.summary?.releaseReadiness),
    recoveryScore
  ]);

  const checklist = [
    {
      key: "closure",
      title: "Local closure",
      ok: n(closure.summary?.closed) === n(closure.summary?.total),
      score: n(closure.summary?.closureReadiness),
      detail: n(closure.summary?.closed) + "/" + n(closure.summary?.total)
    },
    {
      key: "launchpad",
      title: "Launchpad readiness",
      ok: n(launchpad.finalReadiness) >= 80,
      score: n(launchpad.finalReadiness),
      detail: n(launchpad.finalReadiness) + "%"
    },
    {
      key: "release",
      title: "Release readiness",
      ok: n(release.summary?.criticalOpen) === 0 && n(release.summary?.releaseReadiness) >= 78,
      score: n(release.summary?.releaseReadiness),
      detail: "critical open " + n(release.summary?.criticalOpen)
    },
    {
      key: "recovery",
      title: "Recovery snapshot",
      ok: Array.isArray(recovery.snapshots) && recovery.snapshots.length >= 1,
      score: recoveryScore,
      detail: "snapshots " + (Array.isArray(recovery.snapshots) ? recovery.snapshots.length : 0)
    }
  ];

  const certified = checklist.every((x) => x.ok);

  return {
    product: {
      name: "Trading Pro Max",
      stage: "Local Finalization",
      progress: certified ? 100 : 98
    },
    certified,
    finalReadiness,
    summary: {
      closed: checklist.filter((x) => x.ok).length,
      total: checklist.length
    },
    scores: {
      closure: n(closure.summary?.closureReadiness),
      launchpad: n(launchpad.finalReadiness),
      release: n(release.summary?.releaseReadiness),
      recovery: recoveryScore
    },
    checklist,
    latestSnapshot: recovery.latestSnapshot || null,
    updatedAt: new Date().toISOString()
  };
}

export function runLocalFinalCertification(mode = "CERTIFY") {
  const x = String(mode || "").trim().toUpperCase();

  if (x === "CERTIFY") {
    runLocalClosure("FULL_CLOSE");
    createLocalSnapshot({ label: "local-final-certification" });
  }

  if (x === "SAFE_CERTIFY") {
    runLocalClosure("SAFE_CLOSE");
    createLocalSnapshot({ label: "local-final-safe-certification" });
  }

  if (x === "REFRESH") {
    createLocalSnapshot({ label: "local-final-refresh" });
  }

  return buildLocalFinalStatus();
}
