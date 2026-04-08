import { NextResponse } from "next/server";
import { runAgentMeshCycle } from "../../../../lib/tpm-agentmesh-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runAgentMeshCycle());
}
