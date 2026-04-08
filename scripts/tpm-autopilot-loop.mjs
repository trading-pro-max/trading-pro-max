import { runAutopilotCycle } from "../lib/tpm-autopilot-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runAutopilotCycle();
  await sleep(120000);
}
