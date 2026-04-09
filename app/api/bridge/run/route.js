import { NextResponse } from "next/server";
import { runBridgeCycle } from "../../../../lib/tpm-bridge-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runBridgeCycle());
}
