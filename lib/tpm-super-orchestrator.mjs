import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CONFIG_FILE = path.join(TPM_DIR, "mega-jump.config.json");
const GLOBAL_FILE = path.join(TPM_DIR, "global-progress.json");
const FINAL100_FILE = path.join(TPM_DIR, "final-100-result.json");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");
const README_FILE = path.join(ROOT, "README.md");
const LANGUAGE_SCAN_ROOTS = [
  path.join(ROOT, "app"),
  path.join(ROOT, "lib"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "ops"),
  path.join(ROOT, "docs"),
  path.join(ROOT, "desktop"),
  path.join(ROOT, "config"),
  path.join(ROOT, "production-core"),
  path.join(ROOT, "trading-core"),
  path.join(ROOT, "data")
];

function exists(rel) {
  return fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), rel));
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

function collectLanguageCoverage() {
  const bag = {};
  for (const dir of LANGUAGE_SCAN_ROOTS) {
    if (!fs.existsSync(dir)) continue;
    scanLanguages(dir, bag);
  }
  return bag;
}

function getModulesClosed() {
  const manifest = readJson(MANIFEST_FILE, { modules: [] });
  const state = readJson(STATE_FILE, { modules: {} });
  const total = Array.isArray(manifest.modules) ? manifest.modules.length : 0;
  const closed = total ? manifest.modules.filter(m => Number(state.modules?.[m.slug]?.progress || 0) >= 100).length : 0;
  return { total, closed };
}

function productionChecks() {
  return [
    { key: "env_profiles", label: "Environment profiles", weight: 2, pass: exists("config/profiles/dev.json") && exists("config/profiles/stage.json") && exists("config/profiles/prod.json") },
    { key: "secrets_policy", label: "Secrets policy", weight: 2, pass: exists("config/secrets/SECRETS.md") },
    { key: "health_suite", label: "Health suite", weight: 2, pass: exists("ops/health/check.ps1") && exists("ops/health/check.sh") && exists("ops/health/check.bat") && exists("ops/health/check.py") },
    { key: "sql_bootstrap", label: "SQL bootstrap", weight: 1, pass: exists("ops/sql/bootstrap.sql") },
    { key: "release_workflow", label: "Release workflow scaffold", weight: 2, pass: exists("ops/workflows/release.yml") },
    { key: "github_worker", label: "GitHub worker", weight: 2, pass: exists("scripts/tpm-github-worker.mjs") && exists("scripts/tpm-github-worker-start.ps1") && exists("scripts/tpm-github-worker-stop.ps1") && exists("scripts/tpm-github-worker-status.ps1") },
    { key: "docs", label: "Production docs", weight: 1, pass: exists("docs/PRODUCTION_PROMOTION.md") },
    { key: "multilang_core", label: "Multi-language core", weight: 2, pass: exists("production-core/README.md") }
  ];
}

function tradingChecks() {
  return [
    { key: "market_data", label: "Market data layer", weight: 2, pass: exists("trading-core/market-data/provider.ts") },
    { key: "broker_adapters", label: "Broker adapters", weight: 1, pass: exists("trading-core/brokers/adapter.ts") },
    { key: "execution_engine", label: "Execution engine", weight: 2, pass: exists("trading-core/execution/engine.ts") },
    { key: "strategy_engine", label: "Strategy engine", weight: 1, pass: exists("trading-core/strategy/engine.ts") },
    { key: "risk_engine", label: "Risk engine", weight: 1, pass: exists("trading-core/risk/engine.ts") },
    { key: "portfolio_engine", label: "Portfolio engine", weight: 1, pass: exists("trading-core/portfolio/engine.ts") },
    { key: "paper_live", label: "Paper/live modes", weight: 1, pass: exists("trading-core/paper-live/modes.ts") },
    { key: "python_analytics", label: "Python analytics", weight: 1, pass: exists("trading-core/python/analytics.py") },
    { key: "paper_runtime", label: "Paper trading runtime", weight: 1, pass: exists("lib/tpm-paper-trading.mjs") && exists("app/paper-trading/page.js") && exists("app/api/paper-trading/status/route.js") },
    { key: "trading_sql", label: "Trading SQL bootstrap", weight: 1, pass: exists("ops/sql/trading-core.sql") },
    { key: "trading_docs", label: "Trading docs", weight: 1, pass: exists("docs/TRADING_CORE.md") }
  ];
}

function productChecks() {
  return [
    { key: "product_runtime", label: "Product runtime core", weight: 1, pass: exists("lib/tpm-product-runtime.mjs") },
    { key: "product_api", label: "Product runtime APIs", weight: 1, pass: exists("app/api/product-runtime/status/route.js") && exists("app/api/product-runtime/run/route.js") && exists("app/api/product-runtime/reset/route.js") },
    { key: "identity", label: "Identity surface", weight: 1, pass: exists("app/identity/page.js") },
    { key: "workspace", label: "Workspace surface", weight: 1, pass: exists("app/workspace/page.js") },
    { key: "client_portal", label: "Client portal", weight: 1, pass: exists("app/client-portal/page.js") },
    { key: "operator_os", label: "Operator OS", weight: 1, pass: exists("app/operator-os/page.js") },
    { key: "desktop_hq", label: "Desktop HQ", weight: 1, pass: exists("app/desktop-hq/page.js") },
    { key: "mobile_hq", label: "Mobile HQ", weight: 1, pass: exists("app/mobile-hq/page.js") },
    { key: "billing", label: "Billing surface", weight: 1, pass: exists("app/billing/page.js") }
  ];
}

function launchChecks() {
  return [
    { key: "launch_runtime", label: "Launch runtime core", weight: 1, pass: exists("lib/tpm-launch-runtime.mjs") },
    { key: "launch_api", label: "Launch runtime APIs", weight: 1, pass: exists("app/api/launch-runtime/status/route.js") && exists("app/api/launch-runtime/run/route.js") && exists("app/api/launch-runtime/reset/route.js") },
    { key: "security_center", label: "Security center", weight: 1, pass: exists("app/security-center/page.js") },
    { key: "launch_readiness", label: "Launch readiness", weight: 1, pass: exists("app/launch-readiness/page.js") },
    { key: "load_test", label: "Load test scaffold", weight: 1, pass: exists("ops/tests/load-test.js") },
    { key: "smoke_test", label: "Smoke test scaffold", weight: 1, pass: exists("ops/tests/smoke-test.ps1") },
    { key: "launch_checklist", label: "Launch checklist", weight: 1, pass: exists("ops/checklists/launch-checklist.md") }
  ];
}

export function getSuperStatus() {
  const config = readJson(CONFIG_FILE, {
    baseGlobalProgress: 58,
    productionJumpMax: 14,
    tradingJumpMax: 12,
    productJumpMax: 9,
    launchJumpMax: 7,
    targetGlobalProgress: 100
  });

  const prod = productionChecks();
  const trading = tradingChecks();
  const product = productChecks();
  const launch = launchChecks();

  const prodEarned = prod.filter(x => x.pass).reduce((a, b) => a + b.weight, 0);
  const tradingEarned = trading.filter(x => x.pass).reduce((a, b) => a + b.weight, 0);
  const productEarned = product.filter(x => x.pass).reduce((a, b) => a + b.weight, 0);
  const launchEarned = launch.filter(x => x.pass).reduce((a, b) => a + b.weight, 0);

  const globalProgress = Math.min(
    config.targetGlobalProgress,
    config.baseGlobalProgress
      + Math.min(prodEarned, config.productionJumpMax)
      + Math.min(tradingEarned, config.tradingJumpMax)
      + Math.min(productEarned, config.productJumpMax)
      + Math.min(launchEarned, config.launchJumpMax)
  );

  const remaining = Math.max(0, 100 - globalProgress);
  const final100 = readJson(FINAL100_FILE, null);
  const localCertified = !!final100 && Number(final100.remainingModules || 999) === 0 && String(final100.certificationVerdict || "") === "CERTIFIED_100";
  const modules = getModulesClosed();
  const languages = collectLanguageCoverage();

  const result = {
    ok: true,
    globalProgress,
    remaining,
    localCertified,
    production: { earned: prodEarned, max: prod.reduce((a,b)=>a+b.weight,0), closed: prod.every(x=>x.pass), checks: prod },
    trading: { earned: tradingEarned, max: trading.reduce((a,b)=>a+b.weight,0), closed: trading.every(x=>x.pass), checks: trading },
    product: { earned: productEarned, max: product.reduce((a,b)=>a+b.weight,0), closed: product.every(x=>x.pass), checks: product },
    launch: { earned: launchEarned, max: launch.reduce((a,b)=>a+b.weight,0), closed: launch.every(x=>x.pass), checks: launch },
    modulesClosed: modules.closed,
    modulesTotal: modules.total,
    languages,
    updatedAt: new Date().toISOString()
  };

  writeJson(GLOBAL_FILE, result);
  return result;
}

export function syncSuperReadme() {
  const status = getSuperStatus();
  const langs = Object.entries(status.languages || {}).sort((a,b)=>b[1]-a[1]).map(([name,count]) => `- ${name}: ${count}`);

  const section = [
    "<!-- TPM:PROGRESS:START -->",
    "# Trading Pro Max",
    "",
    "## Live Build Status",
    `- Global completion: ${status.globalProgress}%`,
    `- Remaining: ${status.remaining}%`,
    `- Local autonomous core: ${status.localCertified ? "100% CERTIFIED" : "IN PROGRESS"}`,
    `- Production jump: ${status.production.earned}/${status.production.max}`,
    `- Trading jump: ${status.trading.earned}/${status.trading.max}`,
    `- Product jump: ${status.product.earned}/${status.product.max}`,
    `- Launch jump: ${status.launch.earned}/${status.launch.max}`,
    `- Modules closed locally: ${status.modulesClosed}/${status.modulesTotal}`,
    "",
    "## Active Major Jumps",
    "- Autonomous Production Core",
    "- Real Trading Core",
    "- Product Runtime Surface",
    "- Launch Readiness Runtime",
    "",
    "## Language Coverage",
    ...(langs.length ? langs : ["- no language scan data"]),
    "",
    "<!-- TPM:PROGRESS:END -->",
    ""
  ].join("\n");

  let readme = fs.existsSync(README_FILE) ? fs.readFileSync(README_FILE, "utf8") : "# Trading Pro Max\n";
  const start = "<!-- TPM:PROGRESS:START -->";
  const end = "<!-- TPM:PROGRESS:END -->";

  if (readme.includes(start) && readme.includes(end)) {
    const before = readme.split(start)[0];
    const after = readme.split(end)[1] || "";
    readme = `${before}${section}${after}`;
  } else {
    readme = `${section}\n${readme}`;
  }

  fs.writeFileSync(README_FILE, readme, "utf8");
  return status;
}

export function runSuperCycle() {
  syncSuperReadme();
  return getSuperStatus();
}
