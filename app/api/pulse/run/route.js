import { NextResponse } from "next/server";
import { runPulseCycle } from "../../../../lib/tpm-pulse-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runPulseCycle());
}
