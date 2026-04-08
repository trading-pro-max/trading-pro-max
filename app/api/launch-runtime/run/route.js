import { NextResponse } from "next/server";
import { runLaunchRuntimeCycle } from "../../../../lib/tpm-launch-runtime.mjs";

export async function POST() {
  return NextResponse.json(runLaunchRuntimeCycle());
}
