import { NextResponse } from "next/server";
import { runAiCycle } from "../../../../lib/tpm-ai-brain.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runAiCycle());
}
