import { runJump4Cycle } from "../lib/tpm-jump4-core.mjs";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
while(true){ runJump4Cycle(); await sleep(90000); }
