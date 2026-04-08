import { runAutonomousCoreCycle } from "../lib/tpm-autonomous-core.mjs";

const result = runAutonomousCoreCycle();
console.log(JSON.stringify(result, null, 2));
