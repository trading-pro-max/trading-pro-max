import { runAnalyticsCycle } from "../lib/tpm-analytics-core.mjs";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

while(true){
  runAnalyticsCycle();
  await sleep(90000);
}
