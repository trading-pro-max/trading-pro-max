import { NextResponse } from "next/server";
import { runCommandCycle } from "../../../../lib/tpm-command-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runCommandCycle());
}
