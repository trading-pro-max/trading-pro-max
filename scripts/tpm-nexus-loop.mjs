import { runNexusCycle } from "../lib/tpm-nexus-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runNexusCycle();
  await sleep(90000);
}
