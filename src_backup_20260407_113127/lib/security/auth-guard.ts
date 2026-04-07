import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

export function requireAuth(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const user = verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 403 });
  }

  return user;
}
