import { NextResponse } from "next/server";
import { runInfinity3Cycle } from "../../../../lib/tpm-infinity3-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runInfinity3Cycle());
}
