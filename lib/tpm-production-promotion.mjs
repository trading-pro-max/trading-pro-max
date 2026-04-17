import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const STATE_FILE = path.join(TPM_DIR, "production-promotion.json");
const RESULT_FILE = path.join(TPM_DIR, "production-promotion.result.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
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

function exists(rel) {
  return fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), rel));
}

function defaultState() {
  return {
    prepared: false,
    ready: false,
    liveDeploymentPossible: false,
    verdict: "PENDING",
    lastRunAt: null,
    updatedAt: nowIso()
  };
}

function buildChecks() {
  return [
    { key: "env_example", label: "Production env example", pass: exists(".env.production.example") },
    { key: "dockerfile", label: "Dockerfile", pass: exists("Dockerfile") },
    { key: "compose", label: "Production compose", pass: exists("docker-compose.production.yml") },
    { key: "nginx", label: "Nginx edge config", pass: exists("ops/nginx/default.conf") },
    { key: "workflow", label: "GitHub production workflow", pass: exists(".github/workflows/tpm-production-promotion.yml") },
    { key: "health_api", label: "Health API", pass: exists("app/api/health/route.js") },
    { key: "production_api", label: "Production promotion APIs", pass: exists("app/api/production/status/route.js") && exists("app/api/production/run/route.js") },
    { key: "production_page", label: "Production promotion page", pass: exists("app/production-promotion/page.js") },
    { key: "prep_script", label: "Production prep script", pass: exists("scripts/tpm-prod-prep.mjs") }
  ];
}

export function getProductionPromotionStatus() {
  const state = readJson(STATE_FILE, defaultState());
  const checks = buildChecks();
  const passed = checks.filter(x => x.pass).length;
  const total = Math.max(1, checks.length);
  const progress = Math.round((passed / total) * 100);

  const liveDeploymentPossible = Boolean(process.env.PROD_HOST && process.env.PROD_USER);
  const ready = passed === total;
  const verdict = ready
    ? (liveDeploymentPossible ? "READY_FOR_EXTERNAL_PROMOTION" : "READY_FOR_EXTERNAL_PROMOTION_PENDING_SECRETS")
    : "CLOSING";

  const next = {
    ...state,
    prepared: ready,
    ready,
    liveDeploymentPossible,
    verdict,
    updatedAt: nowIso()
  };

  writeJson(STATE_FILE, next);

  return {
    ok: true,
    progress,
    remaining: Math.max(0, 100 - progress),
    ready,
    liveDeploymentPossible,
    verdict,
    checks,
    updatedAt: next.updatedAt
  };
}

export function runProductionPromotion() {
  const status = getProductionPromotionStatus();

  const result = {
    ok: true,
    progress: status.progress,
    remaining: status.remaining,
    ready: status.ready,
    liveDeploymentPossible: status.liveDeploymentPossible,
    verdict: status.verdict,
    time: nowIso()
  };

  const state = readJson(STATE_FILE, defaultState());
  state.lastRunAt = result.time;
  state.updatedAt = result.time;
  state.prepared = result.ready;
  state.ready = result.ready;
  state.liveDeploymentPossible = result.liveDeploymentPossible;
  state.verdict = result.verdict;

  writeJson(STATE_FILE, state);
  writeJson(RESULT_FILE, result);

  return result;
}
