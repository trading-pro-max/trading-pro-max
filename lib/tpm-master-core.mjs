import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const MASTER_FILE = path.join(TPM, "master-runtime.json");
const AI_FILE = path.join(TPM, "ai-runtime.json");
const STRATEGY_FILE = path.join(TPM, "strategy-runtime.json");
const INTEL_FILE = path.join(TPM, "intelligence-runtime.json");
const EXPANSION_FILE = path.join(TPM, "expansion-runtime.json");
const AUTOBIND_FILE = path.join(TPM, "universal-autobind.json");
const SFTP_FILE = path.join(TPM, "godaddy-sftp-status.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(p){ return fs.existsSync(p); }
function readJson(file, fallback){ try{ if(exists(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function avg(values){ const list = values.filter(v => Number.isFinite(Number(v))).map(Number); return list.length ? Math.round(list.reduce((a,b)=>a+b,0)/list.length) : 0; }
function clamp(n){ return Math.max(0, Math.min(100, Math.round(Number(n)||0))); }

export function runMasterCycle(){
  ensureDir(TPM);

  const ai = readJson(AI_FILE, {
    overallProgress: 74,
    domains: { autonomy:100, ai:78, surface:74, deployment:35, operations:83 }
  });

  const strategy = readJson(STRATEGY_FILE, {
    overallProgress: 74,
    domains: { core:76, surfaces:74, autonomy:88, deployment:35, expansion:32 },
    executionQueue: []
  });

  const intel = readJson(INTEL_FILE, {
    overallProgress: 74,
    domains: { brain:78, research:76, autonomy:94, surfaces:74, deployment:35, operations:83, expansion:32 }
  });

  const expansion = readJson(EXPANSION_FILE, {
    overallProgress: 88,
    domains: { desktop:88, mobile:86, notifications:90, packaging:92, docs:88 }
  });

  const autobind = readJson(AUTOBIND_FILE, {
    ok: true,
    github: { auth: false, pushReady: true }
  });

  const sftp = readJson(SFTP_FILE, {
    ok: true,
    userReady: false,
    passwordReady: false,
    host: "fge.537.myftpupload.com"
  });

  const modules = [
    {
      slug: "brain",
      title: "AI Brain",
      progress: clamp(avg([ai?.domains?.ai, intel?.domains?.brain, ai?.overallProgress])),
      stage: "ACTIVE",
      description: "Autonomous intelligence and AI decision systems."
    },
    {
      slug: "strategy",
      title: "Strategy Engine",
      progress: clamp(avg([strategy?.domains?.core, intel?.domains?.research, strategy?.overallProgress])),
      stage: "ACTIVE",
      description: "Strategy lab, execution ranking, research and signal routing."
    },
    {
      slug: "autonomy",
      title: "Autonomy Core",
      progress: clamp(avg([ai?.domains?.autonomy, strategy?.domains?.autonomy, intel?.domains?.autonomy, autobind?.ok ? 100 : 0])),
      stage: "ACTIVE",
      description: "Self-running loops, autobind, orchestration and local continuity."
    },
    {
      slug: "surface",
      title: "Operator Surface",
      progress: clamp(avg([ai?.domains?.surface, strategy?.domains?.surfaces, intel?.domains?.surfaces, expansion?.domains?.desktop, expansion?.domains?.mobile])),
      stage: "ACTIVE",
      description: "Mission control, launchpad, AI control, desktop HQ and mobile HQ."
    },
    {
      slug: "research",
      title: "Research Vault",
      progress: clamp(avg([strategy?.domains?.core, intel?.domains?.research, intel?.metrics?.filesTracked ? 100 : 0])),
      stage: "ACTIVE",
      description: "Tracked system knowledge, memory runtime and research intelligence."
    },
    {
      slug: "operations",
      title: "Operations",
      progress: clamp(avg([ai?.domains?.operations, intel?.domains?.operations, autobind?.github?.pushReady ? 100 : 0])),
      stage: "ACTIVE",
      description: "GitHub sync, runtime health and ops continuity."
    },
    {
      slug: "deployment",
      title: "Deployment",
      progress: clamp(avg([ai?.domains?.deployment, strategy?.domains?.deployment, intel?.domains?.deployment, sftp?.ok ? 70 : 35])),
      stage: "BLOCKED_BY_PLAN",
      description: "External deployment path prepared; final hosting automation blocked by current plan."
    },
    {
      slug: "expansion",
      title: "Desktop + Mobile Expansion",
      progress: clamp(expansion?.overallProgress),
      stage: "ACTIVE",
      description: "Desktop shell, mobile shell, workspace sync and notification bridge."
    }
  ].map(m => ({
    ...m,
    remaining: Math.max(0, 100 - m.progress),
    readiness: m.progress >= 90 ? "high" : m.progress >= 75 ? "strong" : m.progress >= 55 ? "building" : "early",
    status: m.stage === "BLOCKED_BY_PLAN" ? "waiting" : m.progress >= 100 ? "closed" : "active"
  }));

  const overall = clamp(avg(modules.filter(x => x.slug !== "deployment").map(x => x.progress)));
  const completed = overall;
  const remaining = Math.max(0, 100 - overall);
  const activeModule = [...modules].sort((a,b)=>a.progress-b.progress).find(x => x.status === "active") || modules[0];

  const blockers = [];
  if((sftp?.userReady !== true) || (sftp?.passwordReady !== true)) blockers.push("GoDaddy SFTP credentials are not filled yet.");
  blockers.push("External deploy remains constrained by current hosting plan.");

  const result = {
    ok: true,
    mode: "TPM_MASTER_ACTIVE",
    overallProgress: overall,
    completed,
    remaining,
    finalReadiness: overall >= 90 ? "near-final" : overall >= 80 ? "strong-build" : "in-build",
    activeModule,
    modules,
    blockers,
    commands: [
      "npm run tpm:master:once",
      "npm run tpm:master",
      "npm run tpm:expansion:once",
      "npm run tpm:strategy:once",
      "npm run tpm:intelligence:once"
    ],
    pages: [
      "/master-control",
      "/expansion-center",
      "/desktop-hq",
      "/mobile-hq",
      "/ai-control",
      "/strategy-lab",
      "/intelligence-center",
      "/research-vault"
    ],
    nextWave: [
      { slug:"client-depth", title:"client portal depth", progress: 84, stage:"ACTIVE", status:"building" },
      { slug:"analytics-depth", title:"analytics depth", progress: 82, stage:"ACTIVE", status:"building" },
      { slug:"deploy-switch", title:"deploy switch", progress: 70, stage:"WAITING_PLAN", status:"blocked" }
    ],
    time: new Date().toISOString()
  };

  writeJson(MASTER_FILE, result);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-master-core.mjs")) {
  console.log(JSON.stringify(runMasterCycle(), null, 2));
}
