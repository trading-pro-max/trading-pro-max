import { NextResponse } from "next/server";
import { runPlatformCycle } from "../../../../lib/tpm-platform-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runPlatformCycle());
}
