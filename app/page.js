"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState(null);
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
    await safeJson("/api/launchpad/boot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    await load();
  };

  const card = { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
  const box = { background:"#020617", borderRadius:14, padding:14 };
  const btn = { padding:"12px 14px", borderRadius:14, border:"1px solid #334155", background:"#020617", color:"white", fontWeight:800, cursor:"pointer" };

  if (!status) {
    return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white" }}>Loading launchpad...</main>;
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:44, margin:"10px 0 0" }}>Local Launchpad</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {status.product.progress}% · Final Readiness: {status.finalReadiness}% · Engine: {status.engine.running ? "RUNNING" : "STOPPED"} · Guardian: {status.guardian.status}
          </div>
          {error ? <div style={{ marginTop:12, color:"#f87171", fontWeight:700 }}>{error}</div> : null}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Local OS</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.localOS.uiScore}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>QA</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.qa.readiness}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Release</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.release.releaseReadiness}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Watchlist</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.localOS.watchlist}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Orders</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.localOS.orders}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Brokers</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.localOS.brokers}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Boot Presets</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
              <button style={btn} onClick={() => boot("FULL_BOOT")}>FULL BOOT</button>
              <button style={btn} onClick={() => boot("SAFE_BOOT")}>SAFE BOOT</button>
              <button style={btn} onClick={() => boot("QUIET_MODE")}>QUIET MODE</button>
              <button style={btn} onClick={() => boot("RESET_SESSION")}>RESET SESSION</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Core Posture</div>
            <div style={{ display:"grid", gap:10 }}>
              <div style={box}>Status: <b>{status.core.status}</b></div>
              <div style={box}>Auto: <b>{String(status.core.autoMode)}</b> · AI: <b>{String(status.core.aiEnabled)}</b></div>
              <div style={box}>Risk: <b>{status.core.riskMode}</b> · Session: <b>{String(status.session.active)}</b></div>
              <div style={box}>Guardian: <b>{status.guardian.status}</b> · Live: <b>{String(status.guardian.liveTradingEnabled)}</b></div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Fast Navigation</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {[
              ["/local-os","Local OS"],
              ["/local-qa","Local QA"],
              ["/release-center","Release"],
              ["/intelligence","Intelligence"],
              ["/desktop-hq","Desktop HQ"],
              ["/mobile-hq","Mobile HQ"],
              ["/operator-os","Operator OS"],
              ["/workspace","Workspace"],
              ["/execution","Execution"],
              ["/brokers","Brokers"],
              ["/analytics","Analytics"],
              ["/ops","Ops"]
            ].map((x) => (
              <a key={x[0]} href={x[0]} style={{ ...box, textDecoration:"none", color:"white", fontWeight:900 }}>
                {x[1]}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
