import { NextResponse } from "next/server";
import { runExecutiveCycle } from "../../../../lib/tpm-executive-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runExecutiveCycle());
}
