import { NextResponse } from "next/server";
import { runHyperGrowthCycle } from "../../../../lib/tpm-hypergrowth-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runHyperGrowthCycle());
}
