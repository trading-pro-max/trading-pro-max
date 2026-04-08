import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const FILE = path.join(TPM, "workspace-sync.json");

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function readJson(file, fallback){ try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }

export function runWorkspaceSync(){
  const current = readJson(FILE, {
    ok: true,
    cycle: 0,
    workspaces: 3,
    lastSyncAt: null,
    syncedZones: ["ai","strategy","intelligence","master"],
    status: "ACTIVE"
  });

  current.cycle = Number(current.cycle || 0) + 1;
  current.lastSyncAt = new Date().toISOString();
  current.status = "ACTIVE";

  writeJson(FILE, current);
  return current;
}
