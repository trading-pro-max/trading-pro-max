import { runAiCycle } from "../lib/tpm-ai-brain.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runAiCycle();
  await sleep(90000);
}
