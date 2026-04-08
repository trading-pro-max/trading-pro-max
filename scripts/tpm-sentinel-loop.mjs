import { runSentinelCycle } from "../lib/tpm-sentinel-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runSentinelCycle();
  await sleep(90000);
}
