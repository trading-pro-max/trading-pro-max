import { NextResponse } from "next/server";
import { runInfinitySevenCycle } from "../../../../lib/tpm-infinity-seven-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runInfinitySevenCycle());
}
