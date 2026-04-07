"use client";

import { useEffect, useRef, useState } from "react";

type ControlState = {
  status: "ONLINE" | "PAUSED";
  autoMode: boolean;
  riskMode: "SAFE" | "BALANCED" | "AGGRESSIVE";
  aiEnabled: boolean;
  lastCommand: string;
  metrics: {
    engineReadiness: number;
    platformReadiness: number;
    launchReadiness: number;
    privateOperatorStack: number;
  };
  logs: { time: string; text: string }[];
};

type LiveMarket = {
  symbol: string;
  price: number;
  signal: string;
  confidence: number;
  time: string;
} | null;

type PaperTrade = {
  id: string;
  symbol: string;
  signal: string;
  confidence: number;
  entry: number;
  exit?: number;
  status: string;
  pnl: number;
  createdAt: string;
  closedAt?: string;
};

const EMPTY_STATE: ControlState = {
  status: "ONLINE",
  autoMode: true,
  riskMode: "BALANCED",
  aiEnabled: true,
  lastCommand: "BOOT",
  metrics: {
    engineReadiness: 99,
    platformReadiness: 98,
    launchReadiness: 96,
    privateOperatorStack: 90,
  },
  logs: [],
};

export default function ControlPage() {
  const [state, setState] = useState<ControlState>(EMPTY_STATE);
  const [market, setMarket] = useState<LiveMarket>(null);
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  const safeLoad = async () => {
    try {
      const [stateRes, marketRes, paperRes] = await Promise.all([
        fetch("/api/control/state", { method: "GET", cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/market/live", { method: "GET", cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/paper/history", { method: "GET", cache: "no-store", headers: { Accept: "application/json" } }),
      ]);

      if (!stateRes.ok) throw new Error("STATE_REQUEST_FAILED");

      const stateData = await stateRes.json();
      const marketData = marketRes.ok ? await marketRes.json() : null;
      const paperData = paperRes.ok ? await paperRes.json() : [];

      if (mounted.current) {
        setState(stateData);
        setMarket(marketData);
        setPaperTrades(paperData);
        setError("");
      }
    } catch (e: any) {
      if (mounted.current) setError(e?.message || "LOAD_FAILED");
    }
  };

  useEffect(() => {
    mounted.current = true;
    fetch("/api/paper/boot").catch(() => {});
    safeLoad();

    const timer = setInterval(safeLoad, 2500);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const run = async (command: string) => {
    try {
      setBusy(true);
      setError("");

      const res = await fetch("/api/control/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) throw new Error("COMMAND_FAILED");
      await res.json();
      await safeLoad();
    } catch (e: any) {
      setError(e?.message || "COMMAND_FAILED");
    } finally {
      setBusy(false);
    }
  };

  const card: React.CSSProperties = {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 20,
    padding: 20,
  };

  const btn: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  };

  const stats = {
    total: paperTrades.length,
    wins: paperTrades.filter((x) => x.status === "WIN").length,
    losses: paperTrades.filter((x) => x.status === "LOSS").length,
    pnl: paperTrades.reduce((s, x) => s + (x.pnl || 0), 0),
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#020617 0%,#0b1120 100%)", color: "white", padding: 24, fontFamily: "Arial" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "#60a5fa", textTransform: "uppercase" }}>Trading Pro Max</div>
          <h1 style={{ fontSize: 42, margin: "10px 0 0" }}>Central Command Control</h1>
          <div style={{ marginTop: 10, color: "#94a3b8" }}>
            Busy: {busy ? "YES" : "NO"} · Status: {state.status} · Last: {state.lastCommand}
          </div>
          {error ? <div style={{ marginTop: 12, color: "#f87171", fontWeight: 700 }}>ERROR: {error}</div> : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Live Market Feed</div>
            <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8 }}>{market?.symbol || "BTC/USDT"}</div>
            <div style={{ fontSize: 40, fontWeight: 900, marginTop: 8, color: "#22c55e" }}>
              {typeof market?.price === "number" ? `$${market.price}` : "LOADING"}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ background: "#020617", padding: "10px 14px", borderRadius: 12 }}>Signal: <b>{market?.signal || "..."}</b></div>
              <div style={{ background: "#020617", padding: "10px 14px", borderRadius: 12 }}>Confidence: <b>{market?.confidence || 0}%</b></div>
              <div style={{ background: "#020617", padding: "10px 14px", borderRadius: 12 }}>Updated: <b>{market?.time ? new Date(market.time).toLocaleTimeString() : "--:--:--"}</b></div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Paper Trading Stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginTop: 14 }}>
              {[
                ["Trades", String(stats.total)],
                ["Wins", String(stats.wins)],
                ["Losses", String(stats.losses)],
                ["PnL", `${stats.pnl > 0 ? "+" : ""}${stats.pnl.toFixed(2)}`],
              ].map(([a, b]) => (
                <div key={a} style={{ background: "#020617", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{a}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 16 }}>
          {[
            ["Engine", state.metrics.engineReadiness + "%"],
            ["Platform", state.metrics.platformReadiness + "%"],
            ["Launch", state.metrics.launchReadiness + "%"],
            ["Private", state.metrics.privateOperatorStack + "%"],
            ["Risk", state.riskMode],
          ].map(([a, b]) => (
            <div key={String(a)} style={card}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{a}</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{b}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Automation</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: state.autoMode ? "#22c55e" : "#ef4444" }}>{state.autoMode ? "ON" : "OFF"}</div>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button onClick={() => run("AUTO_ON")} style={btn}>AUTO ON</button>
              <button onClick={() => run("AUTO_OFF")} style={btn}>AUTO OFF</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>AI Engine</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: state.aiEnabled ? "#22c55e" : "#ef4444" }}>{state.aiEnabled ? "ENABLED" : "DISABLED"}</div>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button onClick={() => run("AI_ON")} style={btn}>AI ON</button>
              <button onClick={() => run("AI_OFF")} style={btn}>AI OFF</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Risk Control</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{state.riskMode}</div>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button onClick={() => run("RISK_SAFE")} style={btn}>SAFE</button>
              <button onClick={() => run("RISK_BALANCED")} style={btn}>BALANCED</button>
              <button onClick={() => run("RISK_AGGRESSIVE")} style={btn}>AGGRESSIVE</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Platform State</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{state.status}</div>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button onClick={() => run("PAUSE_PLATFORM")} style={btn}>PAUSE</button>
              <button onClick={() => run("RESUME_PLATFORM")} style={btn}>RESUME</button>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Paper Trade Feed</div>
          <div style={{ display: "grid", gap: 10, maxHeight: 340, overflow: "auto" }}>
            {paperTrades.length === 0 ? (
              <div style={{ color: "#94a3b8" }}>No paper trades yet</div>
            ) : (
              paperTrades.map((t) => (
                <div key={t.id} style={{ background: "#020617", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ color: "#cbd5e1", fontWeight: 700 }}>{t.symbol} · {t.signal}</div>
                    <div style={{ color: t.status === "WIN" ? "#22c55e" : t.status === "LOSS" ? "#ef4444" : "#94a3b8", fontWeight: 900 }}>{t.status}</div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                    entry {t.entry} {t.exit ? `· exit ${t.exit}` : ""} · confidence {t.confidence}% · pnl {t.pnl > 0 ? "+" : ""}{t.pnl}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Live Log</div>
          <div style={{ display: "grid", gap: 10, maxHeight: 320, overflow: "auto" }}>
            {state.logs.length === 0 ? (
              <div style={{ color: "#94a3b8" }}>No logs yet</div>
            ) : (
              state.logs.map((x, i) => (
                <div key={i} style={{ background: "#020617", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#cbd5e1", fontWeight: 700 }}>{x.text}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{new Date(x.time).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
