"use client";

import { useCore } from "@/store/core-ai";

export default function EvolutionPanel() {
  const { evolution } = useCore();

  return (
    <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:20,padding:20}}>
      <div style={{fontSize:12,color:"#60a5fa"}}>SELF EVOLUTION ENGINE</div>
      <h2 style={{fontSize:28,color:"white"}}>Version {evolution.version.toFixed(1)}</h2>

      <div style={{marginTop:16,display:"grid",gap:8}}>
        {evolution.improvements.map((imp, i) => (
          <div key={i} style={{background:"#020617",padding:10,borderRadius:10,color:"#cbd5e1"}}>
            {imp}
          </div>
        ))}
      </div>
    </div>
  );
}
