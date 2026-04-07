import { NextResponse } from "next/server";
import { getControlState, pushControlLog } from "@/lib/control/state";

export async function POST() {
  const state = getControlState();

  // ?? ÊİÚíá ÇáãäÕÉ ÈÚÏ ÇáÏİÚ
  state.aiEnabled = true;
  state.autoMode = true;

  pushControlLog("PAYMENT ACTIVATED: AI ENABLED");

  return NextResponse.json({ ok: true });
}
