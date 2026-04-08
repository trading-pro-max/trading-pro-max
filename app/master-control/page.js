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

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          {[
            ["Build", data.global.buildProgress],
            ["Production", s.productionPromotion.progress],
            ["Trading", s.realTrading.progress],
            ["Product", s.productSurface.progress],
            ["Launch", s.launchReadiness.progress],
            ["Remote", s.remotePromotion.progress]
          ].map(([name, value]) => (
            <div key={name} style={c}>
              <div style={{ color:"#94a3b8", fontSize:12 }}>{name}</div>
              <div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{value}%</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
