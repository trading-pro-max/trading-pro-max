"use client";

import { useEffect, useState } from "react";

export default function ControlPage() {
  const [state, setState] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);

  const load = async () => {
    const [s, m] = await Promise.all([
      fetch("/api/control/state", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/market/live", { cache: "no-store" }).then(r => r.json())
    ]);
    setState(s);
    setMarket(m);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, []);

  const run = async (command: string) => {
    await fetch("/api/control/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });
    await load();
  };

  const card: React.CSSProperties = {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 20,
    padding: 20
  };

  const btn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    fontWeight: 800,
    cursor: "pointer"
  };

  if (!state) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "white" }}>Loading control...</main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#020617 0%,#0b1120 100%)", color: "white", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={card}>
          <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize: 40, margin: "10px 0 0" }}>Central Command Control</h1>
          <div style={{ marginTop: 10, color: "#94a3b8" }}>
            Status: {state.status} · Last: {state.lastCommand}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Live Market Feed</div>
            <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8 }}>{market?.symbol || "BTC/USDT"}</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8, color: "#22c55e" }}>${market?.price ?? "--"}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ background: "#020617", padding: "10px 14px", borderRadius: 12 }}>Signal: <b>{market?.signal || "--"}</b></div>
              <div style={{ background: "#020617", padding: "10px 14px", borderRadius: 12 }}>Confidence: <b>{market?.confidence ?? 0}%</b></div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Fast Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 14 }}>
              <button onClick={() => run("SYSTEM_SCAN")} style={btn}>SYSTEM SCAN</button>
              <button onClick={() => run("AUTO_ON")} style={btn}>AUTO ON</button>
              <button onClick={() => run("AUTO_OFF")} style={btn}>AUTO OFF</button>
              <button onClick={() => run("AI_ON")} style={btn}>AI ON</button>
              <button onClick={() => run("AI_OFF")} style={btn}>AI OFF</button>
              <button onClick={() => run("RISK_SAFE")} style={btn}>SAFE</button>
              <button onClick={() => run("RISK_BALANCED")} style={btn}>BALANCED</button>
              <button onClick={() => run("RISK_AGGRESSIVE")} style={btn}>AGGRESSIVE</button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16 }}>
          <div style={card}><div style={{ color: "#94a3b8", fontSize: 12 }}>Engine</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{state.metrics.engineReadiness}%</div></div>
          <div style={card}><div style={{ color: "#94a3b8", fontSize: 12 }}>Platform</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{state.metrics.platformReadiness}%</div></div>
          <div style={card}><div style={{ color: "#94a3b8", fontSize: 12 }}>Launch</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{state.metrics.launchReadiness}%</div></div>
          <div style={card}><div style={{ color: "#94a3b8", fontSize: 12 }}>Risk</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{state.riskMode}</div></div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Live Log</div>
          <div style={{ display: "grid", gap: 10 }}>
            {(state.logs || []).map((x: any, i: number) => (
              <div key={i} style={{ background: "#020617", borderRadius: 12, padding: 12 }}>
                <div style={{ color: "#cbd5e1", fontWeight: 700 }}>{x.text}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{new Date(x.time).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}