import { NextResponse } from "next/server";
import { executeControlCommand } from "@/lib/control/state";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const command = body?.command || "UNKNOWN";
    const state = executeControlCommand(command);

    return NextResponse.json({
      ok: true,
      command,
      state,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "EXECUTE_FAILED" },
      { status: 500 }
    );
  }
}
