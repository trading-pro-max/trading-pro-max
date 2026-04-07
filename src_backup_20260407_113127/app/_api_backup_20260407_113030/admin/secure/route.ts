import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/security/auth-guard";
import { logSecurity } from "@/lib/security/audit";

export async function GET(req: Request) {
  const auth = requireAuth(req);

  if (auth instanceof NextResponse) return auth;

  logSecurity("ADMIN_ACCESS", { user: auth });

  return NextResponse.json({
    ok: true,
    system: "SECURED",
    time: new Date().toISOString(),
  });
}
