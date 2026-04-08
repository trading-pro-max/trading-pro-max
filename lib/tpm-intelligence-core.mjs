import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const AI_FILE = path.join(TPM, "ai-runtime.json");
const STRATEGY_FILE = path.join(TPM, "strategy-runtime.json");
const INTEL_FILE = path.join(TPM, "intelligence-runtime.json");
const MEMORY_FILE = path.join(TPM, "research-memory.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(p){ return fs.existsSync(p); }
function readJson(file, fallback){ try{ if(exists(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function pct(have,total){ return total===0 ? 0 : Math.round((have/total)*100); }

function scan(root, maxDepth=2, depth=0){
  const out = [];
  if(depth > maxDepth || !exists(root)) return out;
  for(const name of fs.readdirSync(root)){
    const full = path.join(root,name);
    const rel = path.relative(ROOT, full).replace(/\\/g,"/");
    const st = fs.statSync(full);
    out.push({ name, rel, type: st.isDirectory() ? "dir" : "file" });
    if(st.isDirectory()) out.push(...scan(full, maxDepth, depth+1));
  }
  return out;
}

export function runIntelligenceCycle(){
  ensureDir(TPM);

  const ai = readJson(AI_FILE, {
    overallProgress: 74,
    completed: 74,
    remaining: 26,
    domains: { autonomy:100, ai:78, surface:74, deployment:35, operations:83 }
  });

  const strategy = readJson(STRATEGY_FILE, {
    overallProgress: 74,
    completed: 74,
    remaining: 26,
    domains: { core:76, surfaces:74, autonomy:88, deployment:35, expansion:32 },
    executionQueue: []
  });

  const tree = [
    ...scan(path.join(ROOT,"app"),2),
    ...scan(path.join(ROOT,"lib"),1),
    ...scan(path.join(ROOT,"scripts"),1),
    ...scan(path.join(ROOT,"ops"),1)
  ];

  const routes = tree.filter(x => x.rel.startsWith("app/api/") && x.type==="file").length;
  const pages = tree.filter(x => x.rel.startsWith("app/") && x.rel.endsWith("/page.js")).length;
  const libs = tree.filter(x => x.rel.startsWith("lib/") && x.type==="file").length;
  const scripts = tree.filter(x => x.rel.startsWith("scripts/") && x.type==="file").length;

  const memory = {
    ok: true,
    filesTracked: tree.length,
    routes,
    pages,
    libs,
    scripts,
    watchedZones: [
      "app",
      "app/api",
      "lib",
      "scripts",
      "ops",
      ".tpm"
    ],
    latestSnapshots: [
      "ai-runtime.json",
      "strategy-runtime.json",
      "intelligence-runtime.json"
    ],
    time: new Date().toISOString()
  };
  writeJson(MEMORY_FILE, memory);

  const brain = Number(ai.domains?.ai || 78);
  const autonomy = Math.round((Number(ai.domains?.autonomy || 100) + Number(strategy.domains?.autonomy || 88)) / 2);
  const surfaces = Math.round((Number(ai.domains?.surface || 74) + Number(strategy.domains?.surfaces || 74)) / 2);
  const deployment = Math.round((Number(ai.domains?.deployment || 35) + Number(strategy.domains?.deployment || 35)) / 2);
  const operations = Number(ai.domains?.operations || 83);
  const research = Number(strategy.domains?.core || 76);
  const expansion = Number(strategy.domains?.expansion || 32);

  const overall = Math.round((brain + autonomy + surfaces + deployment + operations + research + expansion) / 7);
  const completed = overall;
  const remaining = Math.max(0, 100 - overall);

  const nextWave = [
    { slug:"research-memory", title:"Research memory engine", progress: research, lane:"AI", status:"active" },
    { slug:"intelligence-surface", title:"Intelligence center surface", progress: surfaces, lane:"Surface", status:"active" },
    { slug:"autonomous-queue", title:"Autonomous execution queue", progress: autonomy, lane:"Autonomy", status:"active" },
    { slug:"external-deploy", title:"External deployment bridge", progress: deployment, lane:"Deploy", status: deployment < 100 ? "waiting-plan" : "ready" },
    { slug:"expansion-shells", title:"Desktop and mobile shells", progress: expansion, lane:"Expansion", status:"next" }
  ];

  const result = {
    ok: true,
    mode: "TPM_INTELLIGENCE_ACTIVE",
    overallProgress: overall,
    completed,
    remaining,
    domains: {
      brain,
      research,
      autonomy,
      surfaces,
      deployment,
      operations,
      expansion
    },
    metrics: {
      routes,
      pages,
      libs,
      scripts,
      filesTracked: tree.length
    },
    executionQueue: strategy.executionQueue || [],
    nextWave,
    blockers: deployment < 100 ? ["External GoDaddy automation blocked by current plan"] : [],
    time: new Date().toISOString()
  };

  writeJson(INTEL_FILE, result);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-intelligence-core.mjs")) {
  console.log(JSON.stringify(runIntelligenceCycle(), null, 2));
}
