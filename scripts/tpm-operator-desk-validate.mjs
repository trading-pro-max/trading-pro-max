import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_OPERATOR_DESK_SURFACES,
  CANONICAL_OPERATOR_MODULE_SURFACES
} from "../lib/tpm-operator-desk-contract.mjs";

const ROOT = process.cwd();
const EXPECTED_CANONICAL_HREFS = [
  "/",
  "/market-intelligence",
  "/execution-center",
  "/risk-control",
  "/ai-copilot",
  "/journal-vault",
  "/strategy-lab"
];

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function createCheck({ key, label, ok, detail, surfaceHref = null }) {
  return {
    key,
    label,
    ok,
    status: ok ? "PASS" : "FAIL",
    detail,
    surfaceHref
  };
}

function validateSourceIncludes(relativePath, expectedSnippets) {
  const source = readSource(relativePath);
  return expectedSnippets.every((snippet) => source.includes(snippet));
}

function buildSurfaceChecks() {
  return CANONICAL_OPERATOR_DESK_SURFACES.map((surface) => {
    if (surface.shell === "home-base") {
      const routeOk = validateSourceIncludes(surface.pageFile, ["HomeBaseWorkspace"]);
      const workspaceOk = validateSourceIncludes("app/_components/HomeBaseWorkspace.js", [
        "OperatorDeskAcceptancePanel",
        "Operator Desk Acceptance",
        "Day Open / Day Close Workflow"
      ]);

      return createCheck({
        key: `surface-${surface.key}`,
        label: `${surface.label} shell`,
        ok: routeOk && workspaceOk,
        detail: routeOk && workspaceOk
          ? "Home Base route keeps the shared workspace and the acceptance/readiness shell."
          : "Home Base is missing the shared workspace or acceptance/readiness shell markers.",
        surfaceHref: surface.href
      });
    }

    if (surface.shell === "execution-shell") {
      const ok = validateSourceIncludes(surface.pageFile, [
        "DeskSummaryPanel",
        "OperatorDeskAcceptancePanel",
        "ExecutionTerminal"
      ]);

      return createCheck({
        key: `surface-${surface.key}`,
        label: `${surface.label} shell`,
        ok,
        detail: ok
          ? "Execution Center keeps the shared desk summary, acceptance panel, and execution terminal."
          : "Execution Center shell no longer exposes the shared summary, acceptance, and terminal composition.",
        surfaceHref: surface.href
      });
    }

    const ok = validateSourceIncludes(surface.pageFile, ["ProductModulePage"]);
    return createCheck({
      key: `surface-${surface.key}`,
      label: `${surface.label} shell`,
      ok,
      detail: ok
        ? `${surface.label} stays on the canonical shared module wrapper.`
        : `${surface.label} no longer routes through the canonical shared module wrapper.`,
      surfaceHref: surface.href
    });
  });
}

export function runOperatorDeskValidation({ summaryOnly = false } = {}) {
  try {
    const contractHrefs = CANONICAL_OPERATOR_DESK_SURFACES.map((surface) => surface.href);
    const uniqueContractHrefs = new Set(contractHrefs);
    const expectedHrefSet = new Set(EXPECTED_CANONICAL_HREFS);
    const allExpectedPresent = EXPECTED_CANONICAL_HREFS.every((href) => uniqueContractHrefs.has(href));
    const noUnexpectedRoutes = [...uniqueContractHrefs].every((href) => expectedHrefSet.has(href));

    const checks = [
      createCheck({
        key: "contract-surface-count",
        label: "Canonical surface count",
        ok: CANONICAL_OPERATOR_DESK_SURFACES.length === EXPECTED_CANONICAL_HREFS.length,
        detail: `${CANONICAL_OPERATOR_DESK_SURFACES.length}/${EXPECTED_CANONICAL_HREFS.length} canonical surfaces declared`
      }),
      createCheck({
        key: "contract-surface-coverage",
        label: "Canonical surface coverage",
        ok: allExpectedPresent && noUnexpectedRoutes,
        detail: allExpectedPresent && noUnexpectedRoutes
          ? "Canonical contract covers the accepted Home Base desk routes."
          : "Canonical contract routes drifted from the accepted Home Base desk list."
      }),
      createCheck({
        key: "contract-surface-uniqueness",
        label: "Canonical route uniqueness",
        ok: uniqueContractHrefs.size === contractHrefs.length,
        detail: `${uniqueContractHrefs.size}/${contractHrefs.length} unique canonical route entries`
      }),
      createCheck({
        key: "module-surface-count",
        label: "Canonical module count",
        ok: CANONICAL_OPERATOR_MODULE_SURFACES.length === EXPECTED_CANONICAL_HREFS.length - 1,
        detail: `${CANONICAL_OPERATOR_MODULE_SURFACES.length}/${EXPECTED_CANONICAL_HREFS.length - 1} module surfaces declared`
      }),
      createCheck({
        key: "product-modules-contract",
        label: "Shared module metadata",
        ok: validateSourceIncludes("app/_components/product-modules.js", ["CANONICAL_OPERATOR_MODULE_SURFACES"]),
        detail: "Core module metadata is sourced from the shared operator desk contract."
      }),
      createCheck({
        key: "desk-summary-command-language",
        label: "Desk summary command language",
        ok: validateSourceIncludes("app/_components/DeskSummaryPanel.js", [
          "Home Base Desk Summary",
          "Resume Desk",
          "Priority Module Switches"
        ]),
        detail: "Shared desk summary keeps the command posture, resume framing, and ranked switch rail."
      }),
      createCheck({
        key: "module-wrapper-acceptance",
        label: "Canonical module wrapper",
        ok: validateSourceIncludes("app/_components/ProductModulePage.js", [
          "DeskSummaryPanel",
          "OperatorDeskAcceptancePanel"
        ]),
        detail: "Shared module wrapper keeps the desk summary and compact acceptance layer together."
      }),
      ...buildSurfaceChecks()
    ];

    const failures = checks.filter((check) => !check.ok);
    const result = {
      ok: failures.length === 0,
      status: failures.length === 0 ? "PASS" : "FAIL",
      surfaceCount: CANONICAL_OPERATOR_DESK_SURFACES.length,
      moduleSurfaceCount: CANONICAL_OPERATOR_MODULE_SURFACES.length,
      checkCount: checks.length,
      passedCount: checks.length - failures.length,
      failedCount: failures.length,
      failures,
      checks
    };

    if (!summaryOnly) {
      console.log(
        `Operator desk shell: ${result.ok ? "PASS" : "FAIL"} | ${result.passedCount}/${result.checkCount} checks | ${result.surfaceCount} surfaces`
      );
      failures.forEach((failure) => {
        console.error(`- ${failure.label}: ${failure.detail}`);
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!summaryOnly) {
      console.error(`Operator desk shell: FAIL | ${message}`);
    }

    return {
      ok: false,
      status: "FAIL",
      surfaceCount: CANONICAL_OPERATOR_DESK_SURFACES.length,
      moduleSurfaceCount: CANONICAL_OPERATOR_MODULE_SURFACES.length,
      checkCount: 0,
      passedCount: 0,
      failedCount: 0,
      error: message,
      failures: [],
      checks: []
    };
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
const isDirectRun = invokedPath === modulePath;

if (isDirectRun) {
  const args = new Set(process.argv.slice(2));
  const result = runOperatorDeskValidation({
    summaryOnly: args.has("--summary-only")
  });

  if (args.has("--summary-only")) {
    console.log(
      `Operator desk shell: ${result.ok ? "PASS" : "FAIL"} | ${result.passedCount}/${result.checkCount} checks | ${result.surfaceCount} surfaces`
    );
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}
