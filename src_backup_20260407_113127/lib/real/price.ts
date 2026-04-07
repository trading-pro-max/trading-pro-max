export async function getLivePrice(symbol: string = "BTCUSDT") {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
      cache: "no-store"
    });

    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}
