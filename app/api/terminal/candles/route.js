import { getTradingTerminalCandles } from "../../../../lib/terminal/desk-service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") || "EUR/USD";
  const timeframe = url.searchParams.get("timeframe") || "15m";

  return Response.json(await getTradingTerminalCandles({ symbol, timeframe }), {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
