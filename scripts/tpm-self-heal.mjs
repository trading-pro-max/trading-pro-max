import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");

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
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureManifest() {
  ensureDir(TPM_DIR);
  const manifest = readJson(MANIFEST_FILE, null);
  if (manifest && Array.isArray(manifest.modules) && manifest.modules.length) return manifest;
  throw new Error("Manifest missing");
}

function ensureState(manifest) {
  const state = readJson(STATE_FILE, { modules: {} });
  state.modules = state.modules || {};
  manifest.modules.forEach((m, index) => {
    state.modules[m.slug] = state.modules[m.slug] || {
      slug: m.slug,
      title: m.title,
      stage: m.stage || "Builder Managed",
      status: m.status || "ONLINE",
      progress: Number(m.progress || Math.min(100, 60 + index)),
      readiness: Number(m.readiness || Math.min(100, 70 + index)),
      metrics: {
        build: Number(m.progress || Math.min(100, 60 + index)),
        stability: Number(m.readiness || Math.min(100, 70 + index)),
        data: Number(m.readiness || Math.min(100, 70 + index)),
        automation: Number(m.readiness || Math.min(100, 70 + index))
      },
      updatedAt: nowIso()
    };
  });
  writeJson(STATE_FILE, state);
}

const manifest = ensureManifest();
ensureState(manifest);

const build = spawnSync(process.execPath, ["./scripts/tpm-build.mjs"], { stdio: "inherit", cwd: ROOT });
if (build.status !== 0) process.exit(build.status || 1);

const validate = spawnSync(process.execPath, ["./scripts/tpm-validate.mjs"], { stdio: "inherit", cwd: ROOT });
if (validate.status !== 0) process.exit(validate.status || 1);

console.log("TPM self-heal OK.");
