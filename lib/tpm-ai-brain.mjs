import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const AI_FILE = path.join(TPM, "ai-runtime.json");
const MANIFEST_FILE = path.join(TPM, "ai-manifest.json");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const AUTOBIND_FILE = path.join(ROOT, "scripts", "tpm-universal-autobind.ps1");
const BUILDER_LOOP_FILE = path.join(ROOT, "scripts", "tpm-builder-loop.mjs");
const BUILDER_START_FILE = path.join(ROOT, "scripts", "tpm-builder-start.ps1");
const BUILDER_STOP_FILE = path.join(ROOT, "scripts", "tpm-builder-stop.ps1");
const GODADDY_STATUS_FILE = path.join(ROOT, "scripts", "tpm-godaddy-sftp-status.ps1");
const AI_LOOP_FILE = path.join(ROOT, "scripts", "tpm-ai-loop.mjs");
const AI_PAGE_FILE = path.join(ROOT, "app", "ai-control", "page.js");
const AI_STATUS_ROUTE_FILE = path.join(ROOT, "app", "api", "ai", "status", "route.js");
const AI_RUN_ROUTE_FILE = path.join(ROOT, "app", "api", "ai", "run", "route.js");
const LOCAL_COMMAND_PAGE_FILE = path.join(ROOT, "app", "local-command", "page.js");
const MISSION_CONTROL_PAGE_FILE = path.join(ROOT, "app", "mission-control", "page.js");
const LAUNCHPAD_PAGE_FILE = path.join(ROOT, "app", "launchpad", "page.js");
const BUILDER_STUDIO_PAGE_FILE = path.join(ROOT, "app", "builder-studio", "page.js");
const BUILDER_MISSION_ROUTE_FILE = path.join(ROOT, "app", "api", "builder", "mission", "route.js");
const FINAL_LAUNCH_STATUS_ROUTE_FILE = path.join(ROOT, "app", "api", "final-launch", "status", "route.js");
const GODADDY_WORKFLOW_FILE = path.join(ROOT, ".github", "workflows", "tpm-godaddy-sftp-deploy.yml");
const GIT_HEAD_FILE = path.join(ROOT, ".git", "HEAD");
const OPS_DIR = path.join(ROOT, "ops");
const LOGS_DIR = path.join(ROOT, "logs");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(p){ return fs.existsSync(p); }
function readJson(file, fallback){ try{ if(exists(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function readEnv(file){
  const out = {};
  try{
    const raw = fs.readFileSync(file,"utf8");
    for(const line of raw.split(/\r?\n/)){
      const s = line.trim();
      if(!s || s.startsWith("#") || !s.includes("=")) continue;
      const i = s.indexOf("=");
      const k = s.slice(0,i).trim();
      const v = s.slice(i+1).trim().replace(/^["']|["']$/g,"");
      out[k] = v;
    }
  }catch{}
  return out;
}
function pct(have,total){ return total===0 ? 0 : Math.round((have/total)*100); }
function score(items){ return pct(items.filter(Boolean).length, items.length); }

function defaultManifest(){
  return {
    version: 1,
    vision: "Trading Pro Max global AI autonomous platform",
    domains: [
      { slug:"autonomy", title:"Autonomy Core", target:100 },
      { slug:"ai", title:"AI Brain", target:100 },
      { slug:"surface", title:"Product Surface", target:100 },
      { slug:"deployment", title:"External Deployment", target:100 },
      { slug:"operations", title:"Operations", target:100 }
    ]
  };
}

function collect(){
  ensureDir(TPM);
  const env = readEnv(path.join(ROOT, ".env.connectors"));
  const prod = readEnv(path.join(ROOT, ".env.production"));
  const manifest = readJson(MANIFEST_FILE, defaultManifest());

  const autonomySignals = [
    exists(AUTOBIND_FILE),
    exists(BUILDER_LOOP_FILE),
    exists(BUILDER_START_FILE),
    exists(BUILDER_STOP_FILE),
    exists(GODADDY_STATUS_FILE),
    exists(PACKAGE_FILE)
  ];

  const aiSignals = [
    exists(path.join(ROOT, "lib", "tpm-ai-brain.mjs")),
    exists(AI_LOOP_FILE),
    exists(AI_PAGE_FILE),
    exists(AI_STATUS_ROUTE_FILE),
    exists(AI_RUN_ROUTE_FILE),
    exists(MANIFEST_FILE)
  ];

  const surfaceSignals = [
    exists(LOCAL_COMMAND_PAGE_FILE),
    exists(MISSION_CONTROL_PAGE_FILE),
    exists(LAUNCHPAD_PAGE_FILE),
    exists(BUILDER_STUDIO_PAGE_FILE),
    exists(AI_PAGE_FILE),
    exists(BUILDER_MISSION_ROUTE_FILE),
    exists(FINAL_LAUNCH_STATUS_ROUTE_FILE)
  ];

  const deploymentSignals = [
    exists(GODADDY_WORKFLOW_FILE),
    !!env.GODADDY_SFTP_HOST,
    !!env.GODADDY_SFTP_PORT,
    !!env.GODADDY_SFTP_REMOTE_PATH,
    !!env.GODADDY_SFTP_USER,
    !!env.GODADDY_SFTP_PASSWORD,
    !!prod.PROD_HOST,
    !!prod.PROD_USER,
    !!prod.PROD_PATH
  ];

  const opsSignals = [
    exists(GIT_HEAD_FILE),
    exists(GODADDY_WORKFLOW_FILE),
    exists(OPS_DIR),
    exists(LOGS_DIR),
    exists(AI_FILE) || exists(MANIFEST_FILE)
  ];

  const autonomy = score(autonomySignals);
  const ai = score(aiSignals);
  const surface = score(surfaceSignals);
  const deployment = score(deploymentSignals);
  const operations = score(opsSignals);

  const overall = Math.round((autonomy + ai + surface + deployment + operations) / 5);
  const remaining = Math.max(0, 100 - overall);

  const nextWave = [
    { slug:"ai-systems", title:"AI systems layer", progress: ai, stage:"ACTIVE", status: ai >= 80 ? "strong" : "building" },
    { slug:"surface-depth", title:"surface depth", progress: surface, stage:"ACTIVE", status: surface >= 80 ? "strong" : "building" },
    { slug:"external-deploy", title:"external deploy", progress: deployment, stage:"BLOCKED_BY_PLAN", status: deployment >= 80 ? "ready" : "waiting" },
    { slug:"ops-hardening", title:"ops hardening", progress: operations, stage:"ACTIVE", status: operations >= 80 ? "strong" : "building" }
  ];

  const priorities = [
    "Expand AI internal orchestration and decision loops",
    "Increase product pages, APIs, and operator surfaces",
    "Keep GoDaddy deployment path prepared until upgrade is available",
    "Continue GitHub-centered autonomous sync"
  ];

  return {
    ok: true,
    mode: "TPM_AI_ACTIVE",
    vision: manifest.vision,
    overallProgress: overall,
    completed: overall,
    remaining,
    domains: {
      autonomy,
      ai,
      surface,
      deployment,
      operations
    },
    blockers: deployment < 100 ? ["GoDaddy Basic plan blocks full external automation"] : [],
    priorities,
    nextWave,
    commands: [
      "npm run tpm:ai:once",
      "npm run tpm:ai",
      "npm run tpm:autobind",
      "npm run tpm:godaddy-sftp-status"
    ],
    time: new Date().toISOString()
  };
}

export function runAiCycle(){
  const runtime = collect();
  writeJson(AI_FILE, runtime);
  if(!exists(MANIFEST_FILE)) writeJson(MANIFEST_FILE, defaultManifest());
  return runtime;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-ai-brain.mjs")) {
  console.log(JSON.stringify(runAiCycle(), null, 2));
}
