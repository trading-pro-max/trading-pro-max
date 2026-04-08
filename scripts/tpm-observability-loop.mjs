import { runObservabilityCycle } from "../lib/tpm-observability-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runObservabilityCycle();
  await sleep(90000);
}
