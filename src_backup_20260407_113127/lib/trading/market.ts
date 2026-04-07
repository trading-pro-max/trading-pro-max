export async function getKlines(symbol: string, interval = "1m", limit = 120) {
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { cache: "no-store" });
  const data = await res.json();
  return data.map((x: any) => ({
    open: parseFloat(x[1]),
    high: parseFloat(x[2]),
    low: parseFloat(x[3]),
    close: parseFloat(x[4]),
    volume: parseFloat(x[5]),
    time: x[0],
  }));
}

function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  let out = values[0];
  for (let i = 1; i < values.length; i++) out = values[i] * k + out * (1 - k);
  return out;
}

function rsi(values: number[], period = 14) {
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

export async function analyzeMarket(symbol = "BTCUSDT") {
  const candles = await getKlines(symbol, "1m", 120);
  const closes = candles.map((c: any) => c.close);
  const current = closes[closes.length - 1];
  const ema9 = ema(closes.slice(-30), 9);
  const ema21 = ema(closes.slice(-50), 21);
  const ema50 = ema(closes.slice(-90), 50);
  const rrsi = rsi(closes, 14);

  let signal = "HOLD";
  let confidence = 50;
  let trend = "NEUTRAL";
  let reason = "No clean edge";

  if (ema9 > ema21 && ema21 > ema50) trend = "UP";
  if (ema9 < ema21 && ema21 < ema50) trend = "DOWN";

  if (trend === "UP" && rrsi > 48 && rrsi < 70) {
    signal = "CALL";
    confidence = Math.min(95, Math.round(74 + (ema9 - ema21) * 1000 + (70 - rrsi) * 0.35));
    reason = "Bullish EMA structure with controlled RSI";
  } else if (trend === "DOWN" && rrsi < 52 && rrsi > 30) {
    signal = "PUT";
    confidence = Math.min(95, Math.round(74 + (ema21 - ema9) * 1000 + (rrsi - 30) * 0.35));
    reason = "Bearish EMA structure with controlled RSI";
  }

  return {
    symbol: symbol.replace("USDT", "/USDT"),
    price: Number(current.toFixed(2)),
    signal,
    confidence,
    trend,
    indicators: {
      ema9: Number(ema9.toFixed(2)),
      ema21: Number(ema21.toFixed(2)),
      ema50: Number(ema50.toFixed(2)),
      rsi: Math.round(rrsi),
    },
    reason,
    time: new Date().toISOString(),
  };
}
