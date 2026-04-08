import { runRuntimeOpsCycle } from "../lib/tpm-runtimeops-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runRuntimeOpsCycle();
  await sleep(90000);
}
