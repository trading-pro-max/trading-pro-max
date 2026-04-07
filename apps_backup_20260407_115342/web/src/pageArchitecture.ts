export const phaseOnePages = {
  percent: 50,
  sections: [
    { title: "Core Shell", pages: ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/onboarding", "/app", "/dashboard", "/notifications", "/search", "/settings"] },
    { title: "Trader Workspace", pages: ["/markets", "/markets/forex", "/markets/crypto", "/markets/indices", "/markets/commodities", "/watchlist", "/calendar", "/news", "/signals", "/scanner", "/chart", "/workspace"] },
    { title: "Strategy + AI", pages: ["/strategy-lab", "/strategy-lab/builder", "/strategy-lab/backtests", "/strategy-lab/optimizer", "/strategy-lab/compare", "/strategy-lab/templates", "/ai-copilot", "/ai-copilot/chat", "/ai-copilot/insights", "/ai-copilot/recommendations", "/ai-copilot/daily-brief"] }
  ]
};

export const phaseTwoPages = {
  percent: 50,
  sections: [
    { title: "Portfolio + Risk", pages: ["/portfolio", "/portfolio/positions", "/portfolio/orders", "/portfolio/history", "/portfolio/performance", "/portfolio/journal", "/risk", "/risk/exposure", "/risk/drawdown", "/risk/limits", "/risk/anomalies", "/risk/kill-switch"] },
    { title: "Revenue + Client Area", pages: ["/pricing", "/plans", "/checkout", "/billing", "/billing/invoices", "/billing/payment-methods", "/billing/subscription", "/billing/usage", "/referrals", "/account", "/account/profile", "/account/security", "/account/sessions"] },
    { title: "Ops + Admin + Trust", pages: ["/ops", "/ops/runtime", "/ops/services", "/ops/incidents", "/ops/logs", "/ops/monitoring", "/ops/deployments", "/ops/backups", "/admin", "/admin/users", "/admin/plans", "/admin/permissions", "/admin/flags", "/admin/audits", "/help-center", "/support", "/docs", "/status", "/security", "/privacy", "/terms", "/compliance", "/about", "/contact", "/partners", "/affiliate", "/api-docs"] }
  ]
};
