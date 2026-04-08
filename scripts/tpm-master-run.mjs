import { runMasterCycle } from "../lib/tpm-master.mjs";

const result = runMasterCycle();
console.log(JSON.stringify(result, null, 2));
