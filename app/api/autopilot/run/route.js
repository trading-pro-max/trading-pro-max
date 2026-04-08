import { NextResponse } from "next/server";
import { runAutopilotCycle } from "../../../../lib/tpm-autopilot-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runAutopilotCycle());
}
