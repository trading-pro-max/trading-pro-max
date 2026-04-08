import { runAtlasCycle } from "../lib/tpm-atlas-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runAtlasCycle();
  await sleep(90000);
}
