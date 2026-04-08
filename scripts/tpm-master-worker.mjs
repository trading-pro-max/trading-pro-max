import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const CFG_FILE = path.join(TPM_DIR, "master.worker.json");
const PID_FILE = path.join(TPM_DIR, "master.worker.pid");
const RT_FILE = path.join(TPM_DIR, "master.worker.runtime.json");

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

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString().trim();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const cfg = readJson(CFG_FILE, {
    enabled: true,
    intervalSec: 90,
    branch: "main",
    remote: "origin"
  });

  fs.writeFileSync(PID_FILE, String(process.pid), "utf8");
  let cycle = 0;

  while (true) {
    cycle += 1;
    try {
      const out = run("node ./scripts/tpm-master-run.mjs");
      run("git add -A");

      let changed = false;
      try {
        run("git diff --cached --quiet");
      } catch {
        changed = true;
      }

      const parsed = JSON.parse(out);

      if (changed) {
        run(`git commit -m "tpm: master autonomous build ${parsed.global.buildProgress}%"`);
        run(`git push ${cfg.remote} ${cfg.branch}`);
      }

      writeJson(RT_FILE, {
        ok: true,
        cycle,
        changed,
        pushed: changed,
        buildProgress: parsed.global.buildProgress,
        remaining: parsed.global.remaining,
        lastRunAt: new Date().toISOString()
      });
    } catch (e) {
      writeJson(RT_FILE, {
        ok: false,
        cycle,
        error: String(e?.message || e),
        lastRunAt: new Date().toISOString()
      });
    }

    await sleep(Math.max(30, Number(cfg.intervalSec || 90)) * 1000);
  }
}

main();
