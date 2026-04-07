import { NextResponse } from "next/server";
import { applyProtection, getState, setProtectionLimits } from "../../../../lib/state.js";

function act(action, payload) {
  if (payload && (payload.maxDailyLoss !== undefined || payload.maxOpenPositions !== undefined)) {
    return setProtectionLimits(payload);
  }
  if (action) {
    return applyProtection(action);
  }
  return getState();
}

export async function GET(req) {
  const action = new URL(req.url).searchParams.get("action");
  const state = act(action, {});
  return NextResponse.json({ ok: true, state });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const state = act(body?.action, body || {});
  return NextResponse.json({ ok: true, state });
}
