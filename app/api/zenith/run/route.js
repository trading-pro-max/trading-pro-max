import { NextResponse } from "next/server";
import { runZenithCycle } from "../../../../lib/tpm-zenith-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runZenithCycle());
}
