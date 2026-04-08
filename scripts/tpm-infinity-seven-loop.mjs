import { runInfinitySevenCycle } from "../lib/tpm-infinity-seven-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runInfinitySevenCycle();
  await sleep(90000);
}
