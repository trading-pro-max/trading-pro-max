type PaperTrade = {
  id: string;
  symbol: string;
  signal: "CALL" | "PUT" | "HOLD";
  confidence: number;
  entry: number;
  exit?: number;
  status: "OPEN" | "WIN" | "LOSS" | "SKIP";
  pnl: number;
  createdAt: string;
  closedAt?: string;
};

const g = globalThis as any;

if (!g.__TPM_PAPER_TRADES__) {
  g.__TPM_PAPER_TRADES__ = [];
}

export function getPaperTrades(): PaperTrade[] {
  return g.__TPM_PAPER_TRADES__;
}

export function addPaperTrade(trade: PaperTrade) {
  g.__TPM_PAPER_TRADES__.unshift(trade);
  g.__TPM_PAPER_TRADES__ = g.__TPM_PAPER_TRADES__.slice(0, 80);
}

export function settlePaperTrade(id: string, exit: number) {
  const trade = g.__TPM_PAPER_TRADES__.find((x: PaperTrade) => x.id === id);
  if (!trade || trade.status !== "OPEN") return null;

  trade.exit = exit;
  trade.closedAt = new Date().toISOString();

  if (trade.signal === "HOLD") {
    trade.status = "SKIP";
    trade.pnl = 0;
    return trade;
  }

  const wentUp = exit > trade.entry;
  const won =
    (trade.signal === "CALL" && wentUp) ||
    (trade.signal === "PUT" && !wentUp);

  trade.status = won ? "WIN" : "LOSS";
  trade.pnl = won ? 8.5 : -10;

  return trade;
}
