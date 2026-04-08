import { runQuantumCycle } from "../lib/tpm-quantum-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runQuantumCycle();
  await sleep(90000);
}
