import { runTradingTerminalControlAction } from "../../../../lib/terminal/desk-service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));

  return Response.json(await runTradingTerminalControlAction(payload), {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
