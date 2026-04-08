import { runAgentMeshCycle } from "../lib/tpm-agentmesh-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runAgentMeshCycle();
  await sleep(90000);
}
