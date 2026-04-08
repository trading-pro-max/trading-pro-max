import { NextResponse } from "next/server";
import { runGovernanceCycle } from "../../../../lib/tpm-governance-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runGovernanceCycle());
}
