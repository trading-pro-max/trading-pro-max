import { runOrchestratorCycle } from "../lib/tpm-orchestrator-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runOrchestratorCycle();
  await sleep(90000);
}
