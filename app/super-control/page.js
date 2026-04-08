import { getSuperStatus } from "../../lib/tpm-super-orchestrator.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function SuperControlPage() {
  const data = getSuperStatus();
  const c = card();
  const b = box();
  const phases = [
    { key: "production", label: "Production", value: data.production },
    { key: "trading", label: "Trading", value: data.trading },
    { key: "product", label: "Product", value: data.product },
    { key: "launch", label: "Launch", value: data.launch }
  ];

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Super Control</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Global Progress: {data.globalProgress}% · Remaining: {data.remaining}% · Local Core: {String(data.localCertified)}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Global</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.globalProgress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Remaining</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.remaining}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Modules</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.modulesClosed}/{data.modulesTotal}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Production</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.production.earned}/{data.production.max}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Trading</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.trading.earned}/{data.trading.max}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Launch</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.launch.earned}/{data.launch.max}</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Phase Closure</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {phases.map((x) => (
              <div key={x.key} style={b}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                  <div style={{ fontWeight:900 }}>{x.label}</div>
                  <div style={{ color:x.value.closed ? "#22c55e" : "#f59e0b", fontWeight:900 }}>
                    {x.value.closed ? "CLOSED" : "OPEN"}
                  </div>
                </div>
                <div style={{ marginTop:8, color:"#cbd5e1" }}>{x.value.earned}/{x.value.max}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={c}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Runtime Links</div>
            <div style={{ display:"grid", gap:10 }}>
              <a href="/paper-trading" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Paper Trading</a>
              <a href="/identity" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Identity</a>
              <a href="/workspace" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Workspace</a>
              <a href="/client-portal" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Client Portal</a>
              <a href="/operator-os" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Operator OS</a>
              <a href="/billing" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Billing</a>
              <a href="/desktop-hq" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Desktop HQ</a>
              <a href="/mobile-hq" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Mobile HQ</a>
              <a href="/security-center" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Security Center</a>
              <a href="/launch-readiness" style={{ ...b, textDecoration:"none", color:"white", fontWeight:900 }}>Launch Readiness</a>
            </div>
          </div>

          <div style={c}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Language Coverage</div>
            <div style={{ display:"grid", gap:10 }}>
              {Object.entries(data.languages || {}).sort((a,b)=>b[1]-a[1]).map(([name, count]) => (
                <div key={name} style={b}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                    <div style={{ fontWeight:900 }}>{name}</div>
                    <div style={{ color:"#22c55e", fontWeight:900 }}>{count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
