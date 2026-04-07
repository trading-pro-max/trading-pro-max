"use client";

import { useEffect, useState } from "react";

export default function LocalCommandPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const safeJson = async (url, options) => {
    const res = await fetch(url, options || { cache: "no-store" });
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(url + " -> " + text); }
  };

  const load = async () => {
    try {
      const x = await safeJson("/api/local-command/status");
      setStatus(x);
      setError("");
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  const runMode = async (mode) => {
    await safeJson("/api/local-command/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode })
    });
    await load();
  };

  const card = { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
  const box = { background:"#020617", borderRadius:14, padding:14 };
  const btn = { padding:"12px 14px", borderRadius:14, border:"1px solid #334155", background:"#020617", color:"white", fontWeight:800, cursor:"pointer" };

  if (!status) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white" }}>Loading local command...</main>;
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:44, margin:"10px 0 0" }}>Local Command Bus</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {status.product?.progress ?? "--"}% · Command Readiness: {status.commandReadiness ?? "--"}% · Certified: {String(status.summary?.certified)}
          </div>
          {error ? <div style={{ marginTop:12, color:"#f87171", fontWeight:700 }}>{error}</div> : null}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Final</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary?.finalReadiness ?? 0}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Launchpad</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary?.launchpad ?? 0}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Factory</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary?.factory ?? 0}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Scenarios</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary?.scenarios ?? 0}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Snapshots</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary?.snapshots ?? 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Certified</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary?.certified ? "YES" : "NO"}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Command Presets</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
              {(status.commands || []).map((x) => (
                <button key={x.key} style={btn} onClick={() => runMode(x.key)}>
                  {x.title}
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Latest Snapshot</div>
            {!status.latestSnapshot ? <div style={box}>No snapshot yet.</div> : (
              <div style={{ display:"grid", gap:10 }}>
                <div style={box}>Label: <b>{status.latestSnapshot.label}</b></div>
                <div style={box}>ID: <b>{status.latestSnapshot.id}</b></div>
                <div style={box}>Created: <b>{new Date(status.latestSnapshot.createdAt).toLocaleString()}</b></div>
              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Command Catalog</div>
          <div style={{ display:"grid", gap:10 }}>
            {(status.commands || []).map((x) => (
              <div key={x.key} style={box}>
                <div style={{ fontWeight:900 }}>{x.title}</div>
                <div style={{ marginTop:6, color:"#cbd5e1" }}>{x.detail}</div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{x.key}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
