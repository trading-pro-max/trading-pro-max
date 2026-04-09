import { runHyperJumpCycle } from "../lib/tpm-hyperjump-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runHyperJumpCycle();
  await sleep(60000);
}
