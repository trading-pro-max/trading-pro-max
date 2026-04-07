import { getControlState, pushControlLog } from "@/lib/control/state";
import { analyzeMarket } from "@/lib/trading/market";
import { addTrade } from "@/lib/trading/engine";

const globalRef = globalThis as any;

if (!globalRef.__TPM_AUTO_TRADER__) {
  globalRef.__TPM_AUTO_TRADER__ = true;

  setInterval(async () => {
    const state = getControlState();

    if (!state.aiEnabled || !state.autoMode || state.status !== "ONLINE") return;

    const analysis = await analyzeMarket("BTCUSDT");
    if (!analysis) return;

    if (analysis.signal === "HOLD") return;

    if (analysis.confidence < 75) return;

    const trade = {
      id: Math.random().toString(36).slice(2),
      pair: analysis.symbol,
      direction: analysis.signal,
      amount: state.riskMode === "AGGRESSIVE" ? 20 : state.riskMode === "SAFE" ? 5 : 10,
      result: "RUNNING",
      profit: 0,
      time: new Date().toISOString()
    };

    addTrade(trade);

    pushControlLog("AI TRADE: " + analysis.signal + " " + analysis.symbol + " (" + analysis.confidence + "%)");

    setTimeout(() => {
      const win = Math.random() > 0.35;
      trade.result = win ? "WIN" : "LOSS";
      trade.profit = win ? trade.amount * 0.85 : -trade.amount;

      pushControlLog("RESULT: " + trade.result + " " + trade.profit);
    }, 4000);

  }, 5000);
}
