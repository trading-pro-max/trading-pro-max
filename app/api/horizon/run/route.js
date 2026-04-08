import { NextResponse } from "next/server";
import { runHorizonCycle } from "../../../../lib/tpm-horizon-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runHorizonCycle());
}
