import { NextResponse } from "next/server";
import { analyzeLiveMarket } from "@/lib/real/engine";

const g = globalThis as any;
if (!g.__TPM_MARKET_SNAPSHOTS__) g.__TPM_MARKET_SNAPSHOTS__ = [];

export async function GET() {
  const live = await analyzeLiveMarket("BTCUSDT");
  if (live) {
    g.__TPM_MARKET_SNAPSHOTS__.unshift(live);
    g.__TPM_MARKET_SNAPSHOTS__ = g.__TPM_MARKET_SNAPSHOTS__.slice(0, 60);
  }

  return NextResponse.json({
    current: live,
    history: g.__TPM_MARKET_SNAPSHOTS__,
  });
}
