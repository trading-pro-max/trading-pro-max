import { NextResponse } from "next/server";
import { getTradingCoreStatus } from "../../../../lib/tpm-master-progress.mjs";

export async function GET() {
  return NextResponse.json(getTradingCoreStatus());
}
