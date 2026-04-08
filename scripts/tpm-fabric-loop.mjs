import { runFabricCycle } from "../lib/tpm-fabric-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runFabricCycle();
  await sleep(90000);
}
