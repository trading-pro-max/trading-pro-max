import { runSimulationCycle } from "../lib/tpm-simulation-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runSimulationCycle();
  await sleep(90000);
}
