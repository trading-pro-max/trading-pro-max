import { runExecutiveCycle } from "../lib/tpm-executive-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runExecutiveCycle();
  await sleep(90000);
}
