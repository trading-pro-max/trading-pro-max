import { runMetaCycle } from "../lib/tpm-meta-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){ runMetaCycle(); await sleep(90000); }
