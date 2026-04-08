import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const AI_FILE = path.join(TPM, "ai-runtime.json");
const MANIFEST_FILE = path.join(TPM, "ai-manifest.json");

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
    exists(path.join(ROOT, "scripts", "tpm-universal-autobind.ps1")),
    exists(path.join(ROOT, "scripts", "tpm-builder-loop.mjs")),
    exists(path.join(ROOT, "scripts", "tpm-builder-start.ps1")),
    exists(path.join(ROOT, "scripts", "tpm-builder-stop.ps1")),
    exists(path.join(ROOT, "scripts", "tpm-godaddy-sftp-status.ps1")),
    exists(path.join(ROOT, "package.json"))
  ];

  const aiSignals = [
    exists(path.join(ROOT, "lib", "tpm-ai-brain.mjs")),
    exists(path.join(ROOT, "scripts", "tpm-ai-loop.mjs")),
    exists(path.join(ROOT, "app", "ai-control", "page.js")),
    exists(path.join(ROOT, "app", "api", "ai", "status", "route.js")),
    exists(path.join(ROOT, "app", "api", "ai", "run", "route.js")),
    exists(path.join(ROOT, ".tpm", "ai-manifest.json"))
  ];

  const surfaceSignals = [
    exists(path.join(ROOT, "app", "local-command", "page.js")),
    exists(path.join(ROOT, "app", "mission-control", "page.js")),
    exists(path.join(ROOT, "app", "launchpad", "page.js")),
    exists(path.join(ROOT, "app", "builder-studio", "page.js")),
    exists(path.join(ROOT, "app", "ai-control", "page.js")),
    exists(path.join(ROOT, "app", "api", "builder", "mission", "route.js")),
    exists(path.join(ROOT, "app", "api", "final-launch", "status", "route.js"))
  ];

  const deploymentSignals = [
    exists(path.join(ROOT, ".github", "workflows", "tpm-godaddy-sftp-deploy.yml")),
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
    exists(path.join(ROOT, ".git")),
    exists(path.join(ROOT, ".github", "workflows")),
    exists(path.join(ROOT, "ops")),
    exists(path.join(ROOT, "logs")),
    exists(path.join(ROOT, ".tpm"))
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
