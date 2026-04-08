import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const GLOBAL_FILE = path.join(ROOT, ".tpm", "global-progress.json");
const FINAL100_FILE = path.join(ROOT, ".tpm", "final-100-result.json");
const README_FILE = path.join(ROOT, "README.md");
const MANIFEST_FILE = path.join(ROOT, ".tpm", "manifest.json");
const STATE_FILE = path.join(ROOT, ".tpm", "state.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
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

const global = readJson(GLOBAL_FILE, {
  globalProgress: 58,
  remaining: 42,
  jumpEarned: 0,
  jumpTotal: 14,
  jumpClosed: false,
  localCertified: false
});

const final100 = readJson(FINAL100_FILE, null);
const manifest = readJson(MANIFEST_FILE, { modules: [] });
const state = readJson(STATE_FILE, { modules: {} });

const totalModules = Array.isArray(manifest.modules) ? manifest.modules.length : 0;
const closedModules = totalModules
  ? manifest.modules.filter(m => Number(state.modules?.[m.slug]?.progress || 0) >= 100).length
  : 0;

const languages = Object.entries(scanLanguages(ROOT))
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => `- ${name}: ${count}`);

const section = [
  "<!-- TPM:PROGRESS:START -->",
  "# Trading Pro Max",
  "",
  "## Live Build Status",
  `- Global completion: ${global.globalProgress}%`,
  `- Remaining: ${global.remaining}%`,
  `- Local autonomous core: ${global.localCertified ? "100% CERTIFIED" : "IN PROGRESS"}`,
  `- Production Core jump: ${global.jumpEarned}/${global.jumpTotal}`,
  `- Modules closed locally: ${closedModules}/${totalModules}`,
  `- Release state: ${final100?.releaseVerdict || "LOCAL_ONLY"}`,
  `- Certification: ${final100?.certificationVerdict || "PENDING"}`,
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
console.log("README synced");
