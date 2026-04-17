import { CANONICAL_OPERATOR_MODULE_SURFACES } from "../../lib/tpm-operator-desk-contract.mjs";

const CANONICAL_MODULE_HANDOFFS = {
  "market-intelligence": "Feeds qualified market context into Strategy Lab.",
  "strategy-lab": "Converts market context into executable routes.",
  "execution-center": "Moves approved routes into controlled execution.",
  "risk-control": "Blocks unsafe execution and enforces session posture.",
  "ai-copilot": "Translates runtime state into operator guidance.",
  "journal-vault": "Captures outcomes and feeds review back into the desk."
};

export const coreModules = CANONICAL_OPERATOR_MODULE_SURFACES.map((surface) => ({
  key: surface.key,
  href: surface.href,
  label: surface.label,
  tone: surface.key === "risk-control" ? "danger" : surface.key === "execution-center" ? "warning" : surface.key === "journal-vault" ? "neutral" : surface.key === "market-intelligence" ? "success" : "info",
  summary: surface.summary,
  handoff: CANONICAL_MODULE_HANDOFFS[surface.key] || "Supports the shared operator desk."
}));

export const productEntryPoints = {
  workspace: "/",
  modules: coreModules.map(({ href, label }) => ({ href, label })),
  runtimeApis: [
    { href: "/api/system/overview", label: "System Overview API" },
    { href: "/api/product/status", label: "Product Status API" },
    { href: "/api/market/status", label: "Market Status API" },
    { href: "/api/strategy/status", label: "Strategy Status API" },
    { href: "/api/control/state", label: "Risk Control State API" }
  ]
};

export const architectureTracks = [
  {
    title: "Desktop Product Shell",
    description: "Keep the root workspace and six core modules as the only canonical trader-facing routes."
  },
  {
    title: "Shared Module Scaffolding",
    description: "Centralize module metadata, layout patterns, and responsive panels inside private product components."
  },
  {
    title: "Runtime-backed Data Seams",
    description: "Read from local runtime JSON now, then graduate the highest-value views behind stable route handlers."
  }
];

export function getCoreModuleByHref(href) {
  return coreModules.find((item) => item.href === href) || null;
}
