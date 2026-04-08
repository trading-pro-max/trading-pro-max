import { runTradingCoreCycle } from "../lib/tpm-master-progress.mjs";

const result = runTradingCoreCycle();
console.log(JSON.stringify(result, null, 2));
