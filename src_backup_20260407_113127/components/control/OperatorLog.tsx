"use client";

export default function OperatorLog({ items }: { items: string[] }) {
  return (
    <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:20,padding:20}}>
      <div style={{fontSize:20,fontWeight:900,color:"white",marginBottom:16}}>Operator Log</div>
      <div style={{display:"grid",gap:10}}>
        {items.length === 0 ? (
          <div style={{color:"#94a3b8"}}>No commands yet</div>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{background:"#020617",padding:12,borderRadius:12,color:"#cbd5e1"}}>{item}</div>
          ))
        )}
      </div>
    </div>
  );
}
