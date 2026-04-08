import { runOmegaCycle } from "../lib/tpm-omega-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runOmegaCycle();
  await sleep(90000);
}
