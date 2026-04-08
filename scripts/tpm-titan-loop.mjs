import { runTitanCycle } from "../lib/tpm-titan-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runTitanCycle();
  await sleep(90000);
}
