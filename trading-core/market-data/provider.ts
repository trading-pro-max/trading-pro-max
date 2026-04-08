export type MarketTick = {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  ts: string;
};

export type MarketSnapshot = {
  source: "paper" | "live" | "hybrid";
  symbols: string[];
  ticks: MarketTick[];
  health: "ONLINE" | "DEGRADED" | "OFFLINE";
};

export function buildPaperSnapshot(symbols: string[]): MarketSnapshot {
  const ticks = symbols.map((symbol, i) => {
    const base = 100 + i * 3;
    return {
      symbol,
      bid: Number((base + 0.1).toFixed(4)),
      ask: Number((base + 0.2).toFixed(4)),
      last: Number((base + 0.15).toFixed(4)),
      ts: new Date().toISOString()
    };
  });

  return {
    source: "paper",
    symbols,
    ticks,
    health: "ONLINE"
  };
}
