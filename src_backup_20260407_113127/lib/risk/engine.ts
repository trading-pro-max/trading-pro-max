type RiskConfig = {
  balance: number;
  riskPerTrade: number;
};

let config: RiskConfig = {
  balance: 1000,
  riskPerTrade: 0.02
};

export function calculatePositionSize(confidence: number) {
  const baseRisk = config.balance * config.riskPerTrade;
  const multiplier = confidence / 100;

  return Math.max(1, Math.round(baseRisk * multiplier));
}

export function updateBalance(result: "WIN" | "LOSS", size: number) {
  if (result === "WIN") {
    config.balance += size;
  } else {
    config.balance -= size;
  }

  if (config.balance < 100) config.balance = 100;
}

export function getRiskState() {
  return config;
}
