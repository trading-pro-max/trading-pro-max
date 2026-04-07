"use client";

import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const safeJson = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(url + " -> " + text);
    }
  };

  const load = async () => {
    try {
      const x = await safeJson("/api/notifications/feed");
      setData(x);
      setError("");
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  const card = {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 22,
    padding: 20
  };

  const badgeColor = (severity) => {
    if (severity === "danger") return "#ef4444";
    if (severity === "warning") return "#f59e0b";
    if (severity === "success") return "#22c55e";
    return "#60a5fa";
  };

  if (!data) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "white" }}>Loading notifications...</main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#020617 0%,#0b1120 100%)", color: "white", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1450, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={card}>
          <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize: 40, margin: "10px 0 0" }}>Notification Hub</h1>
          <div style={{ marginTop: 10, color: "#94a3b8" }}>
            Total: {data.total} · Attention Needed: {data.unreadEstimate}
          </div>
          {error ? <div style={{ marginTop: 12, color: "#f87171", fontWeight: 700 }}>{error}</div> : null}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {(data.items || []).map((x) => (
            <div key={x.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{x.title}</div>
                  <div style={{ marginTop: 8, color: "#cbd5e1" }}>{x.message}</div>
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <div style={{ background: badgeColor(x.severity), color: "white", padding: "8px 12px", borderRadius: 999, fontWeight: 900, fontSize: 12 }}>
                    {String(x.severity).toUpperCase()}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{x.type} · {new Date(x.time).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
