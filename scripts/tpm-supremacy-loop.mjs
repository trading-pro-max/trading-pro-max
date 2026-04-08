import { runSupremacyCycle } from "../lib/tpm-supremacy-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runSupremacyCycle();
  await sleep(90000);
}
