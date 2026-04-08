import { getManifest } from "../lib/tpm-runtime.mjs";

const manifest = getManifest();
console.log("TPM manifest OK:", manifest.modules.length, "modules.");
