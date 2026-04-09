import { NextResponse } from "next/server";
import { runLiveBridgeCycle } from "../../../../lib/tpm-live-bridge-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runLiveBridgeCycle());
}
