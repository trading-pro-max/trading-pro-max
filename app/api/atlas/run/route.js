import { NextResponse } from "next/server";
import { runAtlasCycle } from "../../../../lib/tpm-atlas-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runAtlasCycle());
}
