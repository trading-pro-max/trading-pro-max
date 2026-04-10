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
  maxWidth: 1720,
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
  const color = tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : tone === "red" ? "#f87171" : "#38bdf8";
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
  const bg = tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : tone === "red" ? "#ef4444" : "#0f172a";
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

  const desktop = pct(expansion?.domains?.desktop, 88);
  const notifications = pct(expansion?.domains?.notifications, 90);
  const packaging = pct(expansion?.domains?.packaging, 92);
  const overall = Math.round((desktop + notifications + packaging) / 3);

  const topStats = [
    { label: "Desktop Completion", value: `${desktop}%`, hint: "Core shell and workspace surface" },
    { label: "Notification Mesh", value: `${notifications}%`, hint: "Signal prompts and event routing" },
    { label: "Packaging Readiness", value: `${packaging}%`, hint: "Desktop release path and bundling" },
    { label: "Master State", value: `${master?.overallProgress ?? 100}%`, hint: "Whole-project runtime status" }
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
    ["EUR/USD", "Bullish bias", "78%", "Active"],
    ["BTC/USD", "Breakout watch", "74%", "Monitor"],
    ["XAU/USD", "Pullback zone", "69%", "Review"],
    ["NASDAQ", "Momentum push", "82%", "Active"]
  ];

  const strategyRows = [
    ["Trend Continuation", "Qualified", "Risk-controlled"],
    ["Volatility Compression", "Watch", "Pending trigger"],
    ["Reversal Trap Filter", "Active", "Protected"],
    ["Session Breakout", "Qualified", "Ready"]
  ];

  const systemRows = [
    ["Runtime Integrity", "Healthy", "green"],
    ["Signal Routing", "Stable", "green"],
    ["Operator Actions", "Synchronized", "blue"],
    ["Recovery Snapshot", "Available", "amber"]
  ];

  const commandRows = [
    ["Rebuild signal confidence matrix", "Queued", "blue"],
    ["Refresh active route priorities", "Running", "green"],
    ["Replay resilience snapshot", "Ready", "amber"],
    ["Package desktop release candidate", "Blocked", "red"]
  ];

  const liveFeed = [
    ["09:31", "Market wall synchronized with priority instruments."],
    ["09:34", "Signal chamber promoted 3 qualified routes to active review."],
    ["09:37", "AI assist generated a new session summary for operator handoff."],
    ["09:40", "Packaging pipeline requested final desktop shell validation."]
  ];

  return (
    <main style={shellBg}>
      <div style={wrap}>
        <section style={{ ...panel, padding: 22, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Trading Pro Max</div>
              <h1 style={{ margin: "8px 0 0", fontSize: 42 }}>Desktop HQ</h1>
              <div style={{ marginTop: 10, fontSize: 16, color: "#cbd5e1", maxWidth: 950 }}>
                Main operating surface for market visibility, strategy control, signal review, and desktop-grade execution readiness.
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, minWidth: 320 }}>
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

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 18 }}>
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
              <ActionButton label="Freeze Risk Actions" tone="amber" />
              <ActionButton label="Emergency Stop" tone="red" />
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "270px 1fr 360px", gap: 16 }}>
          <aside style={{ ...panel, padding: 18, display: "grid", gap: 16, alignSelf: "start" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Navigation</div>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {["Overview", "Market Wall", "Strategies", "Signals", "AI Assist", "Operations", "Resilience"].map((x) => (
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
                  {marketRows.map(([a,b,c,d]) => (
                    <div key={a} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 90px 90px", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <strong>{a}</strong>
                      <span style={soft}>{b}</span>
                      <span style={green}>{c}</span>
                      <span style={soft}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...panel, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...amber, fontWeight: 800 }}>Strategy Wall</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginBottom: 14 }}>Execution Programs</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {strategyRows.map(([a,b,c]) => (
                    <div key={a} style={{ display: "grid", gridTemplateColumns: "1.25fr 120px 1fr", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#020617" }}>
                      <strong>{a}</strong>
                      <span style={blue}>{b}</span>
                      <span style={soft}>{c}</span>
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
                      <span style={t === "green" ? green : t === "amber" ? amber : t === "red" ? red : blue}>{b}</span>
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
                    <strong style={t === "green" ? green : t === "amber" ? amber : blue}>{b}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", ...blue, fontWeight: 800 }}>Operator Notes</div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {[
                  "Desktop HQ is now the primary large-surface target.",
                  "Small public website stays frozen until the product surface is stronger.",
                  "Next jump should close workspace polish, action flows, and deeper runtime realism."
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
