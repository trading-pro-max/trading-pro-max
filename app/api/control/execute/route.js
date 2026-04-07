import { NextResponse } from "next/server";
import { getState, runCommand } from "../../../../lib/state.js";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const command = body?.command || "UNKNOWN";
  const state = runCommand(command);
  return NextResponse.json({ ok: true, command, state });
}

export async function GET() {
  return NextResponse.json(getState());
}