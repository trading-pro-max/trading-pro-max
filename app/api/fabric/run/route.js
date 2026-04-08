import { NextResponse } from "next/server";
import { runFabricCycle } from "../../../../lib/tpm-fabric-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runFabricCycle());
}
