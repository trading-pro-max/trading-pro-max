import { runRemotePromotion } from "../lib/tpm-remote-promotion.mjs";

const result = runRemotePromotion();
console.log(JSON.stringify(result, null, 2));
