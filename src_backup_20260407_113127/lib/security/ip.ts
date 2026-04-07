export function getClientIP(req: Request) {
  return req.headers.get("x-forwarded-for") || "unknown";
}
