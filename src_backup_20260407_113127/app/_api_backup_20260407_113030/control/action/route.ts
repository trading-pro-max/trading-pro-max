import { NextResponse } from "next/server";

let actionLog: any[] = [];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action || "UNKNOWN_ACTION";
  const payload = body?.payload || {};
  const item = {
    id: Date.now().toString(),
    action,
    payload,
    timestamp: new Date().toISOString(),
    result: "EXECUTED"
  };
  actionLog.unshift(item);
  actionLog = actionLog.slice(0, 50);

  return NextResponse.json({
    ok: true,
    item,
    message: `${action} executed`
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, log: actionLog });
}
