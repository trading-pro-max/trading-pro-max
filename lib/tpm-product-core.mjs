import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");

const PRODUCT_RUNTIME_FILE = path.join(TPM, "product-runtime.json");
const MASTER_FILE = path.join(TPM, "master-runtime.json");
const PRODUCT_DATA_FILE = path.join(ROOT, "data", "product", "runtime.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function readJson(file, fallback){
  try{
    if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{}
  return fallback;
}
function writeJson(file, value){
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8");
}

export function runProductCycle(){
  const master = readJson(MASTER_FILE, {
    overallProgress: 100,
    completed: 100,
    remaining: 0,
    releaseGate: "LOCAL_PRODUCT_BUILD",
    finalReadiness: "product-core-active"
  });

  const modules = [
    { slug:"market-intelligence", title:"Market Intelligence", progress: 92, status:"active", tone:"strong" },
    { slug:"strategy-lab", title:"Strategy Lab", progress: 90, status:"active", tone:"strong" },
    { slug:"execution-center", title:"Execution Center", progress: 88, status:"active", tone:"strong" },
    { slug:"risk-control", title:"Risk Control", progress: 94, status:"active", tone:"strong" },
    { slug:"ai-copilot", title:"AI Copilot", progress: 89, status:"active", tone:"strong" },
    { slug:"journal-vault", title:"Journal Vault", progress: 86, status:"active", tone:"strong" },
    { slug:"operator-workspace", title:"Operator Workspace", progress: 91, status:"active", tone:"strong" },
    { slug:"desktop-packaging", title:"Desktop Packaging", progress: 84, status:"active", tone:"watch" }
  ];

  const runtime = {
    ok: true,
    mode: "TPM_PRODUCT_CORE_ACTIVE",
    overallProgress: Math.round(modules.reduce((a,x)=>a+x.progress,0) / modules.length),
    completed: Math.round(modules.reduce((a,x)=>a+x.progress,0) / modules.length),
    remaining: 0,
    releaseGate: "LOCAL_PRODUCT_BUILD",
    finalReadiness: "product-core-active",
    masterProgress: master.overallProgress ?? 100,
    metrics: {
      activeModules: modules.length,
      executionRoutes: 24,
      signalStreams: 18,
      aiWorkflows: 12,
      riskGuards: 16,
      desktopReadiness: 84
    },
    modules,
    time: new Date().toISOString()
  };

  const productData = {
    ok: true,
    suites: [
      {
        title: "Market Intelligence",
        items: [
          "Watchlists and active symbols",
          "Momentum and structure zones",
          "Session overview and market posture",
          "Signal quality overview"
        ]
      },
      {
        title: "Strategy Lab",
        items: [
          "Strategy routes and qualification",
          "Confidence filters",
          "Execution readiness states",
          "Protected route selection"
        ]
      },
      {
        title: "Execution Center",
        items: [
          "Decision queue",
          "Operator actions",
          "Execution flow control",
          "Status monitoring"
        ]
      },
      {
        title: "Risk Control",
        items: [
          "Risk freeze layer",
          "Capital protection logic",
          "Session conflict suppression",
          "Emergency controls"
        ]
      },
      {
        title: "AI Copilot",
        items: [
          "Session summaries",
          "Route explanations",
          "Action guidance",
          "Workflow support"
        ]
      },
      {
        title: "Journal Vault",
        items: [
          "Trade logging",
          "Session memory",
          "Mistake tracking",
          "Performance notes"
        ]
      }
    ],
    feed: [
      { time:"09:30", text:"Product core initialized and workspace modules synchronized." },
      { time:"09:34", text:"Market intelligence refreshed priority assets and structure zones." },
      { time:"09:37", text:"AI copilot generated session brief and execution guidance." },
      { time:"09:41", text:"Risk control confirmed operator posture remains protected." },
      { time:"09:45", text:"Desktop packaging flagged for final runtime closure." }
    ],
    routes: [
      { name:"Trend Continuation", asset:"EUR/USD", confidence:"82%", state:"Qualified" },
      { name:"Index Momentum", asset:"NASDAQ", confidence:"79%", state:"Ready" },
      { name:"Breakout Compression", asset:"BTC/USD", confidence:"73%", state:"Watch" },
      { name:"Reversion Filter", asset:"XAU/USD", confidence:"68%", state:"Protected" }
    ],
    time: new Date().toISOString()
  };

  writeJson(PRODUCT_RUNTIME_FILE, runtime);
  writeJson(PRODUCT_DATA_FILE, productData);
  return runtime;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-product-core.mjs")) {
  console.log(JSON.stringify(runProductCycle(), null, 2));
}
