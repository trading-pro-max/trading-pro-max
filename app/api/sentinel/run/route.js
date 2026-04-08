import { NextResponse } from "next/server";
import { runSentinelCycle } from "../../../../lib/tpm-sentinel-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runSentinelCycle());
}
