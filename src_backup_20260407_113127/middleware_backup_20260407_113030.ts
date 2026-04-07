import { NextResponse } from "next/server";
import { protectRateLimit } from "@/lib/security/rate-limit";
import { getClientIP } from "@/lib/security/ip";

export async function middleware(req: any) {
  const ip = getClientIP(req);
  const ok = await protectRateLimit(ip);

  if (!ok) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const res = NextResponse.next();

  // ?? Security Headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Content-Security-Policy", "default-src 'self';");

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
