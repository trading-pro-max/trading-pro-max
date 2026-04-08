import { NextResponse } from "next/server";
import { runMarketCycle } from "../../../../lib/tpm-market-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runMarketCycle());
}
