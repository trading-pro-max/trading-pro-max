"use client";

export default function NodeBoard() {
  const nodes = [
    { name: "Signals Engine", status: "ONLINE" },
    { name: "Risk Brain", status: "ONLINE" },
    { name: "Revenue Layer", status: "ONLINE" },
    { name: "Launch Funnel", status: "ONLINE" }
  ];

  return (
    <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:20,padding:20}}>
      <div style={{fontSize:20,fontWeight:900,color:"white",marginBottom:16}}>Core Nodes</div>
      <div style={{display:"grid",gap:12}}>
        {nodes.map((n) => (
          <div key={n.name} style={{display:"flex",justifyContent:"space-between",background:"#020617",padding:14,borderRadius:14}}>
            <div style={{color:"white"}}>{n.name}</div>
            <div style={{color:"#22c55e",fontWeight:800}}>{n.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
