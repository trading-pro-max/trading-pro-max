import { NextResponse } from "next/server";
import { runHyperJumpCycle } from "../../../../lib/tpm-hyperjump-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runHyperJumpCycle());
}
