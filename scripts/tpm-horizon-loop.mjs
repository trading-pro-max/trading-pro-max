import { runHorizonCycle } from "../lib/tpm-horizon-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runHorizonCycle();
  await sleep(90000);
}
