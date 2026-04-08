import { NextResponse } from "next/server";
import { runCouncilCycle } from "../../../../lib/tpm-council-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runCouncilCycle());
}
