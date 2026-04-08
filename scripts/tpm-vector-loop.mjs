import { runVectorCycle } from "../lib/tpm-vector-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){ runVectorCycle(); await sleep(90000); }
