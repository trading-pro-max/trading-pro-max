import { NextResponse } from "next/server";
import { getState } from "../../../../lib/state.js";

export async function GET() {
  const trades = getState().paperTrades || [];
  const total = trades.length;
  const wins = trades.filter(t => Number(t.pnl) > 0).length;
  const losses = trades.filter(t => Number(t.pnl) < 0).length;
  const pnl = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const winRate = total ? Number(((wins / total) * 100).toFixed(2)) : 0;

  return NextResponse.json({
    total,
    wins,
    losses,
    pnl: Number(pnl.toFixed(2)),
    winRate
  });
}
