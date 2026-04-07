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

async function pairSignal(symbol: string, label: string) {
  const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=60`);
  const prices = res.data.map((x: any) => parseFloat(x[4]));
  const last = prices[prices.length - 1];
  const ema9 = ema(prices.slice(-30), 9);
  const ema21 = ema(prices.slice(-40), 21);
  const r = rsi(prices, 14);

  let signal = "HOLD";
  let confidence = 50;

  if (ema9 > ema21 && r < 68) {
    signal = "BUY";
    confidence = Math.min(95, Math.round(72 + (ema9 - ema21) * 1000 + (68 - r) * 0.4));
  } else if (ema9 < ema21 && r > 32) {
    signal = "SELL";
    confidence = Math.min(95, Math.round(72 + (ema21 - ema9) * 1000 + (r - 32) * 0.4));
  }

  return {
    symbol,
    pair: label,
    price: last.toFixed(2),
    signal,
    confidence,
    indicators: {
      ema9: ema9.toFixed(2),
      ema21: ema21.toFixed(2),
      rsi: Math.round(r),
    },
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const items = await Promise.all([
      pairSignal("BTCUSDT", "BTC/USDT"),
      pairSignal("ETHUSDT", "ETH/USDT"),
      pairSignal("BNBUSDT", "BNB/USDT"),
    ]);

    const ranked = items.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      ok: true,
      best: ranked[0],
      signals: ranked,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: "SIGNALS_ENGINE_FAILED",
      details: e?.message || "unknown",
    }, { status: 500 });
  }
}
