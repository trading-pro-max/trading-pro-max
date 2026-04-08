import { NextResponse } from "next/server";
import { getSuperStatus } from "../../../../lib/tpm-final-launch-safe.mjs";

export async function GET() {
  return NextResponse.json(getSuperStatus());
}
