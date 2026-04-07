type TradeResult = {
  result: "WIN" | "LOSS";
  confidence: number;
};

let history: TradeResult[] = [];

export function recordTrade(result: "WIN" | "LOSS", confidence: number) {
  history.push({ result, confidence });

  if (history.length > 100) {
    history.shift();
  }
}

export function getAIStats() {
  if (history.length === 0) {
    return {
      winRate: 0,
      avgConfidence: 0,
      totalTrades: 0
    };
  }

  const wins = history.filter(t => t.result === "WIN").length;

  const avgConfidence =
    history.reduce((sum, t) => sum + t.confidence, 0) / history.length;

  return {
    winRate: Math.round((wins / history.length) * 100),
    avgConfidence: Math.round(avgConfidence),
    totalTrades: history.length
  };
}

export function adjustConfidence(base: number) {
  const stats = getAIStats();

  let adjustment = 0;

  if (stats.winRate > 70) adjustment += 5;
  if (stats.winRate < 50) adjustment -= 5;

  if (stats.avgConfidence > 80) adjustment += 3;

  return Math.max(50, Math.min(base + adjustment, 95));
}
