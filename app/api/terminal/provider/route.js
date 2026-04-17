import { getTradingTerminalProviderStatus } from "../../../../lib/terminal/desk-service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(await getTradingTerminalProviderStatus(), {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
