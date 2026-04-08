import { runMarketCycle } from "../lib/tpm-market-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runMarketCycle();
  await sleep(90000);
}
