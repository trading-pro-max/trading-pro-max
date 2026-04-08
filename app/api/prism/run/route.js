import { NextResponse } from "next/server";
import { runPrismCycle } from "../../../../lib/tpm-prism-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runPrismCycle());
}
