import { NextResponse } from "next/server";
import { runObservabilityCycle } from "../../../../lib/tpm-observability-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runObservabilityCycle());
}
