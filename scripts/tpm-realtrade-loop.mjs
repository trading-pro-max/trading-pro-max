import { runRealTradeCycle } from "../lib/tpm-realtrade-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runRealTradeCycle();
  await sleep(90000);
}
