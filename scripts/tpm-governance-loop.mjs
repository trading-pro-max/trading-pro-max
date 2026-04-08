import { runGovernanceCycle } from "../lib/tpm-governance-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runGovernanceCycle();
  await sleep(90000);
}
