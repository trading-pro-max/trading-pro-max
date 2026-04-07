import { NextResponse } from "next/server";
import { getState } from "../../../../lib/state.js";

export async function GET() {
  const s = getState();

  return NextResponse.json({
    ok: true,
    protection: s.protection || {
      killSwitch: false,
      liveTradingEnabled: false,
      maxDailyLoss: 250,
      maxOpenPositions: 3,
      sessionMode: "PROTECTED",
      guardianStatus: "ARMED"
    },
    core: {
      status: s.status,
      riskMode: s.riskMode,
      autoMode: s.autoMode,
      aiEnabled: s.aiEnabled,
      lastCommand: s.lastCommand
    }
  });
}
