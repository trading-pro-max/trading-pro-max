import { runInfinity3Cycle } from "../lib/tpm-infinity3-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runInfinity3Cycle();
  await sleep(90000);
}
