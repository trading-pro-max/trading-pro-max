import { NextResponse } from "next/server";
import { promoteFinalLaunch } from "../../../../lib/tpm-final-launch.mjs";

export async function POST() {
  return NextResponse.json(promoteFinalLaunch());
}
