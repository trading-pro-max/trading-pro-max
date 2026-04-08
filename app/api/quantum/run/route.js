import { NextResponse } from "next/server";
import { runQuantumCycle } from "../../../../lib/tpm-quantum-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runQuantumCycle());
}
