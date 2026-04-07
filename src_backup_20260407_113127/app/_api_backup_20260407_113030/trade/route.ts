import { NextResponse } from "next/server";
import { connectIB, placeOrder } from "@/lib/broker/ibkr";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    connectIB();

    const result = placeOrder(
      body.symbol || "AAPL",
      body.action || "BUY",
      body.qty || 1
    );

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}
