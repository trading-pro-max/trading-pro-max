export const coreModules = [
  {
    key: "market-intelligence",
    href: "/market-intelligence",
    label: "Market Intelligence",
    tone: "success",
    summary: "Live market posture, watchlists, and signal strength.",
    handoff: "Feeds qualified market context into Strategy Lab."
  },
  {
    key: "strategy-lab",
    href: "/strategy-lab",
    label: "Strategy Lab",
    tone: "info",
    summary: "Route design, qualification, and execution prep.",
    handoff: "Converts market context into executable routes."
  },
  {
    key: "execution-center",
    href: "/execution-center",
    label: "Execution Center",
    tone: "warning",
    summary: "Operator queue, lane state, and execution handoff.",
    handoff: "Moves approved routes into controlled execution."
  },
  {
    key: "risk-control",
    href: "/risk-control",
    label: "Risk Control",
    tone: "danger",
    summary: "Capital protection, freeze gates, and guardrails.",
    handoff: "Blocks unsafe execution and enforces session posture."
  },
  {
    key: "ai-copilot",
    href: "/ai-copilot",
    label: "AI Copilot",
    tone: "info",
    summary: "Trader-facing summaries, explanations, and handoffs.",
    handoff: "Translates runtime state into operator guidance."
  },
  {
    key: "journal-vault",
    href: "/journal-vault",
    label: "Journal Vault",
    tone: "neutral",
    summary: "Session memory, replay tracks, and reviewable logs.",
    handoff: "Captures outcomes and feeds review back into the desk."
  }
];

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
