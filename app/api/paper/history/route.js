import { NextResponse } from "next/server";
import { getState } from "../../../../lib/state.js";

export async function GET() {
  return NextResponse.json(getState().paperTrades || []);
}
