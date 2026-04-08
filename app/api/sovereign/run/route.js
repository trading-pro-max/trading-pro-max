import { NextResponse } from "next/server";
import { runSovereignCycle } from "../../../../lib/tpm-sovereign-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runSovereignCycle());
}
