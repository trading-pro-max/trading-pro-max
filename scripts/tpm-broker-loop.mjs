import { runBrokerCycle } from "../lib/tpm-broker-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runBrokerCycle();
  await sleep(90000);
}
