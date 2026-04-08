"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const safeJson = async (url, options) => {
    const res = await fetch(url, options || { cache: "no-store" });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data?.error || text);
      return data;
    } catch {
      throw new Error(text);
    }
  };

  const load = async () => {
    try {
      const x = await safeJson("/api/launchpad/status");
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

  const boot = async (action) => {
    try {
      const x = await safeJson("/api/launchpad/boot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      setStatus(x.status || null);
      setError("");
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  const card = { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
  const box = { background:"#020617", borderRadius:14, padding:14 };
  const btn = { padding:"12px 14px", borderRadius:14, border:"1px solid #334155", background:"#020617", color:"white", fontWeight:800, cursor:"pointer" };

  if (!status && !error) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white" }}>Loading launchpad...</main>;
  }

  if (error) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white", fontFamily:"Arial, sans-serif" }}><div style={card}>{error}</div></main>;
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Local Launchpad</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {status.product?.progress ?? 0}% · Final Readiness: {status.finalReadiness ?? 0}% · Status: {status.core?.status}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Cash</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace?.cash ?? 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Watchlist</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace?.watchlist ?? 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Alerts</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace?.alerts ?? 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Orders</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace?.orders ?? 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Ledger</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace?.ledger ?? 0}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Snapshots</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.latestSnapshot ? 1 : 0}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Boot Actions</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
              <button style={btn} onClick={() => boot("FULL_BOOT")}>FULL BOOT</button>
              <button style={btn} onClick={() => boot("SAFE_BOOT")}>SAFE BOOT</button>
              <button style={btn} onClick={() => boot("QUIET_MODE")}>QUIET MODE</button>
              <button style={btn} onClick={() => boot("RESET_SESSION")}>RESET SESSION</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Fast Navigation</div>
            <div style={{ display:"grid", gap:10 }}>
              <a href="/local-command" style={{ ...box, textDecoration:"none", color:"white", fontWeight:900 }}>Local Command</a>
              <a href="/" style={{ ...box, textDecoration:"none", color:"white", fontWeight:900 }}>Launchpad</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
