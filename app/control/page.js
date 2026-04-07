"use client";

import { useEffect, useState } from "react";

export default function ControlPage() {
  const [state, setState] = useState(null);
  const [market, setMarket] = useState(null);
  const [engine, setEngine] = useState(null);
  const [paper, setPaper] = useState([]);
  const [paperStats, setPaperStats] = useState({ total: 0, wins: 0, losses: 0, pnl: 0, winRate: 0 });
  const [guardian, setGuardian] = useState(null);
  const [error, setError] = useState("");

  const safeJson = async (url, options) => {
    const res = await fetch(url, options || { cache: "no-store" });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(url + " -> " + text);
    }
  };

  const load = async () => {
    try {
      const [s, m, e, p, ps, g] = await Promise.all([
        safeJson("/api/control/state"),
        safeJson("/api/market/live"),
        safeJson("/api/engine/status"),
        safeJson("/api/paper/history"),
        safeJson("/api/paper/stats"),
        safeJson("/api/guardian/status")
      ]);

      setState(s);
      setMarket(m);
      setEngine(e.engine || e);
      setPaper(Array.isArray(p) ? p : []);
      setPaperStats(ps || { total: 0, wins: 0, losses: 0, pnl: 0, winRate: 0 });
      setGuardian(g);
      setError("");
    } catch (err) {
      setError(String(err?.message || err));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, []);

  const run = async (command) => {
    await safeJson("/api/control/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });
    await load();
  };

  const engineAction = async (action) => {
    await safeJson("/api/engine/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    await load();
  };

  const guardAction = async (action) => {
    await safeJson("/api/guardian/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    await load();
  };

  if (!state) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white" }}>Loading Mission Control...</main>;
  }

  const latestTrade = paper.length ? paper[0] : null;
  const engineRunning = !!engine?.running;
  const protection = guardian?.protection || state.protection || {};

  const shell = {
    minHeight:"100vh",
    background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",
    color:"white",
    padding:24,
    fontFamily:"Arial, sans-serif"
  };

  const grid = { maxWidth:1500, margin:"0 auto", display:"grid", gap:20 };
  const card = { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20, boxShadow:"0 10px 30px rgba(0,0,0,.25)" };
  const btn = { padding:"12px 14px", borderRadius:14, border:"1px solid #334155", background:"#020617", color:"white", fontWeight:800, cursor:"pointer" };
  const metric = { background:"#020617", borderRadius:16, padding:16 };

  return (
    <main style={shell}>
      <div style={grid}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Mission Control</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Status: {state.status} · Last: {state.lastCommand} · Engine: {engineRunning ? "RUNNING" : "STOPPED"}
          </div>
          {error ? <div style={{ marginTop:12, color:"#f87171", fontWeight:700 }}>{error}</div> : null}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>Live Market</div>
            <div style={{ fontSize:38, fontWeight:900, marginTop:8 }}>{market?.symbol || "BTC/USDT"}</div>
            <div style={{ fontSize:46, fontWeight:900, marginTop:8, color:"#22c55e" }}>${market?.price ?? "--"}</div>
            <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}>
              <div style={metric}>Signal: <b>{market?.signal || "--"}</b></div>
              <div style={metric}>Confidence: <b>{market?.confidence ?? 0}%</b></div>
              <div style={metric}>Risk: <b>{state.riskMode}</b></div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>Core Actions</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10, marginTop:14 }}>
              <button onClick={() => engineAction("start")} style={btn}>ENGINE START</button>
              <button onClick={() => engineAction("stop")} style={btn}>ENGINE STOP</button>
              <button onClick={() => run("AUTO_ON")} style={btn}>AUTO ON</button>
              <button onClick={() => run("AUTO_OFF")} style={btn}>AUTO OFF</button>
              <button onClick={() => run("AI_ON")} style={btn}>AI ON</button>
              <button onClick={() => run("AI_OFF")} style={btn}>AI OFF</button>
              <button onClick={() => run("RISK_SAFE")} style={btn}>SAFE</button>
              <button onClick={() => run("RISK_BALANCED")} style={btn}>BALANCED</button>
              <button onClick={() => run("RISK_AGGRESSIVE")} style={btn}>AGGRESSIVE</button>
              <button onClick={() => run("SYSTEM_SCAN")} style={btn}>SYSTEM SCAN</button>
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>Guardian Shield</div>
            <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Guardian</div><div style={{ fontSize:24, fontWeight:900, marginTop:6 }}>{protection.guardianStatus || "--"}</div></div>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Session</div><div style={{ fontSize:24, fontWeight:900, marginTop:6 }}>{protection.sessionMode || "--"}</div></div>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Live Trading</div><div style={{ fontSize:24, fontWeight:900, marginTop:6 }}>{String(protection.liveTradingEnabled)}</div></div>
            </div>

            <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
              <button onClick={() => guardAction("KILL_SWITCH_ON")} style={btn}>KILL SWITCH ON</button>
              <button onClick={() => guardAction("KILL_SWITCH_OFF")} style={btn}>KILL SWITCH OFF</button>
              <button onClick={() => guardAction("LIVE_ENABLE")} style={btn}>ENABLE LIVE</button>
              <button onClick={() => guardAction("LIVE_DISABLE")} style={btn}>DISABLE LIVE</button>
              <button onClick={() => guardAction("LOCK_RISK")} style={btn}>LOCK RISK</button>
              <button onClick={() => guardAction("UNLOCK_RISK")} style={btn}>UNLOCK RISK</button>
            </div>

            <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:12 }}>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Max Daily Loss</div><div style={{ fontSize:24, fontWeight:900, marginTop:6 }}>{protection.maxDailyLoss}</div></div>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Max Open Positions</div><div style={{ fontSize:24, fontWeight:900, marginTop:6 }}>{protection.maxOpenPositions}</div></div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>AI Engine</div>
            <div style={{ marginTop:12, fontSize:30, fontWeight:900, color: engineRunning ? "#22c55e" : "#ef4444" }}>
              {engineRunning ? "RUNNING" : "STOPPED"}
            </div>
            <div style={{ marginTop:8, color:"#94a3b8" }}>Ticks: {engine?.ticks ?? 0}</div>
            <div style={{ marginTop:4, color:"#94a3b8" }}>Last Tick: {engine?.lastTick ? new Date(engine.lastTick).toLocaleString() : "--"}</div>
            <div style={{ marginTop:4, color:"#94a3b8" }}>Last Signal: {engine?.lastSignal || "--"}</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Engine Readiness</div><div style={{ fontSize:30, fontWeight:900, marginTop:6 }}>{state.metrics.engineReadiness}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Platform Readiness</div><div style={{ fontSize:30, fontWeight:900, marginTop:6 }}>{state.metrics.platformReadiness}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Launch Readiness</div><div style={{ fontSize:30, fontWeight:900, marginTop:6 }}>{state.metrics.launchReadiness}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Private Operator Stack</div><div style={{ fontSize:30, fontWeight:900, marginTop:6 }}>{state.metrics.privateOperatorStack}%</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>Paper Analytics</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12, marginTop:14 }}>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Trades</div><div style={{ fontSize:26, fontWeight:900, marginTop:6 }}>{paperStats.total}</div></div>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Wins</div><div style={{ fontSize:26, fontWeight:900, marginTop:6 }}>{paperStats.wins}</div></div>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>Win Rate</div><div style={{ fontSize:26, fontWeight:900, marginTop:6 }}>{paperStats.winRate}%</div></div>
              <div style={metric}><div style={{ color:"#94a3b8", fontSize:12 }}>PnL</div><div style={{ fontSize:26, fontWeight:900, marginTop:6, color: paperStats.pnl >= 0 ? "#22c55e" : "#ef4444" }}>{paperStats.pnl}</div></div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>Latest Paper Trade</div>
            {latestTrade ? (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:26, fontWeight:900 }}>{latestTrade.symbol}</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:10 }}>
                  <div style={metric}>Signal: <b>{latestTrade.signal}</b></div>
                  <div style={metric}>Entry: <b>{latestTrade.entry}</b></div>
                  <div style={metric}>Exit: <b>{latestTrade.exit}</b></div>
                  <div style={metric}>PnL: <b>{latestTrade.pnl}</b></div>
                </div>
                <div style={{ marginTop:10, color:"#94a3b8", fontSize:12 }}>{new Date(latestTrade.createdAt).toLocaleString()}</div>
              </div>
            ) : (
              <div style={{ marginTop:14, color:"#94a3b8" }}>No paper trades yet.</div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:14 }}>Recent Paper Trades</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ color:"#94a3b8", fontSize:12 }}>
                  <th style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", textAlign:"left" }}>Symbol</th>
                  <th style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", textAlign:"left" }}>Signal</th>
                  <th style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", textAlign:"left" }}>Entry</th>
                  <th style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", textAlign:"left" }}>Exit</th>
                  <th style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", textAlign:"left" }}>PnL</th>
                  <th style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", textAlign:"left" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {(paper || []).slice(0, 8).map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937" }}>{t.symbol}</td>
                    <td style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937" }}>{t.signal}</td>
                    <td style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937" }}>{t.entry}</td>
                    <td style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937" }}>{t.exit}</td>
                    <td style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937", color: Number(t.pnl) >= 0 ? "#22c55e" : "#ef4444", fontWeight:900 }}>{t.pnl}</td>
                    <td style={{ padding:"12px 10px", borderBottom:"1px solid #1f2937" }}>{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:14 }}>Live Log</div>
          <div style={{ display:"grid", gap:10 }}>
            {(state.logs || []).map((x, i) => (
              <div key={i} style={{ background:"#020617", borderRadius:12, padding:12 }}>
                <div style={{ color:"#cbd5e1", fontWeight:700 }}>{x.text}</div>
                <div style={{ color:"#94a3b8", fontSize:12, marginTop:4 }}>{new Date(x.time).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
