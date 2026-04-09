import { runActiveCycle } from "../lib/tpm-active-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runActiveCycle();
  await sleep(90000);
}
