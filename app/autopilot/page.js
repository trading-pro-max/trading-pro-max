"use client";

import { useEffect, useMemo, useState } from "react";

export default function AutopilotPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const safeJson = async (url, options) => {
    const res = await fetch(url, options || { cache: "no-store" });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (!res.ok) throw new Error(json?.error || text);
      return json;
    } catch {
      throw new Error(text);
    }
  };

  const load = async () => {
    try {
      const x = await safeJson("/api/builder/autopilot");
      setData(x);
      setError("");
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const runNow = async () => {
    const x = await safeJson("/api/builder/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" })
    });
    setData(x);
    setError("");
  };

  const setEnabled = async (enabled) => {
    const x = await safeJson("/api/builder/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "config", enabled })
    });
    setData(x);
    setError("");
  };

  const card = useMemo(() => ({ background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 }), []);
  const box = useMemo(() => ({ background:"#020617", borderRadius:14, padding:14 }), []);
  const btn = useMemo(() => ({ padding:"12px 14px", borderRadius:14, border:"1px solid #334155", background:"#020617", color:"white", fontWeight:800, cursor:"pointer" }), []);

  if (!data && !error) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white" }}>Loading autopilot...</main>;
  }

  if (error && !data) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white", fontFamily:"Arial, sans-serif", padding:24 }}><div style={card}>{error}</div></main>;
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Autopilot Director</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Enabled: {String(data.autopilot?.enabled)} · Mode: {data.autopilot?.mode} · Progress: {data.mission?.summary?.progress || 0}% · Readiness: {data.mission?.summary?.readiness || 0}%
          </div>
          {error ? <div style={{ marginTop:12, color:"#f87171", fontWeight:700 }}>{error}</div> : null}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Closed</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.mission?.summary?.closedModules || 0}/{data.mission?.summary?.totalModules || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Remaining</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.mission?.summary?.remainingModules || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Gap</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.mission?.summary?.remainingGap || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Cycle</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.mission?.builder?.cycle || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Last Jump</div><div style={{ fontSize:20, fontWeight:900, marginTop:10 }}>{data.autopilot?.lastAction?.jumpTouched || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Last Promote</div><div style={{ fontSize:20, fontWeight:900, marginTop:10 }}>{data.autopilot?.lastAction?.promoteTouched || 0}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Command Deck</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button style={btn} onClick={runNow}>RUN AUTOPILOT NOW</button>
              <button style={btn} onClick={() => setEnabled(true)}>ENABLE</button>
              <button style={btn} onClick={() => setEnabled(false)}>PAUSE</button>
              <a href="/mission-control" style={{ ...btn, textDecoration:"none" }}>MISSION CONTROL</a>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Next Active</div>
            <div style={box}>
              {!data.mission?.builder?.activeModule ? "IDLE" : (
                <>
                  <div style={{ fontWeight:900 }}>{data.mission.builder.activeModule.title}</div>
                  <div style={{ marginTop:6, color:"#cbd5e1" }}>
                    progress {data.mission.builder.activeModule.progress}% · readiness {data.mission.builder.activeModule.readiness}%
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Next Wave</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
            {(data.mission?.nextWave || []).map((m) => (
              <div key={m.slug} style={box}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{m.title}</div>
                  <div style={{ color:"#22c55e", fontWeight:900 }}>{m.progress}%</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{m.stage} · {m.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
