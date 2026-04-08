import { runNavigatorCycle } from "../lib/tpm-navigator-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runNavigatorCycle();
  await sleep(90000);
}
