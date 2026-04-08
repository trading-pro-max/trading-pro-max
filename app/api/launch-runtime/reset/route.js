import { NextResponse } from "next/server";
import { resetLaunchRuntime } from "../../../../lib/tpm-launch-runtime.mjs";

export async function POST() {
  return NextResponse.json(resetLaunchRuntime());
}
