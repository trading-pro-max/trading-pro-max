import { buildLaunchpadStatus } from "../lib/local-bus.js";

export const dynamic = "force-dynamic";

function cardStyle() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function boxStyle() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function HomePage() {
  const status = buildLaunchpadStatus();
  const card = cardStyle();
  const box = boxStyle();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={card}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Local Launchpad</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {status.product.progress}% · Final Readiness: {status.finalReadiness}% · Status: {status.core.status}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Cash</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace.cash}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Watchlist</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace.watchlist}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Alerts</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace.alerts}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Orders</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace.orders}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Ledger</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.workspace.ledger}</div></div>
          <div style={card}><div style={{ color:"#94a3b8", fontSize:12 }}>Snapshots</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{status.latestSnapshot ? 1 : 0}</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={card}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Core</div>
            <div style={{ display:"grid", gap:10 }}>
              <div style={box}>Auto: <b>{String(status.core.autoMode)}</b></div>
              <div style={box}>AI: <b>{String(status.core.aiEnabled)}</b></div>
              <div style={box}>Risk: <b>{status.core.riskMode}</b></div>
              <div style={box}>Guardian: <b>{status.guardian.status}</b></div>
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
