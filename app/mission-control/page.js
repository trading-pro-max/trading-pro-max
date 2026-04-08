"use client";

import { useEffect, useMemo, useState } from "react";

export default function MissionControlPage() {
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
      const x = await safeJson("/api/builder/mission");
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

  const hugeJump = async () => {
    const x = await safeJson("/api/builder/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "MAX_SAFE" })
    });
    setData(x.mission || null);
    setError("");
  };

  const promote = async () => {
    const x = await safeJson("/api/builder/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: 95 })
    });
    setData(x.mission || null);
    setError("");
  };

  const toggleBuilder = async (enabled) => {
    const x = await safeJson("/api/builder/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    setData(x.mission || null);
    setError("");
  };

  const card = useMemo(() => ({ background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 }), []);
  const box = useMemo(() => ({ background:"#020617", borderRadius:14, padding:14 }), []);
  const btn = useMemo(() => ({ padding:"12px 14px", borderRadius:14, border:"1px solid #334155", background:"#020617", color:"white", fontWeight:800, cursor:"pointer" }), []);

  if (!data && !error) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white" }}>Loading mission control...</main>;
  }

  if (error && !data) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white", fontFamily:"Arial, sans-serif", padding:24 }}><div style={card}>{error}</div></main>;
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Mission Control</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {data.summary?.progress || 0}% · Readiness: {data.summary?.readiness || 0}% · Remaining Modules: {data.summary?.remainingModules || 0} · Remaining Gap: {data.summary?.remainingGap || 0}
          </div>
          {error ? <div style={{ marginTop:12, color:"#f87171", fontWeight:700 }}>{error}</div> : null}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>PID</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.pid || "NONE"}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Cycle</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.builder?.cycle || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Closed</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.summary?.closedModules || 0}/{data.summary?.totalModules || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Builder</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{String(data.config?.enabled)}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Next Wave</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.nextWave?.length || 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Close Ready</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.closeReady?.length || 0}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Command Deck</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button style={btn} onClick={hugeJump}>MAX SAFE HUGE JUMP</button>
              <button style={btn} onClick={promote}>PROMOTE CLOSE READY</button>
              <button style={btn} onClick={() => toggleBuilder(true)}>ENABLE BUILDER</button>
              <button style={btn} onClick={() => toggleBuilder(false)}>PAUSE BUILDER</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Next Active Module</div>
            <div style={box}>
              {!data.builder?.activeModule ? "IDLE" : (
                <>
                  <div style={{ fontWeight:900 }}>{data.builder.activeModule.title}</div>
                  <div style={{ marginTop:6, color:"#cbd5e1" }}>
                    progress {data.builder.activeModule.progress}% · readiness {data.builder.activeModule.readiness}%
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Critical Blockers</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:12 }}>
            {(data.blockers || []).map((m) => (
              <div key={m.slug} style={box}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{m.title}</div>
                  <div style={{ color:"#f59e0b", fontWeight:900 }}>{m.progress}%</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{m.stage}</div>
                <div style={{ marginTop:6, color:"#cbd5e1" }}>{m.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Next Wave</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
            {(data.nextWave || []).map((m) => (
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
