import { getControlState, pushControlLog } from "@/lib/control/state";
import { analyzeLiveMarket } from "@/lib/real/engine";
import { getLivePrice } from "@/lib/real/price";
import { addPaperTrade, getPaperTrades, settlePaperTrade } from "@/lib/paper/engine";

const g = globalThis as any;

if (!g.__TPM_PAPER_LOOP__) {
  g.__TPM_PAPER_LOOP__ = true;

  setInterval(async () => {
    try {
      const state = getControlState();
      if (!state.aiEnabled || !state.autoMode || state.status !== "ONLINE") return;

      const openTrades = getPaperTrades().filter((t: any) => t.status === "OPEN");
      if (openTrades.length >= 3) return;

      const analysis = await analyzeLiveMarket("BTCUSDT");
      if (!analysis) return;
      if (analysis.signal === "HOLD") return;
      if (analysis.confidence < 80) return;

      const trade = {
        id: Math.random().toString(36).slice(2),
        symbol: analysis.symbol,
        signal: analysis.signal,
        confidence: analysis.confidence,
        entry: analysis.price,
        status: "OPEN",
        pnl: 0,
        createdAt: new Date().toISOString(),
      } as any;

      addPaperTrade(trade);
      pushControlLog(`PAPER TRADE OPENED: ${analysis.signal} ${analysis.symbol} @ ${analysis.price} (${analysis.confidence}%)`);

      setTimeout(async () => {
        try {
          const exit = await getLivePrice("BTCUSDT");
          if (!exit) return;

          const closed = settlePaperTrade(trade.id, exit);
          if (closed) {
            pushControlLog(`PAPER RESULT: ${closed.status} | PNL ${closed.pnl} | EXIT ${exit}`);
          }
        } catch {}
      }, 15000);
    } catch {}
  }, 7000);
}
