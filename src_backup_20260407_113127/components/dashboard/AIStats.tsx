"use client";

import { useEffect, useState } from "react";

export default function AIStats() {
  const [ai, setAI] = useState<any>(null);

  const load = async () => {
    const res = await fetch("/api/engine");
    const data = await res.json();
    setAI(data.ai);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!ai) return null;

  return (
    <div style={{
      background:"#111827",
      border:"1px solid #1f2937",
      borderRadius:20,
      padding:20
    }}>
      <h3>?? AI SELF LEARNING</h3>

      <div>Win Rate: {ai.winRate}%</div>
      <div>Confidence: {ai.avgConfidence}%</div>
      <div>Total Trades: {ai.totalTrades}</div>
    </div>
  );
}
