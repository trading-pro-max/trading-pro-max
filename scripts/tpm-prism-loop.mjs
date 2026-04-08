import { runPrismCycle } from "../lib/tpm-prism-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runPrismCycle();
  await sleep(90000);
}
