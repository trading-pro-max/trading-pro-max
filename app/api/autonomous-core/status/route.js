import { NextResponse } from "next/server";
import { getAutonomousCoreStatus } from "../../../../lib/tpm-autonomous-core.mjs";

export async function GET() {
  return NextResponse.json(getAutonomousCoreStatus());
}
