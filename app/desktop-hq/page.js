import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Trading Pro Max — Desktop HQ",
  description: "Command center for the Trading Pro Max platform."
};

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {}
  return fallback;
}

function pct(v, fallback = 100) {
  return Number.isFinite(Number(v)) ? Number(v) : fallback;
}

const shellBg = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#020617 0%,#07111f 35%,#020617 100%)",
  color: "#fff",
  fontFamily: "Arial, sans-serif"
};

const wrap = {
  maxWidth: 1760,
  margin: "0 auto",
  padding: "18px 18px 40px"
};

const panel = {
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 22,
  boxShadow: "0 18px 50px rgba(0,0,0,0.30)"
};

const soft = { color: "#94a3b8" };
const green = { color: "#22c55e" };
const blue = { color: "#38bdf8" };
const amber = { color: "#f59e0b" };
const red = { color: "#f87171" };
const violet = { color: "#a78bfa" };

function MetricCard({ label, value, hint }) {
  return (
    <div style={{ ...panel, padding: 18 }}>
      <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", ...soft }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 12, marginTop: 8, ...soft }}>{hint}</div>
    </div>
  );
}

function MiniBar({ label, value, tone }) {
  const color = tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : tone === "red" ? "#f87171" : tone === "violet" ? "#a78bfa" : "#38bdf8";
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ fontWeight: 900, color }}>{value}%</div>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "#0f172a", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}

function ActionButton({ label, tone }) {
  const bg = tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : tone === "red" ? "#ef4444" : tone === "violet" ? "#8b5cf6" : "#0f172a";
  const color = tone === "green" || tone === "amber" ? "#04130a" : "#fff";
  return (
    <button style={{
      background: bg,
      color,
      border: "1px solid rgba(148,163,184,0.14)",
      borderRadius: 14,
      padding: "12px 14px",
      fontWeight: 800,
      cursor: "pointer"
    }}>
      {label}
    </button>
  );
}

function Chip({ label, tone }) {
  const styles = tone === "green"
    ? { background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.25)", color: "#86efac" }
    : tone === "amber"
    ? { background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)", color: "#fcd34d" }
    : tone === "red"
    ? { background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.25)", color: "#fca5a5" }
    : tone === "violet"
    ? { background: "rgba(167,139,250,.12)", border: "1px solid rgba(167,139,250,.25)", color: "#c4b5fd" }
    : { background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.25)", color: "#7dd3fc" };

  return (
    <span style={{ ...styles, display: "inline-flex", padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
      {label}
    </span>
  );
}

export default function Page() {
  const expansion = readJson(path.join(process.cwd(), ".tpm", "expansion-runtime.json"), {
    domains: { desktop: 88, notifications: 90, packaging: 92 }
  });

  const master = readJson(path.join(process.cwd(), ".tpm", "master-runtime.json"), {
    overallProgress: 100,
    completed: 100,
    remaining: 0,
    releaseGate: "OPEN_EXTERNAL",
    finalReadiness: "ready-external-deploy"
  });

  const helix = readJson(path.join(process.cwd(), ".tpm", "helix-runtime.json"), {
    overallProgress: 96,
    domains: { helix: 96, parliament: 95, resilience: 97 }
  });

  const observability = readJson(path.join(process.cwd(), ".tpm", "observability-runtime.json"), {
    overallProgress: 94,
    modules: []
  });

  const desktop = pct(expansion?.domains?.desktop, 88);
  const notifications = pct(expansion?.domains?.notifications, 90);
  const packaging = pct(expansion?.domains?.packaging, 92);
  const runtimeHealth = pct(master?.overallProgress, 100);
  const helixHealth = pct(helix?.overallProgress, 96);
  const observabilityHealth = pct(observability?.overallProgress, 94);
  const overall = Math.round((desktop + notifications + packaging + runtimeHealth + helixHealth + observabilityHealth) / 6);

  const topStats = [
    { label: "Desktop Completion", value: `${desktop}%`, hint: "Core shell and workspace surface" },
    { label: "Notification Mesh", value: `${notifications}%`, hint: "Signal prompts and event routing" },
    { label: "Packaging Readiness", value: `${packaging}%`, hint: "Desktop release path and bundling" },
    { label: "Runtime Health", value: `${runtimeHealth}%`, hint: "Master runtime integrity" },
    { label: "Helix Layer", value: `${helixHealth}%`, hint: "Governance and resilience weave" },
    { label: "Observability", value: `${observabilityHealth}%`, hint: "Monitoring and recovery coverage" }
  ];

  const workspaceCards = [
    { title: "Market Wall", text: "Structured market overview with watch zones, active assets, momentum clusters, and quick decision visibility." },
    { title: "Strategy Wall", text: "Operational strategy surface for setups, filters, confidence gates, and execution discipline." },
    { title: "Signal Chamber", text: "Decision stream for priority alerts, confirmations, conflicts, and operator review." },
    { title: "AI Assist", text: "Guided intelligence layer for summaries, explanations, route suggestions, and workflow support." },
    { title: "Operator Tray", text: "Fast access to commands, pinned actions, context switches, and operational shortcuts." },
    { title: "Resilience Layer", text: "Recovery posture, runtime continuity, safety checks, and controlled fallback visibility." }
  ];

  const marketRows = [
    ["EUR/USD", "Bullish bias", "78%", "Active", "London impulse holding above structure"],
    ["BTC/USD", "Breakout watch", "74%", "Monitor", "Compression near major trigger band"],
    ["XAU/USD", "Pullback zone", "69%", "Review", "Reversion interest inside support pocket"],
    ["NASDAQ", "Momentum push", "82%", "Active", "Trend continuation intact on session open"]
  ];

  const strategyRows = [
    ["Trend Continuation", "Qualified", "Risk-controlled", "Primary route"],
    ["Volatility Compression", "Watch", "Pending trigger", "Secondary route"],
    ["Reversal Trap Filter", "Active", "Protected", "Guard rail"],
    ["Session Breakout", "Qualified", "Ready", "Execution route"]
  ];

  const systemRows = [
    ["Runtime Integrity", "Healthy", "green"],
    ["Signal Routing", "Stable", "green"],
    ["Operator Actions", "Synchronized", "blue"],
    ["Recovery Snapshot", "Available", "amber"],
    ["Risk Freeze Layer", "Armed", "violet"]
  ];

  const commandRows = [
    ["Rebuild signal confidence matrix", "Queued", "blue"],
    ["Refresh active route priorities", "Running", "green"],
    ["Replay resilience snapshot", "Ready", "amber"],
    ["Package desktop release candidate", "Blocked", "red"],
    ["Reconcile observability drift", "Running", "violet"]
  ];

  const liveFeed = [
    ["09:31", "Market wall synchronized with priority instruments."],
    ["09:34", "Signal chamber promoted 3 qualified routes to active review."],
    ["09:37", "AI assist generated a new session summary for operator handoff."],
    ["09:40", "Packaging pipeline requested final desktop shell validation."],
    ["09:43", "Risk guard locked one route after spread expansion."],
    ["09:46", "Helix parliament ratified new signal governance posture."]
  ];

  const aiBrief = [
    "Primary risk remains event-driven volatility expansion around key session transitions.",
    "Highest conviction route still sits with trend continuation and session breakout alignment.",
    "Gold stays tactical only; confidence is lower than index and FX momentum structures.",
    "Packaging is the current weakest domain and should remain blocked until validation closes."
  ];

  const releaseChecklist = [
    ["Desktop shell polish", "In progress", "amber"],
    ["Signal queue realism", "Closed", "green"],
    ["AI assist summary layer", "Closed", "green"],
    ["Risk freeze actions", "Closed", "green"],
    ["Release packaging", "Open", "red"]
  ];

  const riskGates = [
    ["Spread expansion lock", 86, "green"],
    ["Volatility shock lock", 74, "amber"],
    ["Session conflict suppression", 92, "green"],
    ["Capital protection veto", 97, "green"],
    ["Manual emergency override", 81, "violet"]
  ];

  const routeMatrix = [
    ["London continuation", "EUR/USD", "82%", "Qualified", "green"],
    ["NASDAQ impulse", "NASDAQ", "79%", "Ready", "green"],
    ["BTC breakout compression", "BTC/USD", "71%", "Watch", "amber"],
    ["Gold fade scalp", "XAU/USD", "61%", "Restricted", "red"]
  ];

  return (
    <main style={shellBg}>
      <div style={wrap}>
        <section style={{ ...panel, padding: 22, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Trading Pro Max</div>
              <h1 style={{ margin: "8px 0 0", fontSize: 42 }}>Desktop HQ</h1>
              <div style={{ marginTop: 10, fontSize: 16, color: "#cbd5e1", maxWidth: 980 }}>
                Main operating surface for market visibility, strategy control, signal review, AI briefing, risk gating, and desktop-grade execution readiness.
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, minWidth: 360 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={soft}>Overall desktop state</span>
                <strong style={green}>{overall}%</strong>
              </div>
              <div style={{ height: 12, background: "#0f172a", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${overall}%`, height: "100%", background: "#22c55e", borderRadius: 999 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={soft}>Release gate: {master?.releaseGate ?? "OPEN_EXTERNAL"}</span>
                <span style={soft}>Readiness: {master?.finalReadiness ?? "ready-external-deploy"}</span>
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 14, marginBottom: 18 }}>
          {topStats.map((x) => (
            <MetricCard key={x.label} label={x.label} value={x.value} hint={x.hint} />
          ))}
        </section>

        <section style={{ ...panel, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...amber, fontWeight: 800 }}>Operator Command Bar</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>Execution Controls</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton label="Run Desktop Validation" tone="green" />
              <ActionButton label="Refresh Signals" tone="blue" />
              <ActionButton label="Open AI Brief" tone="violet" />
              <ActionButton label="Freeze Risk Actions" tone="amber" />
              <ActionButton label="Emergency Stop" tone="red" />
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "270px 1fr 370px", gap: 16 }}>
          <aside style={{ ...panel, padding: 18, display: "grid", gap: 16, alignSelf: "start" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Navigation</div>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {["Overview", "Market Wall", "Strategies", "Signal Chamber", "AI Brief", "Risk Gates", "Operations", "Resilience"].map((x) => (
                  <div key={x} style={{ padding: "12px 14px", borderRadius: 14, background: "#020617", border: "1px solid rgba(148,163,184,0.12)", fontWeight: 700 }}>
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...amber, fontWeight: 800 }}>Progress Mesh</div>
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                <MiniBar label="Desktop Shell" value={desktop} tone="green" />
                <MiniBar label="Notifications" value={notifications} tone="blue" />
                <MiniBar label="Packaging" value={packaging} tone="amber" />
                <MiniBar label="Helix Weave" value={helixHealth} tone="violet" />
                <MiniBar label="Observability" value={observabilityHealth} tone="green" />
              </div>
            </div>
          </aside>

          <div style={{ display: "grid", gap: 16 }}>
            <section style={{ ...panel, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Command Surface</div>
                  <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>Workspace Architecture</div>
                </div>
                <div style={{ ...soft, fontSize: 13 }}>6 active surface blocks</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
                {workspaceCards.map((x) => (
                  <div key={x.title} style={{ background: "#020617", borderRadius: 18, padding: 18, border: "1px solid rgba(148,163,184,0.10)" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{x.title}</div>
                    <div style={{ marginTop: 10, lineHeight: 1.7, color: "#cbd5e1" }}>{x.text}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Market Wall</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Active Instruments</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {marketRows.map(([a,b,c,d,e]) => (
                    <div key={a} style={{ padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 90px 90px", gap: 10 }}>
                        <strong>{a}</strong>
                        <span style={soft}>{b}</span>
                        <span style={green}>{c}</span>
                        <span style={soft}>{d}</span>
                      </div>
                      <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>{e}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...amber, fontWeight: 800 }}>Strategy Wall</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Execution Programs</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {strategyRows.map(([a,b,c,d]) => (
                    <div key={a} style={{ display: "grid", gridTemplateColumns: "1.2fr 110px 1fr 120px", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <strong>{a}</strong>
                      <span style={blue}>{b}</span>
                      <span style={soft}>{c}</span>
                      <span style={{ color: "#cbd5e1" }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...green, fontWeight: 800 }}>Route Matrix</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Priority Routes</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {routeMatrix.map(([a,b,c,d,t]) => (
                    <div key={a} style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 80px 110px", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <strong>{a}</strong>
                      <span style={soft}>{b}</span>
                      <span style={green}>{c}</span>
                      <span style={t === "green" ? green : t === "amber" ? amber : red}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...violet, fontWeight: 800 }}>AI Brief</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Session Intelligence Summary</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {aiBrief.map((x) => (
                    <div key={x} style={{ padding: "12px 14px", borderRadius: 14, background: "#020617", color: "#cbd5e1", lineHeight: 1.7 }}>
                      {x}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...green, fontWeight: 800 }}>Command Queue</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Live Actions</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {commandRows.map(([a,b,t]) => (
                    <div key={a} style={{ display: "grid", gridTemplateColumns: "1.5fr 110px", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <strong>{a}</strong>
                      <span style={t === "green" ? green : t === "amber" ? amber : t === "red" ? red : t === "violet" ? violet : blue}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Live Feed</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Recent Platform Events</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {liveFeed.map(([a,b]) => (
                    <div key={a+b} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <strong style={blue}>{a}</strong>
                      <span style={{ color: "#cbd5e1", lineHeight: 1.6 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside style={{ ...panel, padding: 18, display: "grid", gap: 16, alignSelf: "start" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...green, fontWeight: 800 }}>System Status</div>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {systemRows.map(([a,b,t]) => (
                  <div key={a} style={{ padding: "12px 14px", borderRadius: 14, background: "#020617", display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span>{a}</span>
                    <strong style={t === "green" ? green : t === "amber" ? amber : t === "red" ? red : t === "violet" ? violet : blue}>{b}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...amber, fontWeight: 800 }}>Risk Gates</div>
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                {riskGates.map(([label,val,tone]) => (
                  <MiniBar key={label} label={label} value={val} tone={tone} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...violet, fontWeight: 800 }}>Release Checklist</div>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {releaseChecklist.map(([a,b,t]) => (
                  <div key={a} style={{ padding: "12px 14px", borderRadius: 14, background: "#020617", display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span>{a}</span>
                    <Chip label={b} tone={t} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Operator Notes</div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {[
                  "Desktop HQ remains the primary large-surface target until product polish closes.",
                  "Public website stays frozen while the real product surface becomes stronger.",
                  "Next jump should close deeper realism around workflows, route detail, and action sequencing."
                ].map((x) => (
                  <div key={x} style={{ padding: "12px 14px", borderRadius: 14, background: "#020617", lineHeight: 1.6, color: "#cbd5e1" }}>
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
