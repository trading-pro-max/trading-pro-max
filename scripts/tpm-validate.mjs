import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");
const STATE_FILE = path.join(TPM_DIR, "state.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const manifest = readJson(MANIFEST_FILE, null);
if (!manifest) fail("Missing .tpm/manifest.json");
if (!Array.isArray(manifest.modules) || !manifest.modules.length) fail("Manifest has no modules");

const state = readJson(STATE_FILE, null);
if (!state || !state.modules) fail("Missing .tpm/state.json");

const required = [
  "lib/tpm-runtime.js",
  "app/layout.js",
  "app/page.js",
  "app/api/health/route.js"
];

for (const m of manifest.modules) {
  required.push(`app/${m.slug}/page.js`);
  required.push(`app/api/${m.slug}/status/route.js`);
  if (!state.modules[m.slug]) fail(`Missing state for module ${m.slug}`);
}

const missing = required.filter((x) => !fs.existsSync(path.join(ROOT, x)));
if (missing.length) {
  console.error("Missing generated files:");
  missing.forEach((m) => console.error(" -", m));
  process.exit(1);
}

console.log("TPM validate OK:", required.length, "files checked.");
