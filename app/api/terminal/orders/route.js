import {
  cancelTradingTerminalOrder,
  submitTradingTerminalOrder
} from "../../../../lib/terminal/desk-service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));

  if (payload.action === "cancel") {
    return Response.json(await cancelTradingTerminalOrder(payload.orderId), {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  }

  return Response.json(await submitTradingTerminalOrder(payload), {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
