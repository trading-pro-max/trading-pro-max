import { getMasterStatus } from "../../lib/tpm-master.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function MasterControlPage() {
  const data = getMasterStatus();
  const c = card();
  const b = box();
  const s = data.global.stages;

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Master Control</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Build: {data.global.buildProgress}% · Remaining: {data.global.remaining}% · Master: {data.state.masterFile}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Build</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.global.buildProgress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Production</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{s.productionPromotion.progress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Trading</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{s.realTrading.progress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Product</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{s.productSurface.progress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Launch</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{s.launchReadiness.progress}%</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Central Stages</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {[
              ["Production Promotion", s.productionPromotion],
              ["Real Trading", s.realTrading],
              ["Product Surface", s.productSurface],
              ["Launch Readiness", s.launchReadiness]
            ].map(([name, value]) => (
              <div key={name} style={b}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                  <div style={{ fontWeight:900 }}>{name}</div>
                  <div style={{ color:value.closed ? "#22c55e" : "#f59e0b", fontWeight:900 }}>{value.closed ? "CLOSED" : "OPEN"}</div>
                </div>
                <div style={{ marginTop:8, color:"#cbd5e1" }}>{value.progress}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
