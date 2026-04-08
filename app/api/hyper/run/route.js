import { NextResponse } from "next/server";
import { runHyperCycle } from "../../../../lib/tpm-hyper-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runHyperCycle());
}
