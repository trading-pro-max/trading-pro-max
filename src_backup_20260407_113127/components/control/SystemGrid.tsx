"use client";

export default function SystemGrid({ state }: { state: any }) {
  const metrics = state?.metrics || {
    engineReadiness: 96,
    platformReadiness: 94,
    launchReadiness: 88,
    privateOperatorStack: 72
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>
      {[
        ["Engine Readiness", metrics.engineReadiness],
        ["Platform Readiness", metrics.platformReadiness],
        ["Launch Readiness", metrics.launchReadiness],
        ["Private Stack", metrics.privateOperatorStack]
      ].map(([label, value]) => (
        <div key={String(label)} style={{background:"#111827",border:"1px solid #1f2937",borderRadius:18,padding:18}}>
          <div style={{fontSize:12,color:"#94a3b8"}}>{label}</div>
          <div style={{fontSize:30,fontWeight:900,color:"white",marginTop:8}}>{value}%</div>
        </div>
      ))}
    </div>
  );
}
