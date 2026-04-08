import { runCloseAll } from "../lib/tpm-closing.mjs";

const result = runCloseAll();
console.log(JSON.stringify(result, null, 2));
