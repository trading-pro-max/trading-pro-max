import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const PID_FILE = path.join(TPM_DIR, "github-worker.pid");
const CONFIG_FILE = path.join(TPM_DIR, "github-worker.config.json");
const RUNTIME_FILE = path.join(TPM_DIR, "github-worker.runtime.json");
const GLOBAL_FILE = path.join(TPM_DIR, "global-progress.json");

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString().trim();
}

async function main() {
  const config = readJson(CONFIG_FILE, {
    intervalSec: 90,
    branch: "main",
    remote: "origin",
    enabled: true
  });

  fs.writeFileSync(PID_FILE, String(process.pid), "utf8");

  let cycle = 0;

  while (true) {
    cycle += 1;

    try {
      run("node ./scripts/tpm-prod-score.mjs");
      run("node ./scripts/tpm-readme-sync.mjs");

      run("git add -A");

      let changed = false;
      try {
        run("git diff --cached --quiet");
      } catch {
        changed = true;
      }

      const global = readJson(GLOBAL_FILE, { globalProgress: 58 });

      if (changed) {
        const msg = `tpm: auto-sync ${global.globalProgress}%`;
        run(`git commit -m "${msg}"`);
        run(`git push ${config.remote} ${config.branch}`);
      }

      writeJson(RUNTIME_FILE, {
        ok: true,
        cycle,
        changed,
        pushed: changed,
        globalProgress: global.globalProgress,
        remaining: global.remaining
      });
    } catch (e) {
      writeJson(RUNTIME_FILE, {
        ok: false,
        cycle,
        error: String(e?.message || e)
      });
    }

    await sleep(Math.max(30, Number(config.intervalSec || 90)) * 1000);
  }
}

main();
