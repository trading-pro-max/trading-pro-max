import { runLiveBridgeCycle } from "../lib/tpm-live-bridge-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runLiveBridgeCycle();
  await sleep(90000);
}
