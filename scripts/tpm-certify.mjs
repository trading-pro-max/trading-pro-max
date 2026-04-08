import { runCertificationNow } from "../lib/tpm-certification.mjs";

const result = runCertificationNow();
console.log(JSON.stringify(result, null, 2));
