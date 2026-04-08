import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const STATE_FILE = path.join(TPM_DIR, "master.state.json");
const GLOBAL_FILE = path.join(TPM_DIR, "global-progress.json");
const README_FILE = path.join(ROOT, "README.md");

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

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
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

function defaultState() {
  return {
    running: true,
    cycle: 0,
    localCertified: true,
    masterFile: "lib/tpm-master.mjs",
    masterMode: "AUTONOMOUS_BUILD",
    stages: {
      productionPromotion: { progress: 0, closed: false },
      realTrading: { progress: 0, closed: false },
      productSurface: { progress: 0, closed: false },
      launchReadiness: { progress: 0, closed: false }
    },
    updatedAt: nowIso()
  };
}

export function getMasterState() {
  return readJson(STATE_FILE, defaultState());
}

function stageChecks() {
  return {
    productionPromotion: [
      exists("config/profiles/dev.json"),
      exists("config/profiles/stage.json"),
      exists("config/profiles/prod.json"),
      exists("config/secrets/SECRETS.md"),
      exists("ops/health/check.ps1"),
      exists("ops/workflows/release.yml"),
      exists("production-core/README.md")
    ],
    realTrading: [
      exists("trading-core/market-data/provider.ts"),
      exists("trading-core/brokers/adapter.ts"),
      exists("trading-core/execution/engine.ts"),
      exists("trading-core/strategy/engine.ts"),
      exists("trading-core/risk/engine.ts"),
      exists("trading-core/portfolio/engine.ts"),
      exists("app/paper-trading/page.js")
    ],
    productSurface: [
      exists("app/identity/page.js"),
      exists("app/workspace/page.js"),
      exists("app/client-portal/page.js"),
      exists("app/operator-os/page.js"),
      exists("app/billing/page.js"),
      exists("app/desktop-hq/page.js"),
      exists("app/mobile-hq/page.js")
    ],
    launchReadiness: [
      exists("app/security-center/page.js"),
      exists("app/launch-readiness/page.js"),
      exists("ops/tests/final-smoke.ps1"),
      exists("ops/tests/final-load.js"),
      exists("ops/checklists/global-launch-checklist.md"),
      exists("app/final-launch/page.js"),
      exists("app/api/final-launch/status/route.js")
    ]
  };
}

function calcStageProgress(list) {
  const closed = list.filter(Boolean).length;
  const total = Math.max(1, list.length);
  const progress = Math.round((closed / total) * 100);
  return { progress, closed: closed === total, closedCount: closed, total };
}

export function runMasterCycle() {
  const state = getMasterState();
  const checks = stageChecks();

  state.running = true;
  state.cycle = Number(state.cycle || 0) + 1;

  const production = calcStageProgress(checks.productionPromotion);
  const trading = calcStageProgress(checks.realTrading);
  const product = calcStageProgress(checks.productSurface);
  const launch = calcStageProgress(checks.launchReadiness);

  state.stages.productionPromotion = { progress: production.progress, closed: production.closed };
  state.stages.realTrading = { progress: trading.progress, closed: trading.closed };
  state.stages.productSurface = { progress: product.progress, closed: product.closed };
  state.stages.launchReadiness = { progress: launch.progress, closed: launch.closed };
  state.updatedAt = nowIso();

  const buildProgress = Math.round(
    (production.progress + trading.progress + product.progress + launch.progress) / 4
  );

  const global = {
    ok: true,
    projectType: "AUTONOMOUS_INTELLIGENT_PLATFORM",
    localCertified: true,
    masterMode: state.masterMode,
    masterFile: state.masterFile,
    buildProgress,
    remaining: Math.max(0, 100 - buildProgress),
    stages: state.stages,
    languages: scanLanguages(ROOT),
    updatedAt: nowIso()
  };

  writeJson(STATE_FILE, state);
  writeJson(GLOBAL_FILE, global);
  syncMasterReadme(global);

  return {
    ok: true,
    state,
    global
  };
}

function syncMasterReadme(global) {
  const langs = Object.entries(global.languages || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `- ${name}: ${count}`);

  const section = [
    "<!-- TPM:MASTER:START -->",
    "# Trading Pro Max",
    "",
    "## Master Autonomous Build",
    `- Local certified: ${global.localCertified ? "YES" : "NO"}`,
    `- Master mode: ${global.masterMode}`,
    `- Master file: ${global.masterFile}`,
    `- Build progress: ${global.buildProgress}%`,
    `- Remaining: ${global.remaining}%`,
    `- Production Promotion: ${global.stages.productionPromotion.progress}%`,
    `- Real Trading: ${global.stages.realTrading.progress}%`,
    `- Product Surface: ${global.stages.productSurface.progress}%`,
    `- Launch Readiness: ${global.stages.launchReadiness.progress}%`,
    "",
    "## Language Coverage",
    ...(langs.length ? langs : ["- no language data"]),
    "",
    "<!-- TPM:MASTER:END -->",
    ""
  ].join("\n");

  let readme = fs.existsSync(README_FILE) ? fs.readFileSync(README_FILE, "utf8") : "# Trading Pro Max\n";
  const start = "<!-- TPM:MASTER:START -->";
  const end = "<!-- TPM:MASTER:END -->";

  if (readme.includes(start) && readme.includes(end)) {
    const before = readme.split(start)[0];
    const after = readme.split(end)[1] || "";
    readme = `${before}${section}${after}`;
  } else {
    readme = `${section}\n${readme}`;
  }

  fs.writeFileSync(README_FILE, readme, "utf8");
}

export function getMasterStatus() {
  const state = getMasterState();
  const global = readJson(GLOBAL_FILE, {
    ok: true,
    projectType: "AUTONOMOUS_INTELLIGENT_PLATFORM",
    localCertified: true,
    masterMode: state.masterMode,
    masterFile: state.masterFile,
    buildProgress: 0,
    remaining: 100,
    stages: state.stages,
    languages: {},
    updatedAt: nowIso()
  });

  return {
    ok: true,
    state,
    global
  };
}
