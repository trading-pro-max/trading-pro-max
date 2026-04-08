import { getShellSummary } from "../lib/tpm-runtime.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function HomePage() {
  const shell = getShellSummary();
  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>{shell.productName.toUpperCase()}</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>{shell.systemTitle}</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Builder Progress: {shell.progress}% · Builder Readiness: {shell.readiness}% · Modules: {shell.modules.length}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(8,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Cash</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.cash}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Positions</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.positions}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Watchlist</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.watchlist}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Alerts</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.alerts}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Orders</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.orders}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Ledger</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.ledger}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Users</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.users}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Snapshots</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.snapshots}</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Builder Modules</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {shell.modules.map((m) => (
              <a key={m.slug} href={m.href} style={{ ...b, textDecoration:"none", color:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{m.title}</div>
                  <div style={{ color:"#22c55e", fontWeight:900 }}>{m.progress}%</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{m.stage} · {m.status}</div>
                <div style={{ marginTop:6, color:"#cbd5e1", fontSize:13 }}>{m.description}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
