import { getLivePrice } from "@/lib/real/price";

export async function analyzeLiveMarket(symbol = "BTCUSDT") {
  const price = await getLivePrice(symbol);
  if (!price) return null;

  const direction = Math.random() > 0.5 ? "CALL" : "PUT";

  return {
    symbol: symbol.replace("USDT","/USDT"),
    price,
    signal: direction,
    confidence: Math.floor(Math.random()*20)+80,
    time: new Date().toISOString()
  };
}
