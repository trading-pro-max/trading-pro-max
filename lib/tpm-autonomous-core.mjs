import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CONFIG_FILE = path.join(TPM_DIR, "autonomous-core.config.json");
const GLOBAL_FILE = path.join(TPM_DIR, "global-progress.json");
const FINAL100_FILE = path.join(TPM_DIR, "final-100-result.json");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
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
}

function scanLanguages(dir, bag = {}) {
  const ignore = new Set(["node_modules", ".git", ".next"]);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanLanguages(full, bag);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    const map = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".mjs": "JavaScript",
      ".ps1": "PowerShell",
      ".sh": "Shell",
      ".bat": "Batch",
      ".cmd": "Batch",
      ".py": "Python",
      ".sql": "SQL",
      ".yml": "YAML",
      ".yaml": "YAML",
      ".json": "JSON",
      ".md": "Markdown",
      ".css": "CSS",
      ".html": "HTML"
    };
    const lang = map[ext];
    if (!lang) continue;
    bag[lang] = (bag[lang] || 0) + 1;
  }
  return bag;
}

function getModulesClosed() {
  const manifest = readJson(MANIFEST_FILE, { modules: [] });
  const state = readJson(STATE_FILE, { modules: {} });
  const total = Array.isArray(manifest.modules) ? manifest.modules.length : 0;
  const closed = total
    ? manifest.modules.filter(m => Number(state.modules?.[m.slug]?.progress || 0) >= 100).length
    : 0;
  return { total, closed };
}

export function getAutonomousCoreStatus() {
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

  const jumpEarned = checks.filter(x => x.pass).reduce((a, b) => a + b.weight, 0);
  const jumpTotal = checks.reduce((a, b) => a + b.weight, 0);
  const globalProgress = Math.max(config.baseGlobalProgress, Math.min(100, config.baseGlobalProgress + jumpEarned));
  const remaining = Math.max(0, 100 - globalProgress);

  const final100 = readJson(FINAL100_FILE, null);
  const localCertified = !!final100 && Number(final100.remainingModules || 999) === 0 && String(final100.certificationVerdict || "") === "CERTIFIED_100";
  const modules = getModulesClosed();
  const languages = scanLanguages(ROOT);

  const result = {
    ok: true,
    globalProgress,
    remaining,
    jumpEarned,
    jumpTotal,
    jumpClosed: jumpEarned === jumpTotal,
    localCertified,
    modulesClosed: modules.closed,
    modulesTotal: modules.total,
    languages,
    checks,
    updatedAt: new Date().toISOString()
  };

  writeJson(GLOBAL_FILE, result);
  return result;
}

export function syncAutonomousReadme() {
  const status = getAutonomousCoreStatus();
  const README_FILE = path.join(ROOT, "README.md");

  const languages = Object.entries(status.languages || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `- ${name}: ${count}`);

  const section = [
    "<!-- TPM:PROGRESS:START -->",
    "# Trading Pro Max",
    "",
    "## Live Build Status",
    `- Global completion: ${status.globalProgress}%`,
    `- Remaining: ${status.remaining}%`,
    `- Local autonomous core: ${status.localCertified ? "100% CERTIFIED" : "IN PROGRESS"}`,
    `- Production Core jump: ${status.jumpEarned}/${status.jumpTotal}`,
    `- Modules closed locally: ${status.modulesClosed}/${status.modulesTotal}`,
    "",
    "## Active Production Jump",
    "- Production Promotion Layer",
    "- Automatic GitHub worker",
    "- README auto-sync",
    "- Multi-language ops scaffolding",
    "",
    "## Language Coverage",
    ...(languages.length ? languages : ["- no language scan data"]),
    "",
    "<!-- TPM:PROGRESS:END -->",
    ""
  ].join("\n");

  let readme = fs.existsSync(README_FILE) ? fs.readFileSync(README_FILE, "utf8") : "# Trading Pro Max\n";
  const start = "<!-- TPM:PROGRESS:START -->";
  const end = "<!-- TPM:PROGRESS:END -->";

  if (readme.includes(start) && readme.includes(end)) {
    readme = readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), section.trim());
  } else {
    readme = `${section}\n${readme}`;
  }

  fs.writeFileSync(README_FILE, readme, "utf8");
  return status;
}

export function runAutonomousCoreCycle() {
  const status = syncAutonomousReadme();
  return {
    ok: true,
    ...status
  };
}
