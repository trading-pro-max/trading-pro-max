export type PortfolioState = {
  equity: number;
  cash: number;
  exposure: number;
  positions: number;
  updatedAt: string;
};

export function buildPaperPortfolio(): PortfolioState {
  return {
    equity: 100000,
    cash: 100000,
    exposure: 0,
    positions: 0,
    updatedAt: new Date().toISOString()
  };
}
