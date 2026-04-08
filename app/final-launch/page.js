import { getFinalLaunchStatus } from "../../lib/tpm-final-launch.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function FinalLaunchPage() {
  const data = getFinalLaunchStatus();
  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Final Launch</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Verdict: {data.verdict} · Score: {data.score}% · Global: {data.global.globalProgress}% · Remaining: {data.global.remaining}%
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Global</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.global.globalProgress}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Remaining</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.global.remaining}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Security</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.launch.securityScore}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Launch</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.launch.launchScore}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Product Cycle</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.product.cycle}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Launch Cycle</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.launch.cycle}</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Certification Gates</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
            {data.gates.map((g) => (
              <div key={g.key} style={b}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                  <div style={{ fontWeight:900 }}>{g.label}</div>
                  <div style={{ color:g.pass ? "#22c55e" : "#f59e0b", fontWeight:900 }}>{g.pass ? "PASS" : "OPEN"}</div>
                </div>
                <div style={{ marginTop:8, color:"#cbd5e1" }}>current: <b>{String(g.current)}</b></div>
                <div style={{ marginTop:4, color:"#94a3b8", fontSize:12 }}>target: {String(g.target)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Run Commands</div>
          <div style={{ display:"grid", gap:10 }}>
            <div style={b}>Status API: <b>/api/final-launch/status</b></div>
            <div style={b}>Run API: <b>POST /api/final-launch/run</b></div>
            <div style={b}>Promote API: <b>POST /api/final-launch/promote</b></div>
            <div style={b}>Certify API: <b>POST /api/final-launch/certify</b></div>
            <div style={b}>CLI: <b>npm run tpm:finaljump</b></div>
          </div>
        </div>
      </div>
    </main>
  );
}
