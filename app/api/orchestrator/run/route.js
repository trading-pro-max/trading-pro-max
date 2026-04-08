import { NextResponse } from "next/server";
import { runOrchestratorCycle } from "../../../../lib/tpm-orchestrator-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runOrchestratorCycle());
}
