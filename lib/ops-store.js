import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "ops-audit.json");
const BACKUP_FILE = path.join(DATA_DIR, "ops-backups.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(file, fallback) {
  try {
    ensureDir();
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

export function makeOpsId(prefix = "OPS") {
  return prefix + "-" + randomUUID().slice(0, 8).toUpperCase();
}

export function readAudit() {
  return Array.isArray(readJson(AUDIT_FILE, [])) ? readJson(AUDIT_FILE, []) : [];
}

export function appendAudit(entry) {
  const current = readAudit();
  current.unshift({
    id: makeOpsId("AUD"),
    time: new Date().toISOString(),
    severity: "info",
    source: "ops",
    event: "event",
    message: "",
    ...entry
  });
  return writeJson(AUDIT_FILE, current.slice(0, 300));
}

export function readBackups() {
  return Array.isArray(readJson(BACKUP_FILE, [])) ? readJson(BACKUP_FILE, []) : [];
}

export function appendBackup(backup) {
  const current = readBackups();
  current.unshift({
    id: makeOpsId("BKP"),
    createdAt: new Date().toISOString(),
    label: "manual-backup",
    payload: {},
    ...backup
  });
  return writeJson(BACKUP_FILE, current.slice(0, 50));
}
