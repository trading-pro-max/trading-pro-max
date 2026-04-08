import { NextResponse } from "next/server";
import { getSuperStatus } from "../../../../lib/tpm-super-orchestrator.mjs";

export async function GET() {
  return NextResponse.json(getSuperStatus());
}
