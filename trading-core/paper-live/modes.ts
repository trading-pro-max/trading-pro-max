export type TradingMode = {
  mode: "paper" | "live";
  marketDataSource: "paper" | "live" | "hybrid";
  brokerSource: "paper" | "live";
  safety: "SAFE" | "GUARDED";
};

export const PAPER_MODE: TradingMode = {
  mode: "paper",
  marketDataSource: "paper",
  brokerSource: "paper",
  safety: "SAFE"
};

export const LIVE_MODE: TradingMode = {
  mode: "live",
  marketDataSource: "live",
  brokerSource: "live",
  safety: "GUARDED"
};
