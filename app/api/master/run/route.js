import { NextResponse } from "next/server";
import { runMasterCycle } from "../../../../lib/tpm-master.mjs";

export async function POST() {
  return NextResponse.json(runMasterCycle());
}
