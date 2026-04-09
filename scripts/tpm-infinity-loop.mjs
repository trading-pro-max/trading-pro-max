import { runInfinityCycle } from "../lib/tpm-infinity-core.mjs";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
while(true){ runInfinityCycle(); await sleep(90000); }
