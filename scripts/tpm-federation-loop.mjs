import { runFederationCycle } from "../lib/tpm-federation-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runFederationCycle();
  await sleep(90000);
}
