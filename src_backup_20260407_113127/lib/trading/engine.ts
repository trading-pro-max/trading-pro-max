type Trade = {
  id: string;
  pair: string;
  direction: "CALL" | "PUT";
  amount: number;
  result: "WIN" | "LOSS" | "RUNNING";
  profit: number;
  time: string;
};

const globalRef = globalThis as any;

if (!globalRef.__TPM_TRADES__) {
  globalRef.__TPM_TRADES__ = [];
}

export function getTrades(): Trade[] {
  return globalRef.__TPM_TRADES__;
}

export function addTrade(trade: Trade) {
  globalRef.__TPM_TRADES__.unshift(trade);
  globalRef.__TPM_TRADES__ = globalRef.__TPM_TRADES__.slice(0, 50);
}

export function simulateTrade() {
  const pairs = ["EUR/USD","GBP/USD","USD/JPY","BTC/USD"];
  const pair = pairs[Math.floor(Math.random()*pairs.length)];
  const direction = Math.random() > 0.5 ? "CALL" : "PUT";

  const trade: Trade = {
    id: Math.random().toString(36).slice(2),
    pair,
    direction,
    amount: 10,
    result: "RUNNING",
    profit: 0,
    time: new Date().toISOString()
  };

  addTrade(trade);

  setTimeout(() => {
    const win = Math.random() > 0.4;
    trade.result = win ? "WIN" : "LOSS";
    trade.profit = win ? trade.amount * 0.8 : -trade.amount;
  }, 3000);

  return trade;
}
