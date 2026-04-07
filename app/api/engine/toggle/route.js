import { NextResponse } from "next/server";
import { getEngineStatus, startEngine, stopEngine } from "../../../../lib/engine.js";

function handle(action) {
  if (action === "stop") return stopEngine();
  if (action === "status") return getEngineStatus();
  return startEngine();
}

export async function GET(req) {
  const action = new URL(req.url).searchParams.get("action") || "start";
  return NextResponse.json({
    ok: true,
    action,
    engine: handle(action)
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action || "start";
  return NextResponse.json({
    ok: true,
    action,
    engine: handle(action)
  });
}