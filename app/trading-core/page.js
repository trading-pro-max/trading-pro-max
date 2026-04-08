import { getTradingCoreStatus } from "../../lib/tpm-master-progress.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function TradingCorePage() {
  const data = getTradingCoreStatus();
  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Real Trading Core</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Global Progress: {data.globalProgress}% · Remaining: {data.remaining}% · Trading Jump: {data.trading.earned}/{data.trading.max}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Global</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.globalProgress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Remaining</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.remaining}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Trading</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.trading.earned}/{data.trading.max}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Production</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.production.earned}/{data.production.max}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Local Core</div><div style={{ fontSize:20, fontWeight:900, marginTop:10 }}>{String(data.localCertified)}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Modules</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.modulesClosed}/{data.modulesTotal}</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Trading Core Checks</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {data.trading.checks.map((x) => (
              <div key={x.key} style={b}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{x.label}</div>
                  <div style={{ color:x.pass ? "#22c55e" : "#f59e0b", fontWeight:900 }}>{x.pass ? "PASS" : "OPEN"}</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>weight: {x.weight}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Language Coverage</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {Object.entries(data.languages || {}).sort((a,b)=>b[1]-a[1]).map(([name, count]) => (
              <div key={name} style={b}>
                <div style={{ fontWeight:900 }}>{name}</div>
                <div style={{ marginTop:8, color:"#22c55e", fontWeight:900 }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
