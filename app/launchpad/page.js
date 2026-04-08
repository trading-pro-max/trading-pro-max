import { getModuleDataBySlug } from "../../lib/tpm-runtime.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function LaunchpadPage() {
  const data = getModuleDataBySlug("launchpad");
  const c = card();
  const b = box();

  if (!data) {
    return (
      <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#020617", color:"white", fontFamily:"Arial, sans-serif" }}>
        <div style={c}>launchpad module not found</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>{data.productName.toUpperCase()}</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>{data.module.title}</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Stage: {data.module.stage} · Status: {data.module.status} · Progress: {data.module.progress}% · Readiness: {data.module.readiness}%
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Build</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.build}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Stability</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.stability}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Data</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.data}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Automation</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.automation}%</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Description</div>
          <div style={b}>{data.module.description}</div>
        </div>
      </div>
    </main>
  );
}
