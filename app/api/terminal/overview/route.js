import { getTradingTerminalOverview } from "../../../../lib/terminal/desk-service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const url = new URL(request.url);
  const selectedSymbol = url.searchParams.get("symbol") || undefined;
  const selectedTimeframe = url.searchParams.get("timeframe") || undefined;

  return Response.json(await getTradingTerminalOverview({ selectedSymbol, selectedTimeframe, persist: true }), {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
