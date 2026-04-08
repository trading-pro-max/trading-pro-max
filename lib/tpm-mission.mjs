import fs from "fs";
import path from "path";
import { getBuilderStatus, getBuilderConfig, pulseModule } from "./tpm-runtime.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CONFIG_FILE = path.join(TPM_DIR, "builder-config.json");
const AUTO_FILE = path.join(TPM_DIR, "autopilot.json");

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

function priorityIndex(priority, slug) {
  const i = priority.indexOf(slug);
  return i === -1 ? 9999 : i;
}

export function getMissionControl() {
  const builder = getBuilderStatus();
  const priority = [
    "launchpad","local-command","local-os","local-qa","local-factory","local-scenarios",
    "local-recovery","local-closure","local-final","release-center","control","workspace",
    "execution","brokers","risk","analytics","intelligence","operator-os","desktop-hq",
    "mobile-hq","growth","client-portal","cloud","backbone","war-room","strategy-lab",
    "research","portfolio-lab","notifications","autonomy","identity","platform","ops"
  ];

  const modules = (builder.shell?.modules || []).map((m) => ({
    ...m,
    gap: Math.max(0, 100 - n(m.progress)),
    readinessGap: Math.max(0, 100 - n(m.readiness))
  }));

  const blockers = [...modules]
    .filter((m) => n(m.progress) < 100)
    .sort((a, b) => {
      const p = n(a.progress) - n(b.progress);
      if (p !== 0) return p;
      return n(a.readiness) - n(b.readiness);
    })
    .slice(0, 10);

  const closeReady = [...modules]
    .filter((m) => n(m.progress) >= 95 && n(m.progress) < 100)
    .sort((a, b) => n(b.progress) - n(a.progress));

  const nextWave = [...modules]
    .filter((m) => n(m.progress) < 100)
    .sort((a, b) => {
      const pa = priorityIndex(priority, a.slug);
      const pb = priorityIndex(priority, b.slug);
      if (pa !== pb) return pa - pb;
      return n(a.progress) - n(b.progress);
    })
    .slice(0, 12);

  const totalGap = modules.reduce((a, b) => a + n(b.gap), 0);

  return {
    ok: true,
    summary: {
      progress: builder.builder?.avgProgress || builder.shell?.progress || 0,
      readiness: builder.builder?.avgReadiness || builder.shell?.readiness || 0,
      closedModules: builder.builder?.closedModules || 0,
      totalModules: builder.builder?.totalModules || modules.length,
      remainingModules: modules.filter((m) => n(m.progress) < 100).length,
      remainingGap: totalGap
    },
    builder: builder.builder,
    config: builder.config || getBuilderConfig(),
    shell: builder.shell,
    blockers,
    closeReady,
    nextWave,
    logs: builder.logs || [],
    pid: builder.pid || null,
    updatedAt: new Date().toISOString()
  };
}

export function safeHugeJump(payload = {}) {
  const mode = String(payload.mode || "MAX_SAFE").trim().toUpperCase();
  const mission = getMissionControl();

  const localBoost = mode === "MAX_SAFE" ? 10 : 8;
  const globalBoost = mode === "MAX_SAFE" ? 6 : 4;

  const coreSet = new Set([
    "launchpad","local-command","local-os","local-qa","local-factory","local-scenarios",
    "local-recovery","local-closure","local-final","release-center","control","workspace",
    "execution","brokers","risk","analytics"
  ]);

  const touched = [];

  for (const m of mission.nextWave) {
    const remaining = Math.max(0, 100 - n(m.progress));
    if (remaining <= 0) continue;

    const step = coreSet.has(m.slug) || String(m.slug).startsWith("local-")
      ? Math.min(localBoost, remaining)
      : Math.min(globalBoost, remaining);

    const result = pulseModule(m.slug, step, "mission-huge-jump");
    if (result) touched.push(result);
  }

  return {
    ok: true,
    mode,
    touched,
    mission: getMissionControl()
  };
}

export function promoteCloseReady(payload = {}) {
  const threshold = Math.max(80, Number(payload.threshold || 95));
  const mission = getMissionControl();
  const touched = [];

  for (const m of mission.closeReady.filter((x) => n(x.progress) >= threshold)) {
    const remaining = Math.max(0, 100 - n(m.progress));
    if (remaining <= 0) continue;
    const result = pulseModule(m.slug, remaining, "mission-promote");
    if (result) touched.push(result);
  }

  return {
    ok: true,
    threshold,
    touched,
    mission: getMissionControl()
  };
}

export function getAutopilotState() {
  return readJson(AUTO_FILE, {
    enabled: true,
    mode: "MAX_SAFE",
    autoPromote: true,
    lastActionAt: null,
    lastAction: null
  });
}

export function setAutopilotState(payload = {}) {
  const current = getAutopilotState();
  const next = {
    ...current,
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled,
    mode: String(payload.mode || current.mode || "MAX_SAFE").trim().toUpperCase(),
    autoPromote: payload.autoPromote !== undefined ? Boolean(payload.autoPromote) : current.autoPromote,
    lastActionAt: current.lastActionAt || null,
    lastAction: current.lastAction || null
  };

  writeJson(AUTO_FILE, next);
  return getAutopilotMission();
}

export function runAutopilotOnce() {
  const current = getAutopilotState();

  if (!current.enabled) {
    return getAutopilotMission();
  }

  const jump = safeHugeJump({ mode: current.mode || "MAX_SAFE" });
  let promote = null;

  if (current.autoPromote) {
    promote = promoteCloseReady({ threshold: 95 });
  }

  const next = {
    ...current,
    lastActionAt: new Date().toISOString(),
    lastAction: {
      jumpTouched: jump?.touched?.length || 0,
      promoteTouched: promote?.touched?.length || 0
    }
  };

  writeJson(AUTO_FILE, next);
  return getAutopilotMission();
}

export function getAutopilotMission() {
  return {
    ok: true,
    autopilot: getAutopilotState(),
    mission: getMissionControl(),
    updatedAt: new Date().toISOString()
  };
}
