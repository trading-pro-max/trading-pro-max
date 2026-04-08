import { runConstellationCycle } from "../lib/tpm-constellation-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runConstellationCycle();
  await sleep(90000);
}
