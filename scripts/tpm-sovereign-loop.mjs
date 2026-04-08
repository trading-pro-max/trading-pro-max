import { runSovereignCycle } from "../lib/tpm-sovereign-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runSovereignCycle();
  await sleep(90000);
}
