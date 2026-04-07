import { NextResponse } from "next/server";
import { simulateTrade } from "@/lib/trading/engine";

export async function POST() {
  const trade = simulateTrade();
  return NextResponse.json({ ok:true, trade });
}
