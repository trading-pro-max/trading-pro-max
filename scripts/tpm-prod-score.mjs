import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CONFIG_FILE = path.join(TPM_DIR, "github-worker.config.json");
const GLOBAL_FILE = path.join(TPM_DIR, "global-progress.json");
const FINAL100_FILE = path.join(TPM_DIR, "final-100-result.json");

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonIfChanged(file, value) {
  const next = JSON.stringify(value, null, 2);
  const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (prev !== next) fs.writeFileSync(file, next, "utf8");
}

const config = readJson(CONFIG_FILE, {
  baseGlobalProgress: 58,
  jumpTargetProgress: 72
});

const checks = [
  {
    key: "env_profiles",
    label: "Environment profiles",
    weight: 2,
    pass: exists("config/profiles/dev.json") && exists("config/profiles/stage.json") && exists("config/profiles/prod.json")
  },
  {
    key: "secrets_policy",
    label: "Secrets policy",
    weight: 2,
    pass: exists("config/secrets/SECRETS.md")
  },
  {
    key: "health_suite",
    label: "Health suite",
    weight: 2,
    pass: exists("ops/health/check.ps1") && exists("ops/health/check.sh") && exists("ops/health/check.bat") && exists("ops/health/check.py")
  },
  {
    key: "sql_bootstrap",
    label: "SQL bootstrap",
    weight: 1,
    pass: exists("ops/sql/bootstrap.sql")
  },
  {
    key: "release_workflow",
    label: "Release workflow scaffold",
    weight: 2,
    pass: exists("ops/workflows/release.yml")
  },
  {
    key: "github_worker",
    label: "GitHub worker",
    weight: 2,
    pass: exists("scripts/tpm-github-worker.mjs") && exists("scripts/tpm-github-worker-start.ps1") && exists("scripts/tpm-github-worker-stop.ps1") && exists("scripts/tpm-github-worker-status.ps1")
  },
  {
    key: "docs",
    label: "Production docs",
    weight: 1,
    pass: exists("docs/PRODUCTION_PROMOTION.md")
  },
  {
    key: "multilang_core",
    label: "Multi-language core",
    weight: 2,
    pass: exists("production-core/README.md")
  }
];

const earned = checks.filter(x => x.pass).reduce((a, b) => a + b.weight, 0);
const jumpTotal = checks.reduce((a, b) => a + b.weight, 0);
const globalProgress = Math.max(config.baseGlobalProgress, Math.min(100, config.baseGlobalProgress + earned));
const remaining = Math.max(0, 100 - globalProgress);

const final100 = readJson(FINAL100_FILE, null);
const localCertified = !!final100 && Number(final100.remainingModules || 999) === 0 && String(final100.certificationVerdict || "") === "CERTIFIED_100";

writeJsonIfChanged(GLOBAL_FILE, {
  ok: true,
  baseGlobalProgress: config.baseGlobalProgress,
  jumpTargetProgress: config.jumpTargetProgress,
  globalProgress,
  remaining,
  jumpEarned: earned,
  jumpTotal,
  jumpClosed: earned === jumpTotal,
  localCertified,
  checks
});

console.log(JSON.stringify({
  globalProgress,
  remaining,
  jumpEarned: earned,
  jumpTotal,
  jumpClosed: earned === jumpTotal
}, null, 2));
