"use client";

import { useEffect, useState } from "react";

export default function ExecutionPage() {
  const [orders, setOrders] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [o, l] = await Promise.all([
        fetch("/api/execution/orders", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/execution/ledger", { cache: "no-store" }).then(r => r.json())
      ]);
      setOrders(Array.isArray(o) ? o : []);
      setLedger(Array.isArray(l) ? l : []);
      setError("");
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, []);

  const card = {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 22,
    padding: 20
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#020617 0%,#0b1120 100%)", color: "white", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={card}>
          <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize: 40, margin: "10px 0 0" }}>Execution Center</h1>
          <div style={{ marginTop: 10, color: "#94a3b8" }}>Orders and ledger are now connected.</div>
          {error ? <div style={{ marginTop: 12, color: "#f87171", fontWeight: 700 }}>{error}</div> : null}
        </div>

        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Orders</div>
          <div style={{ display: "grid", gap: 10 }}>
            {orders.length ? orders.slice(0, 12).map((x) => (
              <div key={x.id} style={{ background: "#020617", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 900 }}>{x.symbol} · {x.side}</div>
                <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>
                  Qty {x.qty} · Entry {x.entryPrice} · Status {x.status}
                </div>
              </div>
            )) : <div style={{ color: "#94a3b8" }}>No orders yet.</div>}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Execution Ledger</div>
          <div style={{ display: "grid", gap: 10 }}>
            {ledger.length ? ledger.slice(0, 12).map((x) => (
              <div key={x.id} style={{ background: "#020617", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 900 }}>{x.type} · {x.symbol}</div>
                <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>
                  Qty {x.qty || "-"} · Entry {x.price || x.entryPrice || "-"} · Exit {x.exitPrice || "-"} · PnL {x.pnl || "-"}
                </div>
              </div>
            )) : <div style={{ color: "#94a3b8" }}>No ledger entries yet.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
