import { runProductionPromotion } from "../lib/tpm-production-promotion.mjs";

const result = runProductionPromotion();
console.log(JSON.stringify(result, null, 2));
