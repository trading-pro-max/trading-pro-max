import { getSuperStatus } from "../../lib/tpm-final-launch-safe.mjs";

export const dynamic = "force-dynamic";

export default function SuperControlPage() {
  const data = getSuperStatus();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1400, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 }}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>Super Control</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Global: {data.globalProgress}% · Remaining: {data.remaining}% · Certification: {data.certificationVerdict}
          </div>
        </div>
      </div>
    </main>
  );
}
