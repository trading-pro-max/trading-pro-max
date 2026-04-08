import fs from "fs";
import path from "path";
import { runWorkspaceSync } from "./tpm-workspace-sync.mjs";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const FILE = path.join(TPM, "expansion-runtime.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function readJson(file, fallback){ try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function pct(have,total){ return total===0 ? 0 : Math.round((have/total)*100); }

export function runExpansionCycle(){
  const sync = runWorkspaceSync();

  const desktopSignals = [
    exists("app/desktop-hq/page.js"),
    exists("desktop/README.md"),
    exists("desktop/config.json"),
    exists("app/expansion-center/page.js")
  ];

  const mobileSignals = [
    exists("app/mobile-hq/page.js"),
    exists("mobile-private/README.md"),
    exists("mobile-private/config.json"),
    exists("app/expansion-center/page.js")
  ];

  const notificationSignals = [
    exists("data/notifications/bridge.json"),
    exists("app/api/expansion/status/route.js"),
    exists("app/api/expansion/run/route.js")
  ];

  const packagingSignals = [
    exists("lib/tpm-expansion-core.mjs"),
    exists("scripts/tpm-expansion-loop.mjs"),
    exists("lib/tpm-workspace-sync.mjs")
  ];

  const docsSignals = [
    exists("docs"),
    exists("desktop/README.md"),
    exists("mobile-private/README.md")
  ];

  const desktop = pct(desktopSignals.filter(Boolean).length, desktopSignals.length);
  const mobile = pct(mobileSignals.filter(Boolean).length, mobileSignals.length);
  const notifications = pct(notificationSignals.filter(Boolean).length, notificationSignals.length);
  const packaging = pct(packagingSignals.filter(Boolean).length, packagingSignals.length);
  const docs = pct(docsSignals.filter(Boolean).length, docsSignals.length);

  const overallProgress = Math.round((desktop + mobile + notifications + packaging + docs) / 5);
  const result = {
    ok: true,
    mode: "TPM_EXPANSION_ACTIVE",
    overallProgress,
    completed: overallProgress,
    remaining: Math.max(0, 100 - overallProgress),
    domains: {
      desktop,
      mobile,
      notifications,
      packaging,
      docs
    },
    workspaceSync: sync,
    nextWave: [
      { slug:"desktop-runtime", title:"desktop runtime", progress: desktop, status: desktop >= 75 ? "strong" : "building" },
      { slug:"mobile-runtime", title:"mobile runtime", progress: mobile, status: mobile >= 75 ? "strong" : "building" },
      { slug:"notification-bridge", title:"notification bridge", progress: notifications, status: notifications >= 75 ? "strong" : "building" }
    ],
    time: new Date().toISOString()
  };

  writeJson(FILE, result);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-expansion-core.mjs")) {
  console.log(JSON.stringify(runExpansionCycle(), null, 2));
}
