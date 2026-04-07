import { NextResponse } from "next/server";
import { getState } from "../../../../lib/state.js";
import { getEngineStatus } from "../../../../lib/engine.js";

export async function GET() {
  const state = getState();
  const engine = getEngineStatus();
  const trades = state.paperTrades || [];

  const wins = trades.filter(t => Number(t.pnl) > 0).length;
  const losses = trades.filter(t => Number(t.pnl) < 0).length;
  const pnl = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  return NextResponse.json({
    core: {
      status: state.status,
      autoMode: state.autoMode,
      aiEnabled: state.aiEnabled,
      riskMode: state.riskMode,
      lastCommand: state.lastCommand
    },
    engine,
    metrics: state.metrics,
    paper: {
      total: trades.length,
      wins,
      losses,
      pnl: Number(pnl.toFixed(2))
    },
    updatedAt: new Date().toISOString()
  });
}
