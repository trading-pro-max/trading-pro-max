import { useEffect, useMemo, useState } from "react";
import type {
  JournalEntry,
  OpsTask,
  OverviewResponse,
  PhaseItem,
  SignalItem
} from "@trading-pro-max/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787/api";

type ReportResponse = { text: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }
  return response.json() as Promise<T>;
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return response.json();
}

const emptyOverview: OverviewResponse = {
  workspaceName: "Trading Pro Max",
  engineStatus: "paused",
  activePreset: "balanced",
  healthScore: 0,
  portfolioBalance: 0,
  closedPnl: 0,
  openPositions: 0,
  openExposure: 0,
  rejectedCount: 0,
  winRate: 0,
  signalCount: 0,
  runningStrategies: 0,
  phaseCount: 12
};

export default function App() {
  const [overview, setOverview] = useState<OverviewResponse>(emptyOverview);
  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<OpsTask[]>([]);
  const [command, setCommand] = useState("");
  const [report, setReport] = useState("");
  const [desktopVersion, setDesktopVersion] = useState("local");
  const [error, setError] = useState("");

  async function loadAll() {
    try {
      setError("");
      const [overviewData, phasesData, signalsData, journalData, tasksData] = await Promise.all([
        getJson<OverviewResponse>("/overview"),
        getJson<PhaseItem[]>("/phases"),
        getJson<SignalItem[]>("/signals"),
        getJson<JournalEntry[]>("/journal"),
        getJson<OpsTask[]>("/ops/tasks")
      ]);
      setOverview(overviewData);
      setPhases(phasesData);
      setSignals(signalsData);
      setJournal(journalData);
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workspace data.");
    }
  }

  useEffect(() => {
    loadAll();
    const timer = window.setInterval(loadAll, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.desktopMeta?.getVersion().then(setDesktopVersion).catch(() => setDesktopVersion("local"));
  }, []);

  const topPhase = useMemo(() => phases.find((item) => item.status === "active") ?? phases[0], [phases]);

  async function runCommand(value?: string) {
    const finalCommand = (value ?? command).trim();
    if (!finalCommand) return;
    await postJson("/ops/command", { command: finalCommand });
    setCommand("");
    await loadAll();
  }

  async function fetchReport() {
    const data = await getJson<ReportResponse>("/ops/report");
    setReport(data.text);
    try {
      await navigator.clipboard.writeText(data.text);
    } catch {
      // ignore clipboard issues
    }
  }

  async function applyPreset(preset: "balanced" | "aggressive" | "safe" | "otc") {
    await postJson("/ops/preset", { preset });
    await loadAll();
  }

  return (
    <div className="app-shell">
      <section className="hero">
        <div>
          <h1>Trading Pro Max — Desktop Control Surface</h1>
          <p>Electron desktop baseline for the 12-phase platform build.</p>
        </div>
        <div className="toolbar row">
          <span className={`badge ${overview.engineStatus === "running" ? "good" : "warn"}`}>
            Engine {overview.engineStatus}
          </span>
          <span className="badge">Desktop v{desktopVersion}</span>
          <button className="primary" onClick={() => runCommand("pulse")}>Pulse Signal</button>
          <button onClick={() => runCommand("run")}>Run</button>
          <button onClick={() => runCommand("pause")}>Pause</button>
          <button onClick={() => runCommand("safe")}>Safe Mode</button>
        </div>
      </section>

      {error ? (
        <section className="panel">
          <strong>API connection issue</strong>
          <p className="subtle">{error}</p>
        </section>
      ) : null}

      <section className="stats-grid">
        <article className="card">
          <div className="muted">Health Score</div>
          <div className="value">{overview.healthScore}</div>
          <div className="subtle">Operational quality</div>
        </article>
        <article className="card">
          <div className="muted">Portfolio Balance</div>
          <div className="value">{overview.portfolioBalance.toFixed(0)}</div>
          <div className="subtle">Virtual account</div>
        </article>
        <article className="card">
          <div className="muted">Open Exposure</div>
          <div className="value">{overview.openExposure.toFixed(0)}</div>
          <div className="subtle">Active stake load</div>
        </article>
        <article className="card">
          <div className="muted">Phase Count</div>
          <div className="value">{overview.phaseCount}</div>
          <div className="subtle">Structured roadmap</div>
        </article>
      </section>

      <section className="two-col">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Desktop Operations</h2>
              <div className="subtle">Run commands, presets, and reporting from the desktop shell.</div>
            </div>
          </div>

          <div className="action-row row">
            <button onClick={() => applyPreset("balanced")}>Balanced</button>
            <button onClick={() => applyPreset("aggressive")}>Aggressive</button>
            <button onClick={() => applyPreset("safe")}>Safe</button>
            <button onClick={() => applyPreset("otc")}>OTC</button>
            <button className="primary" onClick={fetchReport}>Generate Report</button>
          </div>

          <div style={{ marginTop: 14 }}>
            <input
              className="command-box"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="run | pause | stop | pulse | balanced | aggressive | safe | otc | reset"
            />
          </div>

          <div className="action-row row" style={{ marginTop: 12 }}>
            <button className="primary" onClick={() => runCommand()}>Run Command</button>
          </div>

          {report ? <div className="report-box" style={{ marginTop: 14 }}>{report}</div> : null}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Phase Focus</h2>
              <div className="subtle">Current strongest execution area in this ZIP</div>
            </div>
          </div>
          <div className="kpi">
            <strong>{topPhase?.title ?? "Loading..."}</strong>
            <div className="subtle">{topPhase?.summary}</div>
            <div style={{ marginTop: 10 }}>
              <span className={`badge ${topPhase?.status === "active" ? "good" : topPhase?.status === "foundation" ? "warn" : ""}`}>
                {topPhase?.status ?? "loading"}
              </span>
            </div>
          </div>

          <div className="kpi-list" style={{ marginTop: 12 }}>
            <div className="kpi">
              <strong>Preset</strong>
              <div>{overview.activePreset}</div>
            </div>
            <div className="kpi">
              <strong>Running strategies</strong>
              <div>{overview.runningStrategies}</div>
            </div>
            <div className="kpi">
              <strong>Rejected count</strong>
              <div>{overview.rejectedCount}</div>
            </div>
          </div>
        </article>
      </section>

      <section className="three-col">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Signals</h3>
              <div className="subtle">Current opportunity feed</div>
            </div>
          </div>
          <div className="simple-list">
            {signals.map((signal) => (
              <div key={signal.id} className="list-row">
                <strong>{signal.pair} — {signal.side}</strong>
                <div className="subtle">
                  {signal.confidence}% • {signal.timeframe} • {signal.source}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Journal Feed</h3>
              <div className="subtle">Recent operator and system notes</div>
            </div>
          </div>
          <div className="simple-list">
            {journal.slice(0, 8).map((item) => (
              <div key={item.id} className="list-row">
                <strong>{new Date(item.createdAt).toLocaleTimeString()}</strong>
                <div className="subtle">{item.text}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Ops Tasks</h3>
              <div className="subtle">Generated guidance from current state</div>
            </div>
          </div>
          <div className="simple-list">
            {tasks.map((task) => (
              <div key={task.id} className="list-row">
                <strong>{task.text}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
