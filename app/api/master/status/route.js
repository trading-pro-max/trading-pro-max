import { NextResponse } from "next/server";
import { getMasterStatus } from "../../../../lib/tpm-master.mjs";

export async function GET() {
  return NextResponse.json(getMasterStatus());
}
