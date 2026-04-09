import { runLiveIntegrationsCycle } from "../lib/tpm-live-integrations.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  await runLiveIntegrationsCycle();
  await sleep(90000);
}
