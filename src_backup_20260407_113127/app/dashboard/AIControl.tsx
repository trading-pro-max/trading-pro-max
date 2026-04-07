"use client";

import { useEffect, useState } from "react";

export default function AIControl() {
  const [auto, setAuto] = useState(true);

  const toggle = async () => {
    const res = await fetch("/api/auto-trade", { method: "POST" });
    const data = await res.json();
    setAuto(data.autoMode);
  };

  return (
    <div style={{padding:20,background:"#111827",borderRadius:12,marginTop:20}}>
      <h3>AI Auto Trading</h3>
      <button onClick={toggle}>
        {auto ? "ON ??" : "OFF"}
      </button>
    </div>
  );
}
