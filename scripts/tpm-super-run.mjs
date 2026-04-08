import { runSuperCycle } from "../lib/tpm-super-orchestrator.mjs";

const result = runSuperCycle();
console.log(JSON.stringify(result, null, 2));
