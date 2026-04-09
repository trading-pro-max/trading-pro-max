import { runBridgeCycle } from "../lib/tpm-bridge-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runBridgeCycle();
  await sleep(90000);
}
