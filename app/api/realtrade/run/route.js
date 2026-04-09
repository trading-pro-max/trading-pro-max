import { NextResponse } from "next/server";
import { runRealTradeCycle } from "../../../../lib/tpm-realtrade-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runRealTradeCycle());
}
