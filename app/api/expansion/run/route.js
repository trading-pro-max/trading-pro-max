import { NextResponse } from "next/server";
import { runExpansionCycle } from "../../../../../lib/tpm-expansion-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runExpansionCycle());
}
