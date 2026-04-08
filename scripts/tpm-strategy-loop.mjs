import { runStrategyCycle } from "../lib/tpm-strategy-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runStrategyCycle();
  await sleep(90000);
}
