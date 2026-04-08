import { NextResponse } from "next/server";
import { getLaunchRuntimeStatus } from "../../../../lib/tpm-launch-runtime.mjs";

export async function GET() {
  return NextResponse.json(getLaunchRuntimeStatus());
}
