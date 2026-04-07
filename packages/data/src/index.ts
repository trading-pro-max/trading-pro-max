export interface MarketSnapshot {
  symbol: string;
  session: "EU" | "US" | "ASIA" | "OTC";
  volatility: "Low" | "Medium" | "High";
  price: number;
  change: number;
  timestamp: string;
}

export interface CandleRecord {
  symbol: string;
  timeframe: "1m" | "5m" | "15m" | "1h";
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: string;
}

export interface ReplayFrame {
  id: string;
  symbol: string;
  candles: CandleRecord[];
}

export function buildMockMarketSnapshots(): MarketSnapshot[] {
  return [
    { symbol: "EUR/USD", session: "EU", volatility: "Medium", price: 1.0824, change: 0.42, timestamp: new Date().toISOString() },
    { symbol: "GBP/USD", session: "US", volatility: "Low", price: 1.2718, change: -0.18, timestamp: new Date().toISOString() },
    { symbol: "USD/JPY", session: "ASIA", volatility: "High", price: 151.403, change: 0.71, timestamp: new Date().toISOString() },
    { symbol: "EUR/GBP OTC", session: "OTC", volatility: "High", price: 0.8572, change: 0.11, timestamp: new Date().toISOString() }
  ];
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\s+/g, " ");
}
