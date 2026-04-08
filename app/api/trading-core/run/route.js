import { NextResponse } from "next/server";
import { runTradingCoreCycle } from "../../../../lib/tpm-master-progress.mjs";

export async function POST() {
  return NextResponse.json(runTradingCoreCycle());
}
