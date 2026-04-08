import { NextResponse } from "next/server";
import { runNexusCycle } from "../../../../lib/tpm-nexus-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runNexusCycle());
}
