import { NextResponse } from "next/server";
import { runIntelligenceCycle } from "../../../../lib/tpm-intelligence-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runIntelligenceCycle());
}
