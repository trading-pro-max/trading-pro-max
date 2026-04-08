import { NextResponse } from "next/server";
import { certifyGlobal100 } from "../../../../lib/tpm-final-launch-safe.mjs";

export async function POST() {
  return NextResponse.json(certifyGlobal100());
}
