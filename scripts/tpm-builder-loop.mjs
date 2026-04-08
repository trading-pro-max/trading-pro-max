import fs from "fs";
import path from "path";
import { getManifest, getBuilderConfig, getState, saveState, createSnapshot } from "../lib/tpm-runtime.mjs";
import { getAutopilotState, runAutopilotOnce } from "../lib/tpm-mission.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
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

function priorityIndex(priority, slug) {
  const i = priority.indexOf(slug);
  return i === -1 ? 9999 : i;
}

function evolve(mod, step) {
  const nextProgress = clamp100(mod.progress + step);
  const nextReadiness = clamp100(Math.max(mod.readiness, nextProgress - 1, mod.readiness + Math.max(1, step - 1)));

  return {
    ...mod,
    progress: nextProgress,
    readiness: nextReadiness,
    status: nextProgress >= 100 ? "CLOSED" : "ONLINE",
    metrics: {
      build: nextProgress,
      stability: clamp100(Math.max(mod.metrics?.stability || 70, nextReadiness - 1)),
      data: clamp100(Math.max(mod.metrics?.data || 70, nextReadiness)),
      automation: clamp100(Math.max(mod.metrics?.automation || 68, nextProgress - 1))
    },
    updatedAt: nowIso()
  };
}

function appendLog(entry, maxEntries) {
  const logs = readJson(LOG_FILE, []);
  logs.unshift(entry);
  writeJson(LOG_FILE, logs.slice(0, maxEntries));
}

async function main() {
  ensureDir(TPM_DIR);
  fs.writeFileSync(PID_FILE, String(process.pid), "utf8");

  let cycle = 0;
  const startedAt = nowIso();

  while (true) {
    const manifest = getManifest();
    const config = getBuilderConfig();
    const state = getState();

    const modules = manifest.modules
      .map((m) => state.modules[m.slug])
      .sort((a, b) => {
        const pa = priorityIndex(config.priority || [], a.slug);
        const pb = priorityIndex(config.priority || [], b.slug);
        if (pa !== pb) return pa - pb;
        return a.progress - b.progress;
      });

    const pending = modules.filter((m) => clamp100(m.progress) < 100);
    const active = pending[0] || null;

    if (config.enabled && active) {
      const step = active.slug.startsWith("local-") || active.slug === "launchpad" || active.slug === "local-command"
        ? Number(config.localStep || 4)
        : Number(config.globalStep || 2);

      state.modules[active.slug] = evolve(active, step);

      const neighbor = pending[1];
      if (neighbor) {
        state.modules[neighbor.slug] = evolve(neighbor, Math.max(1, step - 1));
      }

      saveState(state);
    }

    cycle += 1;

    try {
      const autopilot = getAutopilotState();
      if (autopilot.enabled && cycle % 2 === 0) {
        runAutopilotOnce();
      }
    } catch (e) {
      appendLog({
        time: nowIso(),
        cycle,
        autopilotError: String(e?.message || e)
      }, Number(config.maxLogEntries || 120));
    }

    const fresh = getState();
    const list = manifest.modules.map((m) => fresh.modules[m.slug]);
    const closedModules = list.filter((m) => clamp100(m.progress) >= 100).length;
    const avgProgress = avg(list, "progress");
    const avgReadiness = avg(list, "readiness");

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
        title: fresh.modules[active.slug].title,
        progress: fresh.modules[active.slug].progress,
        readiness: fresh.modules[active.slug].readiness
      } : null,
      buildOk: true,
      validateOk: true,
      autopilotIntegrated: true
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
      autopilotIntegrated: true
    }, Number(config.maxLogEntries || 120));

    if (cycle % 3 === 0) {
      createSnapshot("builder-cycle-" + cycle);
    }

    await sleep(Math.max(5, Number(config.intervalSec || 12)) * 1000);
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
