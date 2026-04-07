import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    devices: [
      { id: "desktop-private", type: "desktop", status: "READY", label: "Private Operator Desktop" },
      { id: "mobile-private", type: "mobile", status: "READY", label: "Private Operator Mobile" },
      { id: "control-core", type: "control-center", status: "ONLINE", label: "AI Central Control" }
    ]
  });
}
