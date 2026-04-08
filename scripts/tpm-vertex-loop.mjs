import { runVertexCycle } from "../lib/tpm-vertex-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runVertexCycle();
  await sleep(90000);
}
