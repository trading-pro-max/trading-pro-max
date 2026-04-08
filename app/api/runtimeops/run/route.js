import { NextResponse } from "next/server";
import { runRuntimeOpsCycle } from "../../../../lib/tpm-runtimeops-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runRuntimeOpsCycle());
}
