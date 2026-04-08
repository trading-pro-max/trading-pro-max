import { runLaunchRuntimeCycle } from "../lib/tpm-launch-runtime.mjs";

const result = runLaunchRuntimeCycle();
console.log(JSON.stringify(result, null, 2));
