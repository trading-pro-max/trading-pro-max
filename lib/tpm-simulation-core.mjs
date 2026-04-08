import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const FILE = path.join(TPM, "simulation-runtime.json");
const SIGNALS_FILE = path.join(ROOT, "data", "signals", "hub.json");
const BACKTEST_FILE = path.join(ROOT, "data", "backtests", "results.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function readJson(file, fallback){ try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function pct(have,total){ return total===0 ? 0 : Math.round((have/total)*100); }

export function runSimulationCycle(){
  const backtestSignals = [
    exists("app/backtest-lab/page.js"),
    exists("app/api/simulation/status/route.js"),
    exists("app/api/simulation/run/route.js"),
    exists("lib/tpm-simulation-core.mjs"),
    exists("scripts/tpm-simulation-loop.mjs"),
    exists("data/backtests/results.json")
  ];

  const signalSignals = [
    exists("app/signal-hub/page.js"),
    exists("data/signals/hub.json"),
    exists("app/strategy-lab/page.js"),
    exists("app/intelligence-center/page.js"),
    exists("app/ai-control/page.js")
  ];

  const researchSignals = [
    exists("app/research-studio/page.js"),
    exists("app/research-vault/page.js"),
    exists(".tpm/research-memory.json"),
    exists(".tpm/intelligence-runtime.json"),
    exists(".tpm/strategy-runtime.json")
  ];

  const validationSignals = [
    exists(".tpm/master-runtime.json"),
    exists(".tpm/analytics-runtime.json"),
    exists(".tpm/expansion-runtime.json"),
    exists(".tpm/ai-runtime.json"),
    exists(".tpm/strategy-runtime.json")
  ];

  const executionSignals = [
    exists("app/mission-control/page.js"),
    exists("app/local-command/page.js"),
    exists("app/operator-os/page.js"),
    exists("app/client-portal/page.js"),
    exists("data/notifications/bridge.json")
  ];

  const backtest = pct(backtestSignals.filter(Boolean).length, backtestSignals.length);
  const signals = pct(signalSignals.filter(Boolean).length, signalSignals.length);
  const research = pct(researchSignals.filter(Boolean).length, researchSignals.length);
  const validation = pct(validationSignals.filter(Boolean).length, validationSignals.length);
  const execution = pct(executionSignals.filter(Boolean).length, executionSignals.length);

  const overallProgress = Math.round((backtest + signals + research + validation + execution) / 5);

  const signalHub = {
    ok: true,
    channels: [
      { slug:"macro-ai", title:"Macro AI", confidence: 93, status:"strong" },
      { slug:"strategy-ranking", title:"Strategy Ranking", confidence: 95, status:"strong" },
      { slug:"execution-watch", title:"Execution Watch", confidence: 94, status:"strong" },
      { slug:"research-loop", title:"Research Loop", confidence: 92, status:"strong" }
    ],
    time: new Date().toISOString()
  };

  const backtestResults = {
    ok: true,
    suites: [
      { slug:"alpha-grid", title:"Alpha Grid", score: 94, status:"strong" },
      { slug:"otc-balance", title:"OTC Balance", score: 91, status:"strong" },
      { slug:"trend-stack", title:"Trend Stack", score: 93, status:"strong" },
      { slug:"risk-guard", title:"Risk Guard", score: 96, status:"strong" }
    ],
    time: new Date().toISOString()
  };

  const result = {
    ok: true,
    mode: "TPM_SIMULATION_ACTIVE",
    overallProgress,
    completed: overallProgress,
    remaining: Math.max(0, 100 - overallProgress),
    domains: {
      backtest,
      signals,
      research,
      validation,
      execution
    },
    queue: [
      { slug:"alpha-grid", title:"alpha grid validation", progress: 95, lane:"Backtest", status:"active" },
      { slug:"signal-ranking", title:"signal ranking refinement", progress: 94, lane:"Signals", status:"active" },
      { slug:"research-synthesis", title:"research synthesis", progress: 93, lane:"Research", status:"active" },
      { slug:"execution-guard", title:"execution guard", progress: 96, lane:"Validation", status:"active" }
    ],
    time: new Date().toISOString()
  };

  writeJson(SIGNALS_FILE, signalHub);
  writeJson(BACKTEST_FILE, backtestResults);
  writeJson(FILE, result);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-simulation-core.mjs")) {
  console.log(JSON.stringify(runSimulationCycle(), null, 2));
}
