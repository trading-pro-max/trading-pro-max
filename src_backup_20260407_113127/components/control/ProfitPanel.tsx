"use client";

import { useAutonomyStore } from "@/store/autonomy-store";

export default function ProfitPanel() {
  const { capital, peakCapital, trades, wins, losses, journal, improvements, version, running, setRunning, reset } = useAutonomyStore();
  const winRate = trades ? Math.round((wins / trades) * 100) : 0;
  const avgPnl = trades
    ? (journal.filter((x) => x.result !== "SKIP").reduce((s, x) => s + x.pnl, 0) / trades).toFixed(2)
    : "0.00";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 3, color: "#60a5fa", textTransform: "uppercase" }}>Self Profit Engine</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "white", marginTop: 8 }}>Version {version.toFixed(1)}</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setRunning(!running)}
              style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: running ? "#ef4444" : "#22c55e", color: "white", fontWeight: 800, cursor: "pointer" }}
            >
              {running ? "STOP" : "START"}
            </button>
            <button
              onClick={reset}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #334155", background: "#020617", color: "white", fontWeight: 800, cursor: "pointer" }}
            >
              RESET
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 16, marginTop: 20 }}>
          {[
            ["Capital", `$${capital.toFixed(2)}`],
            ["Peak", `$${peakCapital.toFixed(2)}`],
            ["Trades", String(trades)],
            ["Win Rate", `${winRate}%`],
            ["Avg PnL", `$${avgPnl}`],
          ].map(([a, b]) => (
            <div key={a} style={{ background: "#020617", borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{a}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "white", marginTop: 8 }}>{b}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 22, padding: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white", marginBottom: 16 }}>Recent Improvements</div>
          <div style={{ display: "grid", gap: 10 }}>
            {improvements.length === 0 ? (
              <div style={{ color: "#94a3b8" }}>Waiting for evolution cycles...</div>
            ) : (
              improvements.map((item, i) => (
                <div key={i} style={{ background: "#020617", borderRadius: 12, padding: 12, color: "#cbd5e1" }}>{item}</div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 22, padding: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white", marginBottom: 16 }}>Profit Journal</div>
          <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto" }}>
            {journal.length === 0 ? (
              <div style={{ color: "#94a3b8" }}>No cycles yet</div>
            ) : (
              journal.map((item) => (
                <div key={item.id} style={{ background: "#020617", borderRadius: 12, padding: 12, color: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 800 }}>{item.pair} · {item.signal}</div>
                    <div style={{ color: item.result === "WIN" ? "#22c55e" : item.result === "LOSS" ? "#ef4444" : "#94a3b8", fontWeight: 900 }}>
                      {item.result}
                    </div>
                  </div>
                  <div style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>
                    {item.time} · confidence {item.confidence}% · pnl {item.pnl > 0 ? "+" : ""}{item.pnl.toFixed(2)} · capital ${item.capital.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
