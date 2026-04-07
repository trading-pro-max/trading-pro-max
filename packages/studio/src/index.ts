export interface StrategyDefinition {
  id: string;
  name: string;
  version: string;
  riskProfile: "Low" | "Balanced" | "Aggressive";
}

export interface BacktestRequest {
  strategyId: string;
  symbol: string;
  timeframe: "1m" | "5m" | "15m";
  candles: number;
}

export interface BacktestSummary {
  strategyId: string;
  winRate: number;
  trades: number;
  pnl: number;
}

export function runMockBacktest(request: BacktestRequest): BacktestSummary {
  const seed = request.candles + request.symbol.length + request.timeframe.length;
  return {
    strategyId: request.strategyId,
    winRate: 55 + (seed % 30),
    trades: Math.max(25, request.candles / 4),
    pnl: Number(((seed % 17) * 48.5).toFixed(2))
  };
}
