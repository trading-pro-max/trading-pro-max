import { runContinuumCycle } from "../lib/tpm-continuum-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runContinuumCycle();
  await sleep(90000);
}
