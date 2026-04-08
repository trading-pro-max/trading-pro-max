import { NextResponse } from "next/server";
import { runAutonomousCoreCycle } from "../../../../lib/tpm-autonomous-core.mjs";

export async function POST() {
  return NextResponse.json(runAutonomousCoreCycle());
}
