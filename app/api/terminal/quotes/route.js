import { getTradingTerminalQuotes } from "../../../../lib/terminal/desk-service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const url = new URL(request.url);
  const symbols = (url.searchParams.get("symbols") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return Response.json(await getTradingTerminalQuotes(symbols), {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
