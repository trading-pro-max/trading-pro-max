"use client";

import { useEffect, useState } from "react";

export default function LiveSignals() {
  const [signals, setSignals] = useState<any[]>([]);

  const load = async () => {
    const res = await fetch("/api/live-signals");
    const data = await res.json();
    setSignals(data.signals || []);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background:"#111827",
      border:"1px solid #1f2937",
      borderRadius:20,
      padding:20
    }}>
      <h3 style={{marginBottom:15}}>?? AI LIVE SIGNALS</h3>

      <div style={{display:"grid",gap:12}}>
        {signals.map((s,i)=>(
          <div key={i} style={{
            padding:15,
            borderRadius:12,
            background:"#0b1220",
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center"
          }}>
            <div>
              <div style={{fontWeight:800}}>{s.symbol}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{s.time}</div>
            </div>

            <div style={{
              color: s.signal==="BUY" ? "#22c55e" :
                     s.signal==="SELL" ? "#ef4444" : "#facc15",
              fontWeight:800
            }}>
              {s.signal}
            </div>

            <div style={{fontWeight:700}}>
              {s.confidence}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
