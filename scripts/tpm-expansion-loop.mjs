import { runExpansionCycle } from "../lib/tpm-expansion-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runExpansionCycle();
  await sleep(90000);
}
