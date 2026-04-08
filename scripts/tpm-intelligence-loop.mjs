import { runIntelligenceCycle } from "../lib/tpm-intelligence-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runIntelligenceCycle();
  await sleep(90000);
}
