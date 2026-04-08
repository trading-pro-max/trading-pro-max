import { NextResponse } from "next/server";
import { runSimulationCycle } from "../../../../lib/tpm-simulation-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runSimulationCycle());
}
