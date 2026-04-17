import { getManifest } from "../lib/tpm-runtime.mjs";
import { CANONICAL_DESK_ROUTES, runCanonicalRouteSmoke } from "./tpm-canonical-routes-smoke.mjs";
import { runOperatorDeskValidation } from "./tpm-operator-desk-validate.mjs";

const args = new Set(process.argv.slice(2));
const includeCanonicalRoutes =
  args.has("--canonical") ||
  args.has("--canonical-routes") ||
  process.env.TPM_VALIDATE_CANONICAL_ROUTES === "1";
const machineReadable =
  args.has("--json") ||
  args.has("--machine-readable") ||
  process.env.TPM_VALIDATE_OUTPUT === "json";

function validateManifest() {
  try {
    const manifest = getManifest();

    if (!manifest || typeof manifest !== "object") {
      throw new Error("manifest is missing");
    }
    if (!Array.isArray(manifest.modules)) {
      throw new Error("manifest modules are missing");
    }
    if (manifest.modules.length <= 0) {
      throw new Error("no product modules were found");
    }

    return {
      ok: true,
      status: "PASS",
      moduleCount: manifest.modules.length
    };
  } catch (error) {
    return {
      ok: false,
      status: "FAIL",
      moduleCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function getSkippedCanonicalSummary() {
  return {
    ok: null,
    status: "SKIPPED",
    included: false,
    routeCount: CANONICAL_DESK_ROUTES.length,
    passedCount: 0,
    failedCount: 0,
    note: `use --canonical-routes for ${CANONICAL_DESK_ROUTES.length}-route coverage`
  };
}

function getNotRunCanonicalSummary(reason) {
  return {
    ok: false,
    status: "NOT_RUN",
    included: true,
    routeCount: CANONICAL_DESK_ROUTES.length,
    passedCount: 0,
    failedCount: CANONICAL_DESK_ROUTES.length,
    error: reason
  };
}

function validateOperatorDesk() {
  try {
    const result = runOperatorDeskValidation({ summaryOnly: true });
    return {
      ok: result.ok,
      status: result.ok ? "PASS" : "FAIL",
      surfaceCount: result.surfaceCount,
      moduleSurfaceCount: result.moduleSurfaceCount,
      checkCount: result.checkCount,
      passedCount: result.passedCount,
      failedCount: result.failedCount,
      failures: result.failures,
      error: result.error
    };
  } catch (error) {
    return {
      ok: false,
      status: "FAIL",
      surfaceCount: 0,
      moduleSurfaceCount: 0,
      checkCount: 0,
      passedCount: 0,
      failedCount: 0,
      failures: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function validateCanonicalRoutes() {
  try {
    const result = await runCanonicalRouteSmoke({ summaryOnly: true });
    return {
      ok: result.ok,
      status: result.ok ? "PASS" : "FAIL",
      included: true,
      routeCount: result.routeCount,
      passedCount: result.passedCount,
      failedCount: result.failedCount,
      reusedExistingServer: result.reusedExistingServer,
      failures: result.failures
    };
  } catch (error) {
    return {
      ok: false,
      status: "FAIL",
      included: true,
      routeCount: CANONICAL_DESK_ROUTES.length,
      passedCount: 0,
      failedCount: CANONICAL_DESK_ROUTES.length,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function buildValidationSummary({ manifest, operatorDesk, canonicalRoutes }) {
  const overallOk =
    manifest.ok &&
    operatorDesk.ok &&
    (canonicalRoutes.status === "SKIPPED" || canonicalRoutes.status === "PASS");

  return {
    product: "Trading Pro Max",
    scope: "local",
    manifest,
    operatorDesk,
    canonicalRoutes,
    overall: {
      ok: overallOk,
      status: overallOk ? "PASS" : "FAIL"
    }
  };
}

function printHumanSummary({ manifest, operatorDesk, canonicalRoutes, includeCanonicalCoverage }) {
  const lines = [
    "",
    "TPM Validation Summary",
    manifest.ok
      ? `Manifest: PASS | ${manifest.moduleCount} modules`
      : `Manifest: FAIL | ${manifest.error}`,
    operatorDesk.ok
      ? `Operator Desk Shell: PASS | ${operatorDesk.passedCount}/${operatorDesk.checkCount} checks | ${operatorDesk.surfaceCount} surfaces`
      : `Operator Desk Shell: FAIL | ${operatorDesk.error || `${operatorDesk.failedCount}/${operatorDesk.checkCount} checks failed`}`,
    includeCanonicalCoverage
      ? canonicalRoutes.ok
        ? `Canonical Desk Routes: PASS | ${canonicalRoutes.passedCount}/${canonicalRoutes.routeCount} routes`
        : `Canonical Desk Routes: FAIL | ${canonicalRoutes.error || `${canonicalRoutes.failedCount}/${canonicalRoutes.routeCount} routes failed`}`
      : `Canonical Desk Routes: SKIPPED | use --canonical-routes for ${CANONICAL_DESK_ROUTES.length}-route coverage`,
    `Overall: ${manifest.ok && operatorDesk.ok && (!includeCanonicalCoverage || canonicalRoutes.ok) ? "PASS" : "FAIL"} | local Trading Pro Max validation`
  ];

  console.log(lines.join("\n"));
}

const manifest = validateManifest();
const operatorDesk = validateOperatorDesk();
const canonicalRoutes = includeCanonicalRoutes
  ? manifest.ok
    ? await validateCanonicalRoutes()
    : getNotRunCanonicalSummary("manifest validation failed before canonical route coverage could run")
  : getSkippedCanonicalSummary();

const summary = buildValidationSummary({
  manifest,
  operatorDesk,
  canonicalRoutes
});

if (machineReadable) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printHumanSummary({
    manifest,
    operatorDesk,
    canonicalRoutes,
    includeCanonicalCoverage: includeCanonicalRoutes
  });
}

if (!summary.overall.ok) {
  process.exitCode = 1;
}
