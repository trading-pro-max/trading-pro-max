import { NextResponse } from "next/server";
import { getPaperTrades } from "@/lib/paper/engine";

export async function GET() {
  return NextResponse.json(getPaperTrades());
}
