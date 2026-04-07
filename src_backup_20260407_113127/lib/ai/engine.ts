import axios from "axios";

export async function getMarketData(symbol = "BTCUSDT") {
  const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=50`);
  return res.data.map((candle: any) => ({
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4])
  }));
}

export function calculateSignal(data: any[]) {
  const closes = data.map(d => d.close);

  const shortMA = closes.slice(-5).reduce((a,b)=>a+b,0) / 5;
  const longMA = closes.slice(-20).reduce((a,b)=>a+b,0) / 20;

  const momentum = closes[closes.length - 1] - closes[closes.length - 5];

  let signal = "HOLD";
  let confidence = 50;

  if (shortMA > longMA && momentum > 0) {
    signal = "BUY";
    confidence = 70 + Math.min(momentum * 10, 20);
  } else if (shortMA < longMA && momentum < 0) {
    signal = "SELL";
    confidence = 70 + Math.min(Math.abs(momentum) * 10, 20);
  }

  return {
    signal,
    confidence: Math.min(Math.round(confidence), 95)
  };
}

export async function generateSignal(symbol: string) {
  const data = await getMarketData(symbol);
  const result = calculateSignal(data);

  return {
    symbol,
    ...result,
    time: new Date().toISOString()
  };
}
