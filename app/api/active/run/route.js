import { NextResponse } from "next/server";
import { runActiveCycle } from "../../../../lib/tpm-active-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runActiveCycle());
}
