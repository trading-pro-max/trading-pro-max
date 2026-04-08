import { runApexCycle } from "../lib/tpm-apex-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runApexCycle();
  await sleep(90000);
}
