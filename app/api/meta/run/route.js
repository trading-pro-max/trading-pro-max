import { NextResponse } from "next/server";
import { runMetaCycle } from "../../../../lib/tpm-meta-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runMetaCycle());
}
