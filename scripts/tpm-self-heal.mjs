import { getManifest, getState, ensureDb, createSnapshot } from "../lib/tpm-runtime.mjs";

getManifest();
getState();
ensureDb();
createSnapshot("self-heal");
console.log("TPM self-heal OK.");
