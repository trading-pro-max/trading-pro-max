import { runHyperCycle } from "../lib/tpm-hyper-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runHyperCycle();
  await sleep(90000);
}
