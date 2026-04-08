import fs from "fs";
import path from "path";
import { getClosingMap, runCloseAll } from "./tpm-closing.mjs";
import { getReleaseStatus, runReleaseNow } from "./tpm-release.mjs";
import { getMissionControl } from "./tpm-mission.mjs";
import { getBuilderStatus } from "./tpm-runtime.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CERT_FILE = path.join(TPM_DIR, "certification.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function n(x) {
  return Number(x || 0);
}

function defaultCert() {
  return {
    enabled: true,
    targetProgress: 100,
    targetReadiness: 98,
    lastRunAt: null,
    lastRun: null,
    verdict: "PENDING"
  };
}

export function getCertificationState() {
  return readJson(CERT_FILE, defaultCert());
}

export function setCertificationState(payload = {}) {
  const current = getCertificationState();
  const next = {
    ...current,
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled,
    targetProgress: payload.targetProgress !== undefined ? Math.max(90, Math.min(100, Number(payload.targetProgress || current.targetProgress || 100))) : current.targetProgress,
    targetReadiness: payload.targetReadiness !== undefined ? Math.max(90, Math.min(100, Number(payload.targetReadiness || current.targetReadiness || 98))) : current.targetReadiness,
    lastRunAt: current.lastRunAt || null,
    lastRun: current.lastRun || null,
    verdict: current.verdict || "PENDING"
  };

  writeJson(CERT_FILE, next);
  return getCertificationStatus();
}

function buildCertification() {
  const cert = getCertificationState();
  const builder = getBuilderStatus();
  const mission = getMissionControl();
  const release = getReleaseStatus();
  const closing = getClosingMap();

  const gates = [
    {
      key: "progress",
      label: "Progress Certified",
      pass: n(mission.summary?.progress) >= n(cert.targetProgress),
      current: n(mission.summary?.progress),
      target: n(cert.targetProgress)
    },
    {
      key: "readiness",
      label: "Readiness Certified",
      pass: n(mission.summary?.readiness) >= n(cert.targetReadiness),
      current: n(mission.summary?.readiness),
      target: n(cert.targetReadiness)
    },
    {
      key: "remaining",
      label: "Remaining Modules Zero",
      pass: n(mission.summary?.remainingModules) === 0,
      current: n(mission.summary?.remainingModules),
      target: 0
    },
    {
      key: "release",
      label: "Release Ready",
      pass: String(release.verdict || "") === "READY_FOR_PROMOTION",
      current: String(release.verdict || "UNKNOWN"),
      target: "READY_FOR_PROMOTION"
    },
    {
      key: "builder",
      label: "Builder Running",
      pass: Boolean(builder.builder?.running),
      current: Boolean(builder.builder?.running),
      target: true
    },
    {
      key: "closing",
      label: "Closing Map Active",
      pass: Boolean(closing.closing?.enabled),
      current: Boolean(closing.closing?.enabled),
      target: true
    }
  ];

  const passed = gates.filter((g) => g.pass).length;
  const score = Math.round((passed / Math.max(1, gates.length)) * 100);
  const verdict = gates.every((g) => g.pass) ? "CERTIFIED_100" : "STILL_OPEN";

  return {
    cert,
    builder,
    mission,
    release,
    closing,
    gates,
    score,
    verdict
  };
}

export function getCertificationStatus() {
  const ctx = buildCertification();

  return {
    ok: true,
    verdict: ctx.verdict,
    score: ctx.score,
    certification: ctx.cert,
    builder: ctx.builder.builder,
    mission: ctx.mission,
    release: ctx.release,
    closing: ctx.closing.closing,
    gates: ctx.gates,
    updatedAt: new Date().toISOString()
  };
}

export function runCertificationNow() {
  const cert = getCertificationState();
  if (!cert.enabled) return getCertificationStatus();

  const actions = [];
  for (let i = 0; i < 3; i++) {
    const close = runCloseAll();
    const release = runReleaseNow();
    actions.push({
      round: i + 1,
      remainingModules: close?.mission?.summary?.remainingModules || 0,
      progress: close?.mission?.summary?.progress || 0,
      readiness: close?.mission?.summary?.readiness || 0,
      releaseScore: release?.score || 0,
      releaseVerdict: release?.verdict || "UNKNOWN"
    });
  }

  const after = buildCertification();
  const next = {
    ...cert,
    lastRunAt: new Date().toISOString(),
    lastRun: actions,
    verdict: after.verdict
  };

  writeJson(CERT_FILE, next);
  return getCertificationStatus();
}
