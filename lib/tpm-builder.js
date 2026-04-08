import fs from "fs";
import path from "path";
import { getShellSummary, getManifest, getState } from "./tpm-runtime.js";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CONFIG_FILE = path.join(TPM_DIR, "builder-config.json");
const STATUS_FILE = path.join(TPM_DIR, "builder-status.json");
const LOG_FILE = path.join(TPM_DIR, "builder-log.json");
const PID_FILE = path.join(TPM_DIR, "builder.pid");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function getBuilderConfig() {
  return readJson(CONFIG_FILE, {
    enabled: true,
    intervalSec: 12,
    localStep: 4,
    globalStep: 2,
    maxLogEntries: 120,
    priority: []
  });
}

export function getBuilderStatus() {
  const shell = getShellSummary();
  const manifest = getManifest();
  const state = getState();
  const status = readJson(STATUS_FILE, {
    running: false,
    cycle: 0,
    lastRunAt: null,
    startedAt: null,
    avgProgress: shell.progress,
    avgReadiness: shell.readiness,
    closedModules: 0,
    totalModules: manifest.modules.length,
    activeModule: null
  });
  const logs = readJson(LOG_FILE, []);
  const pid = fs.existsSync(PID_FILE) ? String(fs.readFileSync(PID_FILE, "utf8")).trim() : null;

  return {
    productName: shell.productName,
    systemTitle: shell.systemTitle,
    shell,
    manifest,
    state,
    builder: status,
    logs,
    pid
  };
}
