import { calculatePositionSize, updateBalance, getRiskState } from "@/lib/risk/engine";

type Trade = {
  symbol: string;
  entry: number;
  direction: "BUY" | "SELL";
  confidence: number;
  size: number;
  status: "OPEN" | "WIN" | "LOSS";
};

let trades: Trade[] = [];

export function getTrades() {
  return trades.slice(-20).reverse();
}

export function openTrade(signal: any, price: number) {
  if (signal.signal === "HOLD") return;

  const size = calculatePositionSize(signal.confidence);

  trades.push({
    symbol: signal.symbol,
    entry: price,
    direction: signal.signal,
    confidence: signal.confidence,
    size,
    status: "OPEN"
  });
}

export function updateTrades(price: number) {
  trades = trades.map(t => {
    if (t.status !== "OPEN") return t;

    const win =
      (t.direction === "BUY" && price > t.entry) ||
      (t.direction === "SELL" && price < t.entry);

    const result = win ? "WIN" : "LOSS";

    updateBalance(result, t.size);

    return {
      ...t,
      status: result
    };
  });
}
