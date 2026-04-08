import { NextResponse } from "next/server";
import { runOmegaCycle } from "../../../../lib/tpm-omega-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runOmegaCycle());
}
