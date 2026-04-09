import { runHyperGrowthCycle } from "../lib/tpm-hypergrowth-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runHyperGrowthCycle();
  await sleep(90000);
}
