import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");
const CONFIG_FILE = path.join(TPM_DIR, "builder-config.json");
const STATUS_FILE = path.join(TPM_DIR, "builder-status.json");
const LOG_FILE = path.join(TPM_DIR, "builder-log.json");
const PID_FILE = path.join(TPM_DIR, "builder.pid");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp100(x) {
  return Math.max(0, Math.min(100, Math.round(Number(x || 0))));
}

function avg(items, key) {
  if (!items.length) return 0;
  return Math.round(items.reduce((a, b) => a + clamp100(b[key]), 0) / items.length);
}

function ensureManifest() {
  const manifest = readJson(MANIFEST_FILE, null);
  if (!manifest || !Array.isArray(manifest.modules) || !manifest.modules.length) {
    throw new Error("Missing valid .tpm/manifest.json");
  }
  return manifest;
}

function ensureState(manifest) {
  const state = readJson(STATE_FILE, { modules: {} });
  state.modules = state.modules || {};

  manifest.modules.forEach((m, index) => {
    state.modules[m.slug] = state.modules[m.slug] || {
      slug: m.slug,
      title: m.title,
      description: m.description || "",
      stage: m.stage || "Builder Managed",
      status: m.status || "ONLINE",
      progress: clamp100(m.progress || Math.min(100, 60 + index)),
      readiness: clamp100(m.readiness || Math.min(100, 70 + index)),
      metrics: {
        build: clamp100(m.progress || Math.min(100, 60 + index)),
        stability: clamp100(m.readiness || Math.min(100, 70 + index)),
        data: clamp100(m.readiness || Math.min(100, 70 + index)),
        automation: clamp100(m.readiness || Math.min(100, 70 + index))
      },
      updatedAt: nowIso()
    };
  });

  writeJson(STATE_FILE, state);
  return state;
}

function readConfig() {
  return readJson(CONFIG_FILE, {
    enabled: true,
    intervalSec: 12,
    localStep: 4,
    globalStep: 2,
    maxLogEntries: 120,
    priority: []
  });
}

function priorityIndex(priority, slug) {
  const i = priority.indexOf(slug);
  return i === -1 ? 9999 : i;
}

function evolveModule(mod, step) {
  const nextProgress = clamp100(mod.progress + step);
  const nextReadiness = clamp100(Math.max(mod.readiness, nextProgress - 1, mod.readiness + Math.max(1, step - 1)));

  return {
    ...mod,
    progress: nextProgress,
    readiness: nextReadiness,
    status: nextProgress >= 100 ? "CLOSED" : "ONLINE",
    metrics: {
      build: clamp100(nextProgress),
      stability: clamp100(Math.max(mod.metrics?.stability || 70, nextReadiness - 1)),
      data: clamp100(Math.max(mod.metrics?.data || 70, nextReadiness)),
      automation: clamp100(Math.max(mod.metrics?.automation || 68, nextProgress - 1))
    },
    updatedAt: nowIso()
  };
}

function runBuildAndValidate() {
  const build = spawnSync(process.execPath, ["./scripts/tpm-build.mjs"], { cwd: ROOT, stdio: "ignore" });
  const validate = spawnSync(process.execPath, ["./scripts/tpm-validate.mjs"], { cwd: ROOT, stdio: "ignore" });
  return {
    buildOk: build.status === 0,
    validateOk: validate.status === 0
  };
}

function appendLog(entry, maxEntries) {
  const logs = readJson(LOG_FILE, []);
  logs.unshift(entry);
  writeJson(LOG_FILE, logs.slice(0, maxEntries));
}

function currentPid() {
  return process.pid;
}

async function main() {
  ensureDir(TPM_DIR);
  fs.writeFileSync(PID_FILE, String(currentPid()), "utf8");

  const manifest = ensureManifest();
  let state = ensureState(manifest);
  const config = readConfig();

  let cycle = 0;
  const startedAt = nowIso();

  while (true) {
    const freshConfig = readConfig();
    if (!freshConfig.enabled) {
      writeJson(STATUS_FILE, {
        running: false,
        cycle,
        startedAt,
        lastRunAt: nowIso(),
        avgProgress: avg(Object.values(state.modules), "progress"),
        avgReadiness: avg(Object.values(state.modules), "readiness"),
        closedModules: Object.values(state.modules).filter((x) => clamp100(x.progress) >= 100).length,
        totalModules: manifest.modules.length,
        activeModule: null,
        note: "builder disabled"
      });
      await sleep(3000);
      continue;
    }

    state = ensureState(manifest);

    const ordered = manifest.modules
      .map((m) => state.modules[m.slug])
      .sort((a, b) => priorityIndex(freshConfig.priority || [], a.slug) - priorityIndex(freshConfig.priority || [], b.slug));

    const targets = ordered.filter((m) => clamp100(m.progress) < 100);
    const active = targets[0] || null;

    if (active) {
      const step = active.slug.startsWith("local-") || active.slug === "launchpad" || active.slug === "local-command"
        ? Number(freshConfig.localStep || 4)
        : Number(freshConfig.globalStep || 2);

      state.modules[active.slug] = evolveModule(active, step);

      const neighbor = targets[1];
      if (neighbor) {
        state.modules[neighbor.slug] = evolveModule(neighbor, Math.max(1, step - 1));
      }

      writeJson(STATE_FILE, state);
    }

    const buildResult = runBuildAndValidate();
    cycle += 1;

    const moduleList = manifest.modules.map((m) => state.modules[m.slug]);
    const avgProgress = avg(moduleList, "progress");
    const avgReadiness = avg(moduleList, "readiness");
    const closedModules = moduleList.filter((x) => clamp100(x.progress) >= 100).length;

    const status = {
      running: true,
      cycle,
      startedAt,
      lastRunAt: nowIso(),
      avgProgress,
      avgReadiness,
      closedModules,
      totalModules: manifest.modules.length,
      activeModule: active ? {
        slug: active.slug,
        title: state.modules[active.slug].title,
        progress: state.modules[active.slug].progress,
        readiness: state.modules[active.slug].readiness
      } : null,
      buildOk: buildResult.buildOk,
      validateOk: buildResult.validateOk
    };

    writeJson(STATUS_FILE, status);

    appendLog({
      time: nowIso(),
      cycle,
      activeModule: status.activeModule,
      avgProgress,
      avgReadiness,
      closedModules,
      totalModules: manifest.modules.length,
      buildOk: buildResult.buildOk,
      validateOk: buildResult.validateOk
    }, Number(freshConfig.maxLogEntries || 120));

    await sleep(Math.max(5, Number(freshConfig.intervalSec || 12)) * 1000);
  }
}

main().catch((err) => {
  writeJson(STATUS_FILE, {
    running: false,
    cycle: 0,
    startedAt: null,
    lastRunAt: nowIso(),
    error: String(err?.message || err)
  });
  appendLog({
    time: nowIso(),
    error: String(err?.message || err)
  }, 120);
  process.exit(1);
});
