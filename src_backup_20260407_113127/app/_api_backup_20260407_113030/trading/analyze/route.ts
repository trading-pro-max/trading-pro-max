import { NextResponse } from "next/server";
import { analyzeMarket } from "@/lib/trading/market";

export async function GET() {
  const data = await analyzeMarket("BTCUSDT");
  return NextResponse.json(data);
}
