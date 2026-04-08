import { runEnterpriseCycle } from "../lib/tpm-enterprise-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runEnterpriseCycle();
  await sleep(90000);
}
