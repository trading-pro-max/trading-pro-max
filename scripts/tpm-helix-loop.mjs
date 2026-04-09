import { runHelixCycle } from "../lib/tpm-helix-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){ runHelixCycle(); await sleep(90000); }
