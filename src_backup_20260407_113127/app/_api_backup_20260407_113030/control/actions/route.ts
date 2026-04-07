import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action || "SYSTEM_SCAN";

  return NextResponse.json({
    ok: true,
    action,
    state: "executed",
    timestamp: new Date().toISOString(),
    message: "Control center action executed successfully"
  });
}
