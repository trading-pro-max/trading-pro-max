import { NextResponse } from "next/server";
import { runBrokerCycle } from "../../../../lib/tpm-broker-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runBrokerCycle());
}
