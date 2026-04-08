import { NextResponse } from "next/server";
import { getFinalLaunchStatus } from "../../../../lib/tpm-final-launch.mjs";

export async function GET() {
  return NextResponse.json(getFinalLaunchStatus());
}
