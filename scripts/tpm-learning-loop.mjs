import { runLearningCycle } from "../lib/tpm-learning-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runLearningCycle();
  await sleep(90000);
}
