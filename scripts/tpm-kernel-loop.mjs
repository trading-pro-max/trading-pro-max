import { runKernelCycle } from "../lib/tpm-kernel-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runKernelCycle();
  await sleep(90000);
}
