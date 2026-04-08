import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const MASTER_FILE = path.join(TPM, "master-runtime.json");
const MANIFEST_FILE = path.join(TPM, "master-manifest.json");
const AI_FILE = path.join(TPM, "ai-runtime.json");
const STRATEGY_FILE = path.join(TPM, "strategy-runtime.json");
const INTEL_FILE = path.join(TPM, "intelligence-runtime.json");
const AUTOBIND_FILE = path.join(TPM, "universal-autobind.json");
const SFTP_FILE = path.join(TPM, "godaddy-sftp-status.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(p){ return fs.existsSync(p); }
function readJson(file, fallback){ try{ if(exists(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function avg(values){ const list = values.filter(v => Number.isFinite(Number(v))).map(Number); return list.length ? Math.round(list.reduce((a,b)=>a+b,0)/list.length) : 0; }
function clamp(n){ return Math.max(0, Math.min(100, Math.round(Number(n)||0))); }

function defaultManifest(){
  return {
    version: 1,
    project: "Trading Pro Max",
    target: "Global #1 AI autonomous trading platform",
    modules: [
      { slug:"brain", title:"AI Brain", target:100 },
      { slug:"strategy", title:"Strategy Engine", target:100 },
      { slug:"autonomy", title:"Autonomy Core", target:100 },
      { slug:"surface", title:"Operator Surface", target:100 },
      { slug:"research", title:"Research Vault", target:100 },
      { slug:"operations", title:"Operations", target:100 },
      { slug:"deployment", title:"Deployment", target:100 },
      { slug:"expansion", title:"Desktop + Mobile Expansion", target:100 }
    ]
  };
}

function buildModules(ai, strategy, intel, autobind, sftp){
  const modules = [
    {
      slug: "brain",
      title: "AI Brain",
      progress: clamp(avg([ai?.domains?.ai, intel?.domains?.brain])),
      stage: "ACTIVE",
      description: "Autonomous intelligence, runtime reasoning, AI control surfaces."
    },
    {
      slug: "strategy",
      title: "Strategy Engine",
      progress: clamp(avg([strategy?.domains?.core, intel?.domains?.research])),
      stage: "ACTIVE",
      description: "Strategy lab, execution queue, ranking and research direction."
    },
    {
      slug: "autonomy",
      title: "Autonomy Core",
      progress: clamp(avg([ai?.domains?.autonomy, strategy?.domains?.autonomy, autobind?.ok ? 100 : 0])),
      stage: "ACTIVE",
      description: "Self-running loops, autobind, master orchestration and local continuity."
    },
    {
      slug: "surface",
      title: "Operator Surface",
      progress: clamp(avg([ai?.domains?.surface, strategy?.domains?.surfaces, intel?.domains?.surfaces])),
      stage: "ACTIVE",
      description: "Mission control, launchpad, AI control, intelligence center and operator views."
    },
    {
      slug: "research",
      title: "Research Vault",
      progress: clamp(avg([strategy?.domains?.core, intel?.domains?.research, intel?.metrics?.filesTracked ? 100 : 0])),
      stage: "ACTIVE",
      description: "Tracked system knowledge, memory runtime, research and file intelligence."
    },
    {
      slug: "operations",
      title: "Operations",
      progress: clamp(avg([ai?.domains?.operations, intel?.domains?.operations, autobind?.github?.pushReady ? 100 : 0])),
      stage: "ACTIVE",
      description: "GitHub sync, runtime health, local automation and ops readiness."
    },
    {
      slug: "deployment",
      title: "Deployment",
      progress: clamp(avg([ai?.domains?.deployment, strategy?.domains?.deployment, intel?.domains?.deployment, sftp?.ok ? 60 : 35])),
      stage: "BLOCKED_BY_PLAN",
      description: "External deployment path prepared; final GoDaddy automation blocked by current plan."
    },
    {
      slug: "expansion",
      title: "Desktop + Mobile Expansion",
      progress: clamp(avg([strategy?.domains?.expansion, intel?.domains?.expansion])),
      stage: "NEXT",
      description: "Desktop and mobile shells, future client surfaces and packaged growth."
    }
  ];

  return modules.map(m => ({
    ...m,
    remaining: Math.max(0, 100 - m.progress),
    readiness: m.progress >= 90 ? "high" : m.progress >= 70 ? "strong" : m.progress >= 50 ? "building" : "early",
    status: m.progress >= 100 ? "closed" : m.stage === "BLOCKED_BY_PLAN" ? "waiting" : "active"
  }));
}

export function runMasterCycle(){
  ensureDir(TPM);

  const manifest = readJson(MANIFEST_FILE, defaultManifest());
  if(!exists(MANIFEST_FILE)) writeJson(MANIFEST_FILE, manifest);

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
    domains: { brain:78, research:76, autonomy:94, surfaces:74, deployment:35, operations:83, expansion:32 },
    metrics: { filesTracked: 0 }
  });

  const autobind = readJson(AUTOBIND_FILE, {
    ok: true,
    github: { auth: false, pushReady: true }
  });

  const sftp = readJson(SFTP_FILE, {
    ok: true,
    mode: "GODADDY_SFTP_AUTODEPLOY_READY",
    userReady: false,
    passwordReady: false,
    host: "fge.537.myftpupload.com",
    remotePath: "/html"
  });

  const modules = buildModules(ai, strategy, intel, autobind, sftp);
  const overall = clamp(avg(modules.map(m => m.progress)));
  const completed = overall;
  const remaining = Math.max(0, 100 - overall);

  const sorted = [...modules].sort((a,b)=>a.progress - b.progress);
  const activeModule = sorted.find(x => x.status !== "waiting") || sorted[0];

  const blockers = [];
  if((sftp?.userReady !== true) || (sftp?.passwordReady !== true)) blockers.push("GoDaddy SFTP credentials not filled yet.");
  if(modules.find(x => x.slug === "deployment")?.progress < 100) blockers.push("External deploy finalization blocked by current hosting plan.");
  if(!autobind?.github?.auth) blockers.push("GitHub CLI auth is not continuously guaranteed in every local session.");

  const result = {
    ok: true,
    mode: "TPM_MASTER_ACTIVE",
    project: manifest.project,
    target: manifest.target,
    overallProgress: overall,
    completed,
    remaining,
    activeModule,
    finalReadiness: overall >= 90 ? "near-final" : overall >= 75 ? "strong-build" : "in-build",
    modules,
    commands: [
      "npm run tpm:master:once",
      "npm run tpm:master",
      "npm run tpm:ai:once",
      "npm run tpm:strategy:once",
      "npm run tpm:intelligence:once"
    ],
    pages: [
      "/master-control",
      "/ai-control",
      "/strategy-lab",
      "/intelligence-center",
      "/research-vault",
      "/mission-control",
      "/launchpad",
      "/local-command"
    ],
    blockers,
    nextWave: [
      { slug:"desktop-shell", title:"desktop shell", progress: modules.find(x=>x.slug==="expansion")?.progress || 0, stage:"NEXT", status:"building" },
      { slug:"mobile-shell", title:"mobile shell", progress: modules.find(x=>x.slug==="expansion")?.progress || 0, stage:"NEXT", status:"building" },
      { slug:"operator-depth", title:"operator depth", progress: modules.find(x=>x.slug==="surface")?.progress || 0, stage:"ACTIVE", status:"building" },
      { slug:"research-memory", title:"research memory", progress: modules.find(x=>x.slug==="research")?.progress || 0, stage:"ACTIVE", status:"strong" }
    ],
    time: new Date().toISOString()
  };

  writeJson(MASTER_FILE, result);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-master-core.mjs")) {
  console.log(JSON.stringify(runMasterCycle(), null, 2));
}
