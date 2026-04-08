import { runProductRuntimeCycle } from "../lib/tpm-product-runtime.mjs";

const result = runProductRuntimeCycle();
console.log(JSON.stringify(result, null, 2));
