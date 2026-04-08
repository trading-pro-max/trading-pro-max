import { runPulseCycle } from "../lib/tpm-pulse-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runPulseCycle();
  await sleep(90000);
}
