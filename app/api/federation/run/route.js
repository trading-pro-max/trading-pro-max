import { NextResponse } from "next/server";
import { runFederationCycle } from "../../../../lib/tpm-federation-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runFederationCycle());
}
