import { NextResponse } from "next/server";
import { runNavigatorCycle } from "../../../../lib/tpm-navigator-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runNavigatorCycle());
}
