import { runFinalLaunchCycle, promoteFinalLaunch, certifyGlobal100 } from "../lib/tpm-final-launch.mjs";

const cycle = runFinalLaunchCycle();
const promote = promoteFinalLaunch();
const certify = certifyGlobal100();

console.log(JSON.stringify({
  cycle,
  promote,
  certify
}, null, 2));
