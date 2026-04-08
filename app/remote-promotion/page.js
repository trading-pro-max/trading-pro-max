import { getRemotePromotionStatus } from "../../lib/tpm-remote-promotion.mjs";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function RemotePromotionPage() {
  const data = getRemotePromotionStatus();
  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Remote Promotion</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Progress: {data.progress}% · Remaining: {data.remaining}% · Verdict: {data.verdict}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Code Ready</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{String(data.codeReady)}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Secrets Present</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{String(data.liveSecretsPresent)}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Live Deploy</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{String(data.liveDeployPossible)}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Progress</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.progress}%</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Remote Checks</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
            {data.checks.map((x) => (
              <div key={x.key} style={b}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                  <div style={{ fontWeight:900 }}>{x.label}</div>
                  <div style={{ color:x.pass ? "#22c55e" : "#f59e0b", fontWeight:900 }}>{x.pass ? "PASS" : "OPEN"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
