import { getBuilderStatus } from "../../lib/tpm-runtime.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function BuilderPage() {
  const data = getBuilderStatus();
  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>{data.productName.toUpperCase()}</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Builder</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Running: {String(data.builder.running)} · Cycle: {data.builder.cycle || 0} · Avg Progress: {data.builder.avgProgress || data.shell.progress}% · Avg Readiness: {data.builder.avgReadiness || data.shell.readiness}%
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>PID</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.pid || "NONE"}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Cycle</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.builder.cycle || 0}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Closed</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.builder.closedModules || 0}/{data.builder.totalModules || data.manifest.modules.length}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Progress</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.builder.avgProgress || data.shell.progress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Readiness</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.builder.avgReadiness || data.shell.readiness}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Active</div><div style={{ fontSize:20, fontWeight:900, marginTop:10 }}>{data.builder.activeModule?.title || "IDLE"}</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Modules</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {data.shell.modules.map((m) => (
              <a key={m.slug} href={m.href} style={{ ...b, textDecoration:"none", color:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{m.title}</div>
                  <div style={{ color:"#22c55e", fontWeight:900 }}>{m.progress}%</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{m.stage} · {m.status}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
