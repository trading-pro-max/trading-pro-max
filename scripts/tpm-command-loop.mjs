import { runCommandCycle } from "../lib/tpm-command-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runCommandCycle();
  await sleep(90000);
}
