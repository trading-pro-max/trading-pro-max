import { NextResponse } from "next/server";
import { runVertexCycle } from "../../../../lib/tpm-vertex-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runVertexCycle());
}
