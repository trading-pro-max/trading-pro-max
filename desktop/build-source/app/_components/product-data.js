import fs from "fs";
import path from "path";

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}

  return fallback;
}

export function getProductRuntime() {
  return readJson(path.join(process.cwd(), ".tpm", "product-runtime.json"), {
    ok: true,
    mode: "TPM_PRODUCT_CORE_ACTIVE",
    overallProgress: 89,
    releaseGate: "LOCAL_PRODUCT_BUILD",
    finalReadiness: "product-core-active",
    metrics: {
      activeModules: 8,
      executionRoutes: 24,
      signalStreams: 18,
      aiWorkflows: 12,
      riskGuards: 16,
      desktopReadiness: 84
    },
    modules: []
  });
}

export function getProductWorkspaceData() {
  return readJson(path.join(process.cwd(), "data", "product", "runtime.json"), {
    ok: true,
    suites: [],
    feed: [],
    routes: []
  });
}

export function getMarketIntelligenceData() {
  const stream = readJson(path.join(process.cwd(), "data", "market", "stream.json"), { feeds: [] });
  const workspace = getProductWorkspaceData();

  return {
    feeds: stream.feeds || [],
    watchlist: [
      { symbol: "EUR/USD", bias: "Bullish structure", confidence: "82%", note: "Trend strength is holding above London support." },
      { symbol: "NASDAQ", bias: "Momentum continuation", confidence: "79%", note: "Index leadership remains intact through the open." },
      { symbol: "BTC/USD", bias: "Breakout compression", confidence: "73%", note: "Compression band is close to an expansion trigger." },
      { symbol: "XAU/USD", bias: "Protected reversion", confidence: "68%", note: "Gold remains tactical and lower-conviction than FX and index flow." }
    ],
    feed: workspace.feed || []
  };
}

export function getStrategyLabData() {
  const runtime = readJson(path.join(process.cwd(), ".tpm", "strategy-runtime.json"), {
    overallProgress: 98,
    domains: {
      core: 100,
      surfaces: 100,
      autonomy: 100,
      deployment: 100,
      expansion: 100
    },
    recommendations: []
  });
  const workspace = getProductWorkspaceData();

  return {
    runtime,
    routes: workspace.routes || [],
    recommendations: runtime.recommendations || []
  };
}

export function getExecutionCenterData() {
  const runtime = readJson(path.join(process.cwd(), "data", "execution", "runtime.json"), {
    status: "ACTIVE",
    metrics: {},
    cards: []
  });
  const lanes = readJson(path.join(process.cwd(), "data", "execution", "core.json"), { lanes: [] });
  const intelligence = readJson(path.join(process.cwd(), "data", "execution", "intelligence.json"), {
    models: [],
    maps: {}
  });
  const workspace = getProductWorkspaceData();
  const risk = getRiskControlData();
  const portfolio = readJson(path.join(process.cwd(), "data", "portfolio", "runtime.json"), {
    allocations: [],
    totals: {}
  });
  const liveOps = readJson(path.join(process.cwd(), "data", "live", "ops.json"), {
    streams: [],
    watches: {}
  });
  const signals = readJson(path.join(process.cwd(), "data", "signals", "hub.json"), {
    channels: []
  });
  const market = getMarketIntelligenceData();
  const strategy = getStrategyLabData();

  const queue = [
    { task: "Promote qualified routes", status: "Running", owner: "Execution engine" },
    { task: "Sync operator confirmation", status: "Ready", owner: "Operator desk" },
    { task: "Reconcile spread-sensitive setups", status: "Watch", owner: "Risk lane" },
    { task: "Prepare paper-to-live handoff", status: "Blocked", owner: "Broker bridge" }
  ];

  const watchlist = (workspace.routes || []).map((route, index) => ({
    symbol: route.asset,
    strategy: route.name,
    last: [1.0824, 18276, 64320, 2348][index] || 1.1042 + index,
    change: ["+0.42%", "+1.18%", "+2.04%", "-0.36%"][index] || "+0.18%",
    status: route.state,
    confidence: route.confidence,
    bias: market.watchlist[index]?.bias || "Mixed",
    note: market.watchlist[index]?.note || "Monitoring live route conditions."
  }));

  const primaryRoute = workspace.routes?.[0] || {
    name: "Trend Continuation",
    asset: "EUR/USD",
    confidence: "82%",
    state: "Qualified"
  };

  const chart = {
    symbol: primaryRoute.asset,
    timeframe: "15m",
    points: [
      24, 28, 26, 31, 34, 33, 38, 42, 40, 44, 48, 46,
      49, 53, 57, 55, 59, 61, 64, 62, 68, 72, 70, 76
    ],
    levels: [
      { label: "VWAP", value: "1.0821", tone: "info" },
      { label: "Session High", value: "1.0848", tone: "success" },
      { label: "Session Low", value: "1.0796", tone: "danger" }
    ]
  };

  const orderTicket = {
    symbol: primaryRoute.asset,
    side: "Buy",
    type: "Limit",
    size: "1.50",
    entry: "1.0826",
    stop: "1.0809",
    target: "1.0868",
    riskPct: "0.45%",
    notional: "$163,890",
    buyingPower: "$248,000",
    route: primaryRoute.name
  };

  const positions = [
    {
      symbol: primaryRoute.asset,
      side: "Long",
      size: "1.50",
      entry: "1.0826",
      mark: "1.0838",
      pnl: "+$180",
      risk: "Protected",
      status: "In plan"
    },
    {
      symbol: workspace.routes?.[1]?.asset || "NASDAQ",
      side: "Long",
      size: "2.00",
      entry: "18224",
      mark: "18276",
      pnl: "+$520",
      risk: "Trailing",
      status: "Momentum"
    },
    {
      symbol: workspace.routes?.[2]?.asset || "BTC/USD",
      side: "Long",
      size: "0.75",
      entry: "63940",
      mark: "64320",
      pnl: "+$285",
      risk: "Reduced",
      status: "Watch"
    }
  ];

  const history = [
    {
      id: "ORD-1042",
      symbol: primaryRoute.asset,
      side: "Buy",
      type: "Limit",
      status: "Working",
      time: "09:44"
    },
    {
      id: "ORD-1039",
      symbol: workspace.routes?.[1]?.asset || "NASDAQ",
      side: "Buy",
      type: "Market",
      status: "Filled",
      time: "09:38"
    },
    {
      id: "ORD-1034",
      symbol: workspace.routes?.[3]?.asset || "XAU/USD",
      side: "Sell",
      type: "Stop",
      status: "Canceled",
      time: "09:26"
    }
  ];

  const riskBar = [
    { label: "Session Drawdown", value: "0.62%", hint: "Under intraday threshold", tone: "success" },
    { label: "Open Risk", value: "1.38R", hint: "Across active positions", tone: "warning" },
    { label: "Protected Lanes", value: String(risk.lanes?.length || 0), hint: "Risk guard coverage", tone: "info" },
    { label: "Buying Power", value: orderTicket.buyingPower, hint: "Available for qualified routes", tone: "neutral" }
  ];

  const aiPanel = {
    headline: "Execution AI is aligned with the active route stack.",
    bullets: [
      `Primary route ${primaryRoute.name} remains ${primaryRoute.state.toLowerCase()} with ${primaryRoute.confidence} confidence.`,
      `Risk posture is protected across ${risk.lanes?.length || 0} active guard lanes.`,
      `${liveOps.watches?.guardedRoutes ?? 0} guarded routes and ${liveOps.watches?.liveQueues ?? 0} live queues are under watch.`,
      `${signals.channels?.[2]?.title || "Execution Watch"} is the highest-confidence execution monitor.`
    ],
    prompts: [
      "Why is the lead route still qualified?",
      "Summarize open position risk in trader language.",
      "Flag conflicts between execution lanes and guard lanes.",
      "Prepare operator handoff for the next 30 minutes."
    ]
  };

  return {
    runtime,
    lanes: lanes.lanes || [],
    intelligence,
    portfolio,
    liveOps,
    signals,
    watchlist: watchlist.length ? watchlist : market.watchlist,
    primaryRoute,
    chart,
    orderTicket,
    positions,
    history,
    riskBar,
    aiPanel,
    queue,
    routeLibrary: workspace.routes || [],
    marketFeeds: market.feeds || [],
    routeNotes: Object.fromEntries(
      (workspace.routes || []).map((route, index) => [
        route.asset,
        [
          market.watchlist[index]?.note || `${route.name} remains under active market review.`,
          strategy.recommendations?.[index] || `${route.name} is being evaluated for execution readiness.`
        ]
      ])
    ),
    marketPosture: Object.fromEntries(
      watchlist.map((item) => [
        item.symbol,
        {
          signalStrength: item.confidence,
          bias: item.bias,
          posture:
            item.status === "Protected"
              ? "Defensive"
              : item.status === "Watch"
                ? "Observational"
                : "Executable"
        }
      ])
    )
  };
}

export function getSharedTradingProductData() {
  const execution = getExecutionCenterData();
  const risk = getRiskControlData();
  const journal = getJournalVaultData();

  return {
    ...execution,
    riskSummary: {
      drawdown: execution.riskBar?.[0]?.value || "0.62%",
      openRisk: execution.riskBar?.[1]?.value || "1.38R",
      protectionState: "Armed",
      guardStatus: `${risk.lanes?.length || 0} guard lanes active`
    },
    recentActions: [
      ...(execution.queue || []).map((item, index) => ({
        id: `QUEUE-${index + 1}`,
        title: item.task,
        detail: `${item.owner} • ${item.status}`,
        status: item.status
      })),
      ...((execution.history || []).map((item) => ({
        id: item.id,
        title: `${item.symbol} ${item.side} ${item.type}`,
        detail: `${item.status} at ${item.time}`,
        status: item.status
      })))
    ],
    sessionNotes: [
      {
        id: "NOTE-SEED-1",
        symbol: execution.primaryRoute?.asset || "EUR/USD",
        route: execution.primaryRoute?.name || "Trend Continuation",
        text: journal.journal?.title ? `${journal.journal.title} is active for the current session.` : "Session journal is active."
      }
    ]
  };
}

export function getRiskControlData() {
  return readJson(path.join(process.cwd(), "data", "risk", "runtime.json"), {
    lanes: []
  });
}

export function getAiCopilotData() {
  const workspace = getProductWorkspaceData();
  const runtime = getProductRuntime();

  return {
    prompts: [
      "Summarize the current session in trader language.",
      "Explain why a route is Qualified versus Protected.",
      "List conflicts between momentum, liquidity, and risk posture.",
      "Convert the latest events into a concise operator handoff."
    ],
    highlights: workspace.feed || [],
    workflows: runtime.metrics?.aiWorkflows ?? 0
  };
}

export function getJournalVaultData() {
  const journal = readJson(path.join(process.cwd(), "data", "operator-journal", "runtime.json"), {
    title: "Operator Journal",
    metrics: {},
    cards: []
  });
  const tracks = readJson(path.join(process.cwd(), "data", "infinity", "operator-journal.json"), {
    tracks: [],
    metrics: {}
  });

  return {
    journal,
    tracks: tracks.tracks || [],
    metrics: {
      ...(journal.metrics || {}),
      ...(tracks.metrics || {})
    }
  };
}
