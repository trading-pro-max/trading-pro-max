"use client";

import { useEffect, useState } from "react";

type Trade = {
  id: string;
  pair: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entry: string;
  exit: string;
  pnl: string;
  result: "WIN" | "LOSS" | "FLAT";
  timestamp: string;
};

type Signal = {
  pair: string;
  symbol: string;
  price: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  indicators: { ema9: string; ema21: string; rsi: number };
  trade: Trade;
};

type Stats = {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: string;
  lastUpdate: string;
};

export default function Dashboard() {
  const [best, setBest] = useState<Signal | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/engine", { cache: "no-store" });
      const data = await res.json();

      if (data?.ok) {
        setBest(data.best || null);
        setSignals(data.signals || []);
        setTrades(data.trades || []);
        setStats(data.stats || null);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const colorFor = (signal: string) =>
    signal === "BUY" ? "#22c55e" : signal === "SELL" ? "#ef4444" : "#94a3b8";

  const resultColor = (result: string) =>
    result === "WIN" ? "#22c55e" : result === "LOSS" ? "#ef4444" : "#94a3b8";

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", padding: 32, fontFamily: "Arial" }}>
      <div style={{ maxWidth: 1350, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>Trading Pro Max AI Engine</h1>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>Live multi-pair analysis · simulated execution · performance tracking</p>
          </div>
          <a
            href="/"
            style={{
              background: "#111827",
              color: "white",
              padding: "12px 18px",
              borderRadius: 12,
              textDecoration: "none",
              border: "1px solid #1f2937"
            }}
          >
            Home
          </a>
        </div>

        {loading ? (
          <div style={{ marginTop: 24, padding: 24, background: "#111827", borderRadius: 16 }}>Loading engine...</div>
        ) : (
          <>
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, marginTop: 24 }}>
                <div style={{ background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Total Trades</div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.totalTrades}</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Wins</div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: "#22c55e" }}>{stats.wins}</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Losses</div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: "#ef4444" }}>{stats.losses}</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Win Rate</div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.winRate}%</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Average PnL</div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.avgPnl}%</div>
                </div>
              </div>
            )}

            {best && (
              <div style={{ background: "#111827", borderRadius: 18, padding: 24, marginTop: 24, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 13, color: "#60a5fa", marginBottom: 8 }}>BEST ACTIVE SIGNAL</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 900 }}>{best.pair}</div>
                    <div style={{ color: "#94a3b8", marginTop: 6 }}>Price: {best.price}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: colorFor(best.signal) }}>{best.signal}</div>
                    <div style={{ color: "#94a3b8" }}>Confidence: {best.confidence}%</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 20 }}>
                  <div style={{ background: "#0b1220", padding: 16, borderRadius: 14 }}>EMA 9: {best.indicators.ema9}</div>
                  <div style={{ background: "#0b1220", padding: 16, borderRadius: 14 }}>EMA 21: {best.indicators.ema21}</div>
                  <div style={{ background: "#0b1220", padding: 16, borderRadius: 14 }}>RSI: {best.indicators.rsi}</div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, marginTop: 24 }}>
              {signals.map((item) => (
                <div key={item.symbol} style={{ background: "#111827", borderRadius: 18, padding: 20, border: "1px solid #1f2937" }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{item.pair}</div>
                  <div style={{ color: "#94a3b8", marginTop: 6 }}>Price: {item.price}</div>
                  <div style={{ marginTop: 18, fontSize: 26, fontWeight: 900, color: colorFor(item.signal) }}>{item.signal}</div>
                  <div style={{ marginTop: 8 }}>Confidence: {item.confidence}%</div>
                  <div style={{ marginTop: 14, color: "#94a3b8", fontSize: 14 }}>EMA9: {item.indicators.ema9}</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>EMA21: {item.indicators.ema21}</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>RSI: {item.indicators.rsi}</div>
                  <div style={{ marginTop: 12, fontWeight: 800, color: resultColor(item.trade.result) }}>
                    Last Simulated Trade: {item.trade.result}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#111827", borderRadius: 18, padding: 24, marginTop: 24, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Trade Journal</div>
              <div style={{ display: "grid", gap: 10 }}>
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    style={{
                      background: "#0b1220",
                      borderRadius: 14,
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "1.2fr .8fr .8fr .8fr .8fr .8fr",
                      gap: 12,
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{trade.pair}</div>
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(trade.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ color: colorFor(trade.signal), fontWeight: 800 }}>{trade.signal}</div>
                    <div>Entry {trade.entry}</div>
                    <div>Exit {trade.exit}</div>
                    <div>{trade.pnl}%</div>
                    <div style={{ color: resultColor(trade.result), fontWeight: 900 }}>{trade.result}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
