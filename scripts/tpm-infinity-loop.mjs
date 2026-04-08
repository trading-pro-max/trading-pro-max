import { runInfinityCycle } from "../lib/tpm-infinity-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runInfinityCycle();
  await sleep(60000);
}
