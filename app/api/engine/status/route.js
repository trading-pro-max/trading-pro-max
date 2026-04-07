import { NextResponse } from "next/server";
import { getEngineStatus } from "../../../../lib/engine.js";

export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: getEngineStatus()
  });
}