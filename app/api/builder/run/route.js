import { NextResponse } from "next/server";
import { runAutonomousBuilderCycle } from "../../../../lib/tpm-autobuilder-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runAutonomousBuilderCycle());
}
