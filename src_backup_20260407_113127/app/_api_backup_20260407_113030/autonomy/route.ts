import { NextResponse } from "next/server";
import axios from "axios";

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
    close: parseFloat(x[4]),
    time: x[0],
  }));
}

function buildSignal(symbol: string, pair: string, closes: number[]) {
  const ema9 = ema(closes.slice(-30), 9);
  const ema21 = ema(closes.slice(-40), 21);
  const rrsi = rsi(closes, 14);

  let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 50;

  if (ema9 > ema21 && rrsi < 68) {
    signal = "BUY";
    confidence = Math.min(95, Math.round(73 + (ema9 - ema21) * 1000 + (68 - rrsi) * 0.35));
  } else if (ema9 < ema21 && rrsi > 32) {
    signal = "SELL";
    confidence = Math.min(95, Math.round(73 + (ema21 - ema9) * 1000 + (rrsi - 32) * 0.35));
  }

  return {
    symbol,
    pair,
    signal,
    confidence,
    indicators: {
      ema9: Number(ema9.toFixed(2)),
      ema21: Number(ema21.toFixed(2)),
      rsi: Math.round(rrsi),
    },
    price: Number(closes[closes.length - 1].toFixed(2)),
  };
}

export async function GET() {
  try {
    const mapped = [
      { symbol: "BTCUSDT", pair: "BTC/USDT" },
      { symbol: "ETHUSDT", pair: "ETH/USDT" },
      { symbol: "BNBUSDT", pair: "BNB/USDT" },
    ];

    const signals = await Promise.all(
      mapped.map(async (m) => {
        const candles = await getSeries(m.symbol);
        const closes = candles.map((c) => c.close);
        return buildSignal(m.symbol, m.pair, closes);
      })
    );

    const best = [...signals].sort((a, b) => b.confidence - a.confidence)[0];

    return NextResponse.json({
      ok: true,
      best,
      signals,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "AUTONOMY_ENGINE_FAILED", details: e?.message || "unknown" },
      { status: 500 }
    );
  }
}
