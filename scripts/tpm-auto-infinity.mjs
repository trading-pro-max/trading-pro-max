import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const STATE = path.join(TPM, "auto-infinity.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function readJson(file, fallback){ try{ return JSON.parse(fs.readFileSync(file,"utf8")); }catch{ return fallback; } }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function getOnceScripts(){
  const pkg = readJson(path.join(ROOT, "package.json"), {});
  const scripts = pkg.scripts || {};
  const keys = Object.keys(scripts).filter(k =>
    /^tpm:.*:once$/.test(k) &&
    !/^tpm:(auto|infinity)/.test(k)
  );

  const withoutMaster = keys.filter(k => k !== "tpm:master:once").sort();
  return keys.includes("tpm:master:once")
    ? [...withoutMaster, "tpm:master:once"]
    : withoutMaster;
}

function runScript(name){
  try{
    execSync(`npm run ${name}`, { stdio: "inherit", cwd: ROOT, shell: true });
    return { name, ok: true };
  }catch(err){
    return { name, ok: false, error: String(err?.message || err) };
  }
}

async function cycle(){
  const startedAt = new Date().toISOString();
  const scripts = getOnceScripts();
  const results = [];

  for(const s of scripts){
    results.push(runScript(s));
  }

  const ok = results.filter(x => x.ok).length;
  const fail = results.filter(x => !x.ok).length;

  const state = {
    ok: fail === 0,
    mode: "TPM_AUTO_INFINITY",
    status: "ACTIVE",
    startedAt,
    finishedAt: new Date().toISOString(),
    totalScripts: scripts.length,
    okCount: ok,
    failCount: fail,
    scripts,
    results
  };

  writeJson(STATE, state);
  console.log(JSON.stringify(state, null, 2));
}

async function main(){
  while(true){
    await cycle();
    await sleep(120000);
  }
}

main();
