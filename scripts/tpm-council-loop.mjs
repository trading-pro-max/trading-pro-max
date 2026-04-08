import { runCouncilCycle } from "../lib/tpm-council-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runCouncilCycle();
  await sleep(90000);
}
