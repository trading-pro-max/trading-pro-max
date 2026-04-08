export type StrategySignal = {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  source: string;
  ts: string;
};

export function buildPaperSignal(symbol: string, bias: "bullish" | "bearish"): StrategySignal {
  return {
    symbol,
    action: bias === "bullish" ? "BUY" : "SELL",
    confidence: bias === "bullish" ? 78 : 74,
    source: "paper-strategy-engine",
    ts: new Date().toISOString()
  };
}
