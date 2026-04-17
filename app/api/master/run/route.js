import { NextResponse } from "next/server";
import { runMasterCycle } from "../../../../lib/tpm-master-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runMasterCycle());
}
