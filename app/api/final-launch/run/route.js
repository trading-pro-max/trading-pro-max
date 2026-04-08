import { NextResponse } from "next/server";
import { runFinalLaunchCycle } from "../../../../lib/tpm-final-launch-safe.mjs";

export async function POST() {
  return NextResponse.json(runFinalLaunchCycle());
}
