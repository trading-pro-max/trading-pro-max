"use client";
import { useEffect, useState } from "react";

export default function TradingPanel() {
  const [trades,setTrades] = useState<any[]>([]);

  const load = async () => {
    const res = await fetch("/api/trading/history",{cache:"no-store"});
    const data = await res.json();
    setTrades(data);
  };

  const run = async () => {
    await fetch("/api/trading/signal",{method:"POST"});
    load();
  };

  useEffect(()=>{
    load();
    const t = setInterval(load,2000);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{background:"#111827",padding:20,borderRadius:20}}>
      <h2>AI Trading Engine</h2>
      <button onClick={run}>RUN TRADE</button>

      <div style={{marginTop:20}}>
        {trades.map((t,i)=>(
          <div key={i} style={{padding:10,marginBottom:10,background:"#020617"}}>
            {t.pair} | {t.direction} | {t.result} | {t.profit}
          </div>
        ))}
      </div>
    </div>
  );
}
