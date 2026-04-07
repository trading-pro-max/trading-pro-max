import { NextResponse } from "next/server";
import { getTrades } from "@/lib/trading/engine";

export async function GET() {
  return NextResponse.json(getTrades());
}
