import fs from "fs";
import path from "path";
import {
  getBuilderStatus,
  getManifest,
  getBuilderConfig,
  getState,
  saveState,
  pulseModule,
  createSnapshot
} from "./tpm-runtime.mjs";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const CONFIG_FILE = path.join(TPM_DIR, "builder-config.json");

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

function clamp100(x) {
  return Math.max(0, Math.min(100, Math.round(Number(x || 0))));
}

function slugify(x) {
  return String(x || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureArray(x) {
  return Array.isArray(x) ? x : [];
}

function sortModules(modules) {
  return [...modules].sort((a, b) => {
    const pa = Number(b.progress || 0) - Number(a.progress || 0);
    if (pa !== 0) return pa;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

export function getStudioData() {
  const builder = getBuilderStatus();
  return {
    ok: true,
    productName: builder.productName,
    systemTitle: builder.systemTitle,
    manifest: builder.manifest,
    config: builder.config,
    builder: builder.builder,
    shell: builder.shell,
    modules: sortModules(builder.shell.modules),
    logs: ensureArray(builder.logs).slice(0, 20),
    pid: builder.pid || null,
    updatedAt: new Date().toISOString()
  };
}

export function updateBuilderConfig(payload = {}) {
  const current = getBuilderConfig();
  const next = {
    ...current,
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : Boolean(current.enabled),
    intervalSec: payload.intervalSec !== undefined ? Math.max(5, Number(payload.intervalSec || current.intervalSec || 12)) : Number(current.intervalSec || 12),
    localStep: payload.localStep !== undefined ? Math.max(1, Number(payload.localStep || current.localStep || 4)) : Number(current.localStep || 4),
    globalStep: payload.globalStep !== undefined ? Math.max(1, Number(payload.globalStep || current.globalStep || 2)) : Number(current.globalStep || 2),
    maxLogEntries: payload.maxLogEntries !== undefined ? Math.max(20, Number(payload.maxLogEntries || current.maxLogEntries || 120)) : Number(current.maxLogEntries || 120),
    priority: Array.isArray(payload.priority) && payload.priority.length ? payload.priority.map((x) => String(x).trim()).filter(Boolean) : current.priority
  };

  writeJson(CONFIG_FILE, next);
  return getStudioData();
}

export function upsertBuilderModule(payload = {}) {
  const manifest = getManifest();
  const state = getState();

  const slug = slugify(payload.slug || payload.title);
  if (!slug) {
    return {
      ok: false,
      error: "invalid_slug",
      studio: getStudioData()
    };
  }

  const nextModule = {
    slug,
    title: String(payload.title || slug).trim(),
    stage: String(payload.stage || "Builder Managed").trim(),
    status: String(payload.status || "ONLINE").trim().toUpperCase(),
    progress: clamp100(payload.progress !== undefined ? payload.progress : 70),
    readiness: clamp100(payload.readiness !== undefined ? payload.readiness : Math.max(75, payload.progress || 70)),
    description: String(payload.description || "").trim()
  };

  const modules = ensureArray(manifest.modules);
  const existingIndex = modules.findIndex((x) => x.slug === slug);

  if (existingIndex >= 0) {
    modules[existingIndex] = {
      ...modules[existingIndex],
      ...nextModule
    };
  } else {
    modules.push(nextModule);
  }

  manifest.modules = modules;
  writeJson(MANIFEST_FILE, manifest);

  state.modules = state.modules || {};
  state.modules[slug] = {
    slug,
    title: nextModule.title,
    description: nextModule.description,
    stage: nextModule.stage,
    status: nextModule.progress >= 100 ? "CLOSED" : nextModule.status,
    progress: nextModule.progress,
    readiness: nextModule.readiness,
    metrics: {
      build: nextModule.progress,
      stability: Math.max(60, Math.min(100, nextModule.readiness - 1)),
      data: nextModule.readiness,
      automation: Math.max(58, Math.min(100, nextModule.readiness - 2))
    },
    updatedAt: new Date().toISOString()
  };
  saveState(state);

  return {
    ok: true,
    studio: getStudioData()
  };
}

export function removeBuilderModule(payload = {}) {
  const slug = slugify(payload.slug);
  if (!slug) {
    return {
      ok: false,
      error: "invalid_slug",
      studio: getStudioData()
    };
  }

  const manifest = getManifest();
  const state = getState();

  manifest.modules = ensureArray(manifest.modules).filter((x) => x.slug !== slug);
  writeJson(MANIFEST_FILE, manifest);

  if (state.modules && state.modules[slug]) {
    delete state.modules[slug];
    saveState(state);
  }

  return {
    ok: true,
    studio: getStudioData()
  };
}

export function pulseBuilderModule(payload = {}) {
  const slug = slugify(payload.slug);
  if (!slug) {
    return {
      ok: false,
      error: "invalid_slug",
      studio: getStudioData()
    };
  }

  const step = Math.max(1, Number(payload.step || 3));
  const result = pulseModule(slug, step, "studio-pulse");

  if (!result) {
    return {
      ok: false,
      error: "module_not_found",
      studio: getStudioData()
    };
  }

  return {
    ok: true,
    studio: getStudioData()
  };
}

export function snapshotBuilder(payload = {}) {
  const label = String(payload.label || "studio-manual").trim() || "studio-manual";
  createSnapshot(label);
  return {
    ok: true,
    studio: getStudioData()
  };
}
