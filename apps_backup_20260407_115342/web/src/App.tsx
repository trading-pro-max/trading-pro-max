import React, { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8787";

async function getJson(path: string) {
  try {
    const r = await fetch(`${API}${path}`);
    return await r.json();
  } catch {
    return null;
  }
}

const pageMap: Record<string, { title: string; subtitle: string; blocks: { title: string; text: string; tag: string }[] }> = {
  dashboard: {
    title: "Executive Dashboard",
    subtitle: "Global overview of runtime, AI, operations, and platform control.",
    blocks: [
      { title: "Command Overview", text: "Top-level control surface for the full trading ecosystem.", tag: "Core" },
      { title: "Health Layer", text: "Runtime health, API state, shell readiness and environment visibility.", tag: "Runtime" },
      { title: "Executive Metrics", text: "Platform-wide KPIs, readiness signals and operational summaries.", tag: "Metrics" },
      { title: "Control Flow", text: "Fast access to all major global platform domains.", tag: "Control" }
    ]
  },
  markets: {
    title: "Markets",
    subtitle: "Global market access layer covering every major trading environment.",
    blocks: [
      { title: "Forex", text: "Major and minor currencies, session behavior and cross-market context.", tag: "FX" },
      { title: "Crypto", text: "Volatility-driven digital asset coverage with AI overlays.", tag: "Crypto" },
      { title: "Indices", text: "Macro and momentum-sensitive baskets for global market direction.", tag: "Indices" },
      { title: "Commodities", text: "Gold, oil and narrative-driven instruments inside one surface.", tag: "Commodities" }
    ]
  },
  signals: {
    title: "Signals",
    subtitle: "Signal discovery, ranking, explanation and alerting.",
    blocks: [
      { title: "Live Feed", text: "Structured signal stream for ranked market opportunities.", tag: "Feed" },
      { title: "Scanner", text: "Cross-market discovery engine for filtered setups.", tag: "Scanner" },
      { title: "Alerts", text: "Signal delivery layer for platform notifications and actions.", tag: "Alerts" },
      { title: "Quality Score", text: "Confidence and screening logic for signal trust.", tag: "Scoring" }
    ]
  },
  chart: {
    title: "Chart Workspace",
    subtitle: "Charting layer for signal context, overlays and execution awareness.",
    blocks: [
      { title: "Main Chart", text: "Primary chart shell for indicators, overlays and signal context.", tag: "Chart" },
      { title: "Layout Memory", text: "Reusable saved layouts and instrument-focused workspaces.", tag: "Layouts" },
      { title: "Execution Context", text: "Position-aware visual support and live context framing.", tag: "Execution" },
      { title: "AI Overlay", text: "AI interpretation and recommendation layer over the chart.", tag: "AI" }
    ]
  },
  strategy: {
    title: "Strategy Lab",
    subtitle: "Strategy creation, optimization and comparison.",
    blocks: [
      { title: "Builder", text: "Compose strategy logic in a structured workspace.", tag: "Build" },
      { title: "Backtests", text: "Evaluate historical performance and structural validity.", tag: "Backtest" },
      { title: "Optimizer", text: "Tune parameters and compare performance variants.", tag: "Optimize" },
      { title: "Templates", text: "Prebuilt strategic archetypes for rapid deployment.", tag: "Templates" }
    ]
  },
  ai: {
    title: "AI Copilot",
    subtitle: "The trader-facing intelligence layer of the platform.",
    blocks: [
      { title: "AI Chat", text: "Interactive intelligence panel for user guidance and answers.", tag: "Chat" },
      { title: "Insights", text: "Summaries, signals, context, anomalies and opportunity framing.", tag: "Insights" },
      { title: "Recommendations", text: "Next-best-action suggestions with reasoning context.", tag: "Recommend" },
      { title: "Daily Brief", text: "Global market briefings and user-specific summaries.", tag: "Briefing" }
    ]
  },
  portfolio: {
    title: "Portfolio",
    subtitle: "Positions, orders, performance and journal intelligence.",
    blocks: [
      { title: "Positions", text: "Live holdings and current market exposure mapping.", tag: "Positions" },
      { title: "Orders", text: "Execution intent and order state visibility.", tag: "Orders" },
      { title: "Performance", text: "PnL, attribution, review and progress intelligence.", tag: "Performance" },
      { title: "Journal", text: "Trader memory, note-taking and behavioral tracking.", tag: "Journal" }
    ]
  },
  risk: {
    title: "Risk Command",
    subtitle: "Institutional-style risk governance and defense.",
    blocks: [
      { title: "Exposure", text: "Cross-asset and strategy exposure mapping.", tag: "Exposure" },
      { title: "Drawdown", text: "Drawdown visibility and risk escalation controls.", tag: "Drawdown" },
      { title: "Limits", text: "Hard risk limits and policy-based control layer.", tag: "Limits" },
      { title: "Kill Switch", text: "Emergency shutdown and runtime defensive actions.", tag: "Guard" }
    ]
  },
  billing: {
    title: "Billing & Revenue",
    subtitle: "Monetization, plans, invoices and subscription operations.",
    blocks: [
      { title: "Plans", text: "Plan architecture and revenue positioning.", tag: "Plans" },
      { title: "Invoices", text: "Billing history, invoice visibility and finance trail.", tag: "Invoices" },
      { title: "Subscription", text: "Lifecycle controls for activation, renewal and change.", tag: "Subscription" },
      { title: "Usage", text: "Entitlements, feature access and value tracking.", tag: "Usage" }
    ]
  },
  account: {
    title: "Account",
    subtitle: "User identity, security and personal controls.",
    blocks: [
      { title: "Profile", text: "Core account identity and presentation settings.", tag: "Profile" },
      { title: "Security", text: "Sessions, login state and access protections.", tag: "Security" },
      { title: "Sessions", text: "Cross-device awareness and session control.", tag: "Sessions" },
      { title: "Preferences", text: "User-level interface and platform behavior settings.", tag: "Preferences" }
    ]
  },
  ops: {
    title: "Operations",
    subtitle: "Runtime, services, monitoring and deployment visibility.",
    blocks: [
      { title: "Runtime", text: "Live API and shell operating state with health awareness.", tag: "Runtime" },
      { title: "Services", text: "Service map for critical platform components.", tag: "Services" },
      { title: "Incidents", text: "Failure awareness, investigation and response shell.", tag: "Incidents" },
      { title: "Deployments", text: "Release visibility and platform rollout awareness.", tag: "Deploy" }
    ]
  },
  admin: {
    title: "Admin",
    subtitle: "Global platform administration and executive controls.",
    blocks: [
      { title: "Users", text: "User oversight, search, filtering and lifecycle operations.", tag: "Users" },
      { title: "Plans", text: "Commercial structure management and offer control.", tag: "Plans" },
      { title: "Permissions", text: "Role and access governance across the platform.", tag: "RBAC" },
      { title: "Audits", text: "Administrative traceability and oversight shell.", tag: "Audit" }
    ]
  },
  trust: {
    title: "Trust Layer",
    subtitle: "Support, status, legal and global confidence surface.",
    blocks: [
      { title: "Help Center", text: "Guided support and structured user help experience.", tag: "Help" },
      { title: "Status", text: "System trust visibility and uptime posture.", tag: "Status" },
      { title: "Privacy", text: "Privacy, legal and policy-facing platform layer.", tag: "Privacy" },
      { title: "Compliance", text: "Enterprise-facing trust, governance and policy readiness.", tag: "Compliance" }
    ]
  }
};

function Background() {
  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        html,body,#root{margin:0;min-height:100%;background:#030712;color:#e5eefc;font-family:Inter,Arial,sans-serif}
        .bg{position:fixed;inset:0;pointer-events:none;overflow:hidden;background:
          radial-gradient(circle at 10% 15%, rgba(34,211,238,.14), transparent 18%),
          radial-gradient(circle at 90% 12%, rgba(99,102,241,.18), transparent 22%),
          radial-gradient(circle at 50% 82%, rgba(168,85,247,.10), transparent 26%),
          linear-gradient(180deg,#020617 0%,#030712 52%,#020617 100%)}
        .bg:before{content:"";position:absolute;inset:-10%;background:
          linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
          background-size:72px 72px;opacity:.15;mask-image:radial-gradient(circle at center,black 45%,transparent 86%)}
        .orb{position:absolute;border-radius:999px;filter:blur(32px);opacity:.55;animation:drift 18s ease-in-out infinite}
        .o1{width:25rem;height:25rem;left:-7rem;top:4rem;background:rgba(34,211,238,.16)}
        .o2{width:22rem;height:22rem;right:-6rem;top:8rem;background:rgba(99,102,241,.18);animation-delay:-6s}
        .o3{width:18rem;height:18rem;left:42%;bottom:-5rem;background:rgba(168,85,247,.12);animation-delay:-10s}
        .app{position:relative;z-index:2;min-height:100vh;padding:20px}
        .wrap{max-width:1620px;margin:0 auto;display:grid;grid-template-columns:300px 1fr;gap:18px}
        .glass{background:linear-gradient(180deg,rgba(15,23,42,.82),rgba(2,6,23,.72));border:1px solid rgba(148,163,184,.14);box-shadow:0 12px 40px rgba(2,6,23,.42),inset 0 1px 0 rgba(255,255,255,.03);backdrop-filter:blur(18px)}
        .side{border-radius:28px;padding:22px;display:grid;gap:18px;position:sticky;top:20px;height:calc(100vh - 40px);overflow:auto}
        .main{display:grid;gap:18px}
        .hero{border-radius:28px;padding:24px;display:grid;grid-template-columns:1.15fr .85fr;gap:18px}
        .title{font-size:44px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin:6px 0 0}
        .sub{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#7dd3fc}
        .muted{color:#94a3b8;line-height:1.7}
        .nav{display:grid;gap:10px}
        .navBtn{padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);color:#dbeafe;cursor:pointer;text-align:left;font-weight:700}
        .navBtn.active{background:linear-gradient(135deg,rgba(34,211,238,.16),rgba(99,102,241,.18));border-color:rgba(34,211,238,.28)}
        .grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .card{border-radius:22px;padding:18px}
        .metricLabel{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em}
        .metricValue{font-size:24px;font-weight:800;margin-top:8px}
        .panelTitle{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px}
        .tile{border-radius:22px;padding:18px;display:grid;gap:10px;min-height:156px}
        .tile h3{margin:0;font-size:18px}
        .tile p{margin:0;color:#94a3b8;font-size:13px;line-height:1.6}
        .chip{display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:12px;color:#dbeafe}
        .chips{display:flex;gap:10px;flex-wrap:wrap}
        .login{display:grid;gap:10px}
        .input{width:100%;padding:14px 16px;border-radius:16px;background:rgba(2,6,23,.82);color:#eff6ff;border:1px solid rgba(148,163,184,.18)}
        .btn{border:1px solid rgba(148,163,184,.14);background:rgba(255,255,255,.04);color:#eef6ff;padding:12px 16px;border-radius:14px;cursor:pointer;font-weight:700}
        .btn.primary{background:linear-gradient(135deg,rgba(34,211,238,.96),rgba(99,102,241,.96));color:#04111d;border:none}
        .actions{display:flex;gap:10px;flex-wrap:wrap}
        .small{font-size:12px;color:#94a3b8}
        @keyframes drift{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.06)}}
        @media (max-width:1200px){.wrap{grid-template-columns:1fr}.side{position:relative;height:auto;top:0}.hero{grid-template-columns:1fr}.grid4,.grid3,.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.title{font-size:36px}}
        @media (max-width:760px){.grid4,.grid3,.grid2{grid-template-columns:1fr}.app{padding:14px}.title{font-size:28px}}
      `}</style>
      <div className="bg"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" /></div>
    </>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="glass card"><div className="metricLabel">{title}</div><div className="metricValue">{value}</div></div>;
}

function Tile({ title, text, tag }: { title: string; text: string; tag: string }) {
  return <div className="glass tile"><span className="chip">{tag}</span><h3>{title}</h3><p>{text}</p></div>;
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [health, setHealth] = useState<any>(null);
  const [ai, setAi] = useState<any>(null);
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState("admin@tradingpromax.local");
  const [password, setPassword] = useState("admin123");

  useEffect(() => {
    (async () => {
      const h = await getJson("/api/health");
      const a = await getJson("/api/ai/status");
      setHealth(h);
      setAi(a);
    })();
  }, []);

  const current = pageMap[page];

  const pages = useMemo(() => ([
    ["dashboard","Dashboard"],
    ["markets","Markets"],
    ["signals","Signals"],
    ["chart","Chart"],
    ["strategy","Strategy Lab"],
    ["ai","AI Copilot"],
    ["portfolio","Portfolio"],
    ["risk","Risk"],
    ["billing","Billing"],
    ["account","Account"],
    ["ops","Operations"],
    ["admin","Admin"],
    ["trust","Trust Layer"]
  ]), []);

  return (
    <>
      <Background />
      <div className="app">
        <div className="wrap">
          <aside className="glass side">
            <div>
              <div className="sub">Global Trading Platform</div>
              <div className="title" style={{ fontSize: 30 }}>Trading Pro Max</div>
              <div className="small" style={{ marginTop: 8 }}>Complete shell for a comprehensive world-class trading platform.</div>
            </div>

            <div className="nav">
              {pages.map(([key, label]) => (
                <button key={key} className={`navBtn ${page===key ? "active" : ""}`} onClick={() => setPage(key)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="glass card">
              <div className="panelTitle">Quick Access</div>
              <div className="chips">
                <span className="chip">API {health?.ok ? "Online" : "Check"}</span>
                <span className="chip">AI {ai?.ok ? "Online" : "Check"}</span>
                <span className="chip">Pages {Object.keys(pageMap).length}</span>
              </div>
            </div>

            {!auth && (
              <div className="glass card">
                <div className="panelTitle">Executive Access</div>
                <div className="login">
                  <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
                  <input className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" />
                  <button className="btn primary" onClick={() => setAuth(true)}>Enter Shell</button>
                </div>
              </div>
            )}
          </aside>

          <main className="main">
            <section className="glass hero">
              <div>
                <div className="sub">Comprehensive Platform Architecture</div>
                <h1 className="title">{current.title}</h1>
                <p className="muted">{current.subtitle}</p>
                <div className="actions" style={{ marginTop: 18 }}>
                  <button className="btn primary" onClick={() => window.location.reload()}>Refresh Shell</button>
                  <button className="btn" onClick={() => window.open("http://localhost:8787/api/health", "_blank")}>API Health</button>
                </div>
              </div>

              <div className="glass card">
                <div className="panelTitle">Page Progress</div>
                <div className="metricValue">100%</div>
                <div className="small" style={{ marginTop: 10 }}>
                  Full platform page structure is now represented inside one stable shell.
                </div>
              </div>
            </section>

            <section className="grid4">
              <Metric title="Page" value={current.title} />
              <Metric title="API" value={health?.ok ? "Running" : "Check"} />
              <Metric title="AI" value={ai?.ok ? "Online" : "Check"} />
              <Metric title="Shell" value="Stable" />
            </section>

            <section className="grid4">
              {current.blocks.map((b) => <Tile key={b.title} title={b.title} text={b.text} tag={b.tag} />)}
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
