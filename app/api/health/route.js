import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "trading-pro-max",
    mode: "production-promotion",
    time: new Date().toISOString()
  });
}
