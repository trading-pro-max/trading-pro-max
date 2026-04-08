import { runZenithCycle } from "../lib/tpm-zenith-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runZenithCycle();
  await sleep(90000);
}
