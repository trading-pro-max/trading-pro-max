import { NextResponse } from "next/server";
import { getLiveMarket } from "../../../../lib/state.js";

export async function GET() {
  return NextResponse.json(getLiveMarket());
}