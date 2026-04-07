import { NextResponse } from "next/server";
import { getState, getLiveMarket } from "../../../../lib/state.js";
import { getEngineStatus } from "../../../../lib/engine.js";

export async function GET() {
  const state = getState();
  const market = getLiveMarket();
  const engine = getEngineStatus();

  return NextResponse.json({
    symbol: market.symbol,
    direction: market.signal,
    confidence: market.confidence,
    price: market.price,
    riskMode: state.riskMode,
    aiEnabled: state.aiEnabled,
    autoMode: state.autoMode,
    engineRunning: engine.running,
    engineTicks: engine.ticks,
    createdAt: new Date().toISOString()
  });
}
