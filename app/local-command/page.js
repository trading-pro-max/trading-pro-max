import { buildLocalCommandStatus } from "../../lib/local-bus.js";

export const dynamic = "force-dynamic";

function cardStyle() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function boxStyle() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function LocalCommandPage() {
  const status = buildLocalCommandStatus();
  const card = cardStyle();
  const box = boxStyle();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:44, margin:"10px 0 0" }}>Local Command Bus</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {status.product.progress}% · Command Readiness: {status.commandReadiness}% · Certified: {String(status.summary.certified)}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Final</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary.finalReadiness}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Launchpad</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary.launchpad}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Factory</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary.factory}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Scenarios</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary.scenarios}%</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Snapshots</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary.snapshots}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Certified</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.summary.certified ? "YES" : "NO"}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Command Catalog</div>
            <div style={{ display:"grid", gap:10 }}>
              {status.commands.map((x) => (
                <div key={x.key} style={box}>
                  <div style={{ fontWeight:900 }}>{x.title}</div>
                  <div style={{ marginTop:6, color:"#cbd5e1" }}>{x.detail}</div>
                  <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{x.key}</div>
                </div>
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
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Metrics</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            <div style={box}>Cash: <b>{status.metrics.cash}</b></div>
            <div style={box}>Positions: <b>{status.metrics.positions}</b></div>
            <div style={box}>Watchlist: <b>{status.metrics.watchlist}</b></div>
            <div style={box}>Alerts: <b>{status.metrics.alerts}</b></div>
            <div style={box}>Orders: <b>{status.metrics.orders}</b></div>
            <div style={box}>Ledger: <b>{status.metrics.ledger}</b></div>
            <div style={box}>Users: <b>{status.metrics.users}</b></div>
            <div style={box}>Brokers: <b>{status.metrics.brokers}</b></div>
          </div>
        </div>
      </div>
    </main>
  );
}
