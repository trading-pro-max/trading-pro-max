import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const command = body?.command || "UNKNOWN";

  return NextResponse.json({
    ok: true,
    command,
    result: "EXECUTED",
    time: new Date().toISOString()
  });
}
