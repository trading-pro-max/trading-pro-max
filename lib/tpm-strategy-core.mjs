import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const AI_FILE = path.join(TPM, "ai-runtime.json");
const STRATEGY_FILE = path.join(TPM, "strategy-runtime.json");
const QUEUE_FILE = path.join(TPM, "execution-queue.json");
const MANIFEST_FILE = path.join(TPM, "strategy-manifest.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(p){ return fs.existsSync(p); }
function readJson(file, fallback){ try{ if(exists(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function pct(have,total){ return total===0 ? 0 : Math.round((have/total)*100); }

function defaultManifest(){
  return {
    version: 1,
    project: "Trading Pro Max",
    target: "Global #1 AI autonomous trading platform",
    tracks: [
      "AI engine",
      "Execution surfaces",
      "Research + strategy",
      "Autonomy + builder",
      "Deployment + growth"
    ]
  };
}

function signal(file){ return exists(path.join(ROOT, file)); }

function collectSignals(){
  return {
    aiControl: signal("app/ai-control/page.js"),
    missionControl: signal("app/mission-control/page.js"),
    launchpad: signal("app/launchpad/page.js"),
    localCommand: signal("app/local-command/page.js"),
    strategyLab: signal("app/strategy-lab/page.js"),
    aiStatusApi: signal("app/api/ai/status/route.js"),
    aiRunApi: signal("app/api/ai/run/route.js"),
    strategyStatusApi: signal("app/api/strategy/status/route.js"),
    strategyRunApi: signal("app/api/strategy/run/route.js"),
    autobind: signal("scripts/tpm-universal-autobind.ps1"),
    aiLoop: signal("scripts/tpm-ai-loop.mjs"),
    strategyLoop: signal("scripts/tpm-strategy-loop.mjs"),
    godaddySftpWorkflow: signal(".github/workflows/tpm-godaddy-sftp-deploy.yml"),
    git: signal(".git"),
    github: signal(".github/workflows"),
    logs: signal(".tpm"),
    ops: signal("ops"),
    mobile: signal("mobile-private"),
    desktop: signal("desktop"),
    docs: signal("docs"),
    data: signal("data")
  };
}

function scoreDomains(s){
  const core = pct([
    s.aiControl,s.aiStatusApi,s.aiRunApi,s.aiLoop,s.strategyLab,s.strategyStatusApi,s.strategyRunApi,s.strategyLoop
  ].filter(Boolean).length,8);

  const surfaces = pct([
    s.missionControl,s.launchpad,s.localCommand,s.aiControl,s.strategyLab
  ].filter(Boolean).length,5);

  const autonomy = pct([
    s.autobind,s.aiLoop,s.strategyLoop,s.git,s.github,s.logs,s.ops
  ].filter(Boolean).length,7);

  const deployment = pct([
    s.godaddySftpWorkflow,s.git,s.github
  ].filter(Boolean).length,3);

  const expansion = pct([
    s.mobile,s.desktop,s.docs,s.data
  ].filter(Boolean).length,4);

  return { core, surfaces, autonomy, deployment, expansion };
}

function buildQueue(domainScores){
  const queue = [];

  if(domainScores.core < 100){
    queue.push(
      { slug:"ai-research-memory", title:"AI research memory", lane:"AI Engine", priority:"P1", progress:72, impact:"high", status:"active" },
      { slug:"signal-sandbox", title:"Signal sandbox", lane:"Research", priority:"P1", progress:58, impact:"high", status:"next" },
      { slug:"strategy-ranking", title:"Strategy ranking engine", lane:"Research", priority:"P1", progress:54, impact:"high", status:"next" }
    );
  }

  if(domainScores.surfaces < 100){
    queue.push(
      { slug:"operator-shell", title:"Operator shell expansion", lane:"Surface", priority:"P1", progress:66, impact:"high", status:"active" },
      { slug:"analytics-wall", title:"Analytics wall", lane:"Surface", priority:"P2", progress:43, impact:"medium", status:"next" }
    );
  }

  if(domainScores.autonomy < 100){
    queue.push(
      { slug:"autonomous-routing", title:"Autonomous routing", lane:"Autonomy", priority:"P1", progress:61, impact:"high", status:"active" },
      { slug:"self-healing-jobs", title:"Self-healing jobs", lane:"Autonomy", priority:"P2", progress:48, impact:"high", status:"next" }
    );
  }

  if(domainScores.deployment < 100){
    queue.push(
      { slug:"external-deploy-wait", title:"External deploy waiting on hosting plan", lane:"Deployment", priority:"P0", progress:35, impact:"blocked", status:"blocked" }
    );
  }

  if(domainScores.expansion < 100){
    queue.push(
      { slug:"desktop-skeleton", title:"Desktop skeleton", lane:"Expansion", priority:"P2", progress:30, impact:"medium", status:"next" },
      { slug:"mobile-skeleton", title:"Mobile skeleton", lane:"Expansion", priority:"P2", progress:24, impact:"medium", status:"next" }
    );
  }

  return queue;
}

export function runStrategyCycle(){
  ensureDir(TPM);

  const manifest = readJson(MANIFEST_FILE, defaultManifest());
  if(!exists(MANIFEST_FILE)) writeJson(MANIFEST_FILE, manifest);

  const ai = readJson(AI_FILE, {
    overallProgress: 68,
    completed: 68,
    remaining: 32,
    domains: { autonomy:100, ai:74, surface:70, deployment:35, operations:80 }
  });

  const signals = collectSignals();
  const domains = scoreDomains(signals);
  const queue = buildQueue(domains);

  const overall = Math.round((
    Number(ai.overallProgress || 68) +
    domains.core +
    domains.surfaces +
    domains.autonomy +
    domains.deployment +
    domains.expansion
  ) / 6);

  const result = {
    ok: true,
    mode: "TPM_STRATEGY_ACTIVE",
    project: manifest.project,
    target: manifest.target,
    overallProgress: overall,
    completed: overall,
    remaining: Math.max(0,100-overall),
    domains,
    activeMission: queue[0] || null,
    executionQueue: queue,
    recommendations: [
      "Continue internal AI and research layers without waiting for hosting upgrade",
      "Expand operator surfaces and analytics depth",
      "Keep external deployment prepared and blocked-state tracked",
      "Push GitHub-centered autonomous sync on every major jump"
    ],
    time: new Date().toISOString()
  };

  writeJson(QUEUE_FILE, queue);
  writeJson(STRATEGY_FILE, result);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-strategy-core.mjs")) {
  console.log(JSON.stringify(runStrategyCycle(), null, 2));
}
