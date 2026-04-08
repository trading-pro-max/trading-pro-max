import { runPlatformCycle } from "../lib/tpm-platform-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runPlatformCycle();
  await sleep(90000);
}
