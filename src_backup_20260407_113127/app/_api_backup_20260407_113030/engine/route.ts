import { NextResponse } from "next/server";
import axios from "axios";

let tradeHistory: any[] = [];

function ema(prices: number[], period: number) {
  const k = 2 / (period + 1);
  let value = prices[0];
  for (let i = 1; i < prices.length; i++) value = prices[i] * k + value * (1 - k);
  return value;
}

function rsi(prices: number[], period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

async function getSeries(symbol: string) {
  const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=80`);
  return res.data.map((x: any) => ({
    open: parseFloat(x[1]),
    high: parseFloat(x[2]),
    low: parseFloat(x[3]),
    close: parseFloat(x[4]),
    time: x[0],
  }));
}

function buildSignal(symbol: string, pair: string, closes: number[]) {
  const ema9 = ema(closes.slice(-30), 9);
  const ema21 = ema(closes.slice(-40), 21);
  const r = rsi(closes, 14);

  let signal = "HOLD";
  let confidence = 50;

  if (ema9 > ema21 && r < 68) {
    signal = "BUY";
    confidence = Math.min(95, Math.round(73 + (ema9 - ema21) * 1000 + (68 - r) * 0.35));
  } else if (ema9 < ema21 && r > 32) {
    signal = "SELL";
    confidence = Math.min(95, Math.round(73 + (ema21 - ema9) * 1000 + (r - 32) * 0.35));
  }

  return {
    symbol,
    pair,
    signal,
    confidence,
    indicators: {
      ema9: ema9.toFixed(2),
      ema21: ema21.toFixed(2),
      rsi: Math.round(r),
    },
  };
}

function simulateTrade(signal: any, candles: any[]) {
  const entry = candles[candles.length - 2].close;
  const exit = candles[candles.length - 1].close;

  let result = "FLAT";
  let pnl = 0;

  if (signal.signal === "BUY") {
    pnl = ((exit - entry) / entry) * 100;
    result = pnl > 0 ? "WIN" : "LOSS";
  } else if (signal.signal === "SELL") {
    pnl = ((entry - exit) / entry) * 100;
    result = pnl > 0 ? "WIN" : "LOSS";
  }

  const trade = {
    id: `${signal.symbol}-${Date.now()}`,
    pair: signal.pair,
    signal: signal.signal,
    confidence: signal.confidence,
    entry: entry.toFixed(2),
    exit: exit.toFixed(2),
    pnl: pnl.toFixed(2),
    result,
    timestamp: new Date().toISOString(),
  };

  if (signal.signal !== "HOLD") {
    tradeHistory.unshift(trade);
    tradeHistory = tradeHistory.slice(0, 30);
  }

  return trade;
}

function getStats() {
  const active = tradeHistory.filter((t) => t.result !== "FLAT");
  const wins = active.filter((t) => t.result === "WIN").length;
  const losses = active.filter((t) => t.result === "LOSS").length;
  const winRate = active.length ? Math.round((wins / active.length) * 100) : 0;
  const avgPnl = active.length
    ? (active.reduce((sum, t) => sum + parseFloat(t.pnl), 0) / active.length).toFixed(2)
    : "0.00";

  return {
    totalTrades: active.length,
    wins,
    losses,
    winRate,
    avgPnl,
    lastUpdate: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const market = await Promise.all([
      getSeries("BTCUSDT"),
      getSeries("ETHUSDT"),
      getSeries("BNBUSDT"),
    ]);

    const mapped = [
      { symbol: "BTCUSDT", pair: "BTC/USDT", candles: market[0] },
      { symbol: "ETHUSDT", pair: "ETH/USDT", candles: market[1] },
      { symbol: "BNBUSDT", pair: "BNB/USDT", candles: market[2] },
    ];

    const signals = mapped.map((m) => {
      const closes = m.candles.map((c) => c.close);
      const sig = buildSignal(m.symbol, m.pair, closes);
      const trade = simulateTrade(sig, m.candles);

      return {
        ...sig,
        price: closes[closes.length - 1].toFixed(2),
        trade,
      };
    });

    const best = [...signals].sort((a, b) => b.confidence - a.confidence)[0];

    return NextResponse.json({
      ok: true,
      best,
      signals,
      trades: tradeHistory,
      stats: getStats(),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: "ENGINE_FAILED",
      details: e?.message || "unknown",
    }, { status: 500 });
  }
}
