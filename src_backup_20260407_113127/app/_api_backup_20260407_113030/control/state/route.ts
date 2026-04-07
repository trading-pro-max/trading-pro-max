import { NextResponse } from "next/server";
import { getControlState, patchControlState, pushControlLog } from "@/lib/control/state";

export async function GET() {
  return NextResponse.json(getControlState());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const nextState = patchControlState({
    autoMode: typeof body.autoMode === "boolean" ? body.autoMode : getControlState().autoMode,
    aiEnabled: typeof body.aiEnabled === "boolean" ? body.aiEnabled : getControlState().aiEnabled,
    riskMode: body.riskMode || getControlState().riskMode,
    status: body.status || getControlState().status,
  });

  pushControlLog(body.log || "STATE UPDATED");

  return NextResponse.json({
    ok: true,
    state: nextState,
  });
}
