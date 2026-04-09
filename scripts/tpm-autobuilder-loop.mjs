import { runAutonomousBuilderCycle } from "../lib/tpm-autobuilder-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runAutonomousBuilderCycle();
  await sleep(60000);
}
