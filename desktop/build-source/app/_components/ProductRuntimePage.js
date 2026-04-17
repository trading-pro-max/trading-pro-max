export function ProductRuntimePage({ tag, title, subtitle, items, metrics }) {
  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 }}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>{tag}</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>{title}</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>{subtitle}</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:16 }}>
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 }}>
              <div style={{ color:"#94a3b8", fontSize:12 }}>{key}</div>
              <div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{String(value)}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 }}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Scope</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
            {items.map((x) => (
              <div key={x} style={{ background:"#020617", borderRadius:14, padding:14, color:"#cbd5e1", fontWeight:700 }}>
                {x}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
