import { NextResponse } from "next/server";
import { runSuperCycle } from "../../../../lib/tpm-super-orchestrator.mjs";

export async function POST() {
  return NextResponse.json(runSuperCycle());
}
