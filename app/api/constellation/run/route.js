import { NextResponse } from "next/server";
import { runConstellationCycle } from "../../../../lib/tpm-constellation-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runConstellationCycle());
}
