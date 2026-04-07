"use client";

import { useEffect, useState } from "react";

export default function RiskPanel() {
  const [risk, setRisk] = useState<any>(null);

  const load = async () => {
    const res = await fetch("/api/engine");
    const data = await res.json();
    setRisk(data.risk);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!risk) return null;

  return (
    <div style={{
      background:"#020617",
      border:"1px solid #1f2937",
      borderRadius:20,
      padding:20
    }}>
      <h3>??? RISK ENGINE</h3>
      <div>Balance: ${risk.balance}</div>
      <div>Risk per Trade: {risk.riskPerTrade * 100}%</div>
    </div>
  );
}
