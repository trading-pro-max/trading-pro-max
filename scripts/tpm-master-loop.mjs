import { runMasterCycle } from "../lib/tpm-master-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runMasterCycle();
  await sleep(90000);
}
