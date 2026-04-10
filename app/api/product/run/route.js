import { NextResponse } from "next/server";
import { runProductCycle } from "../../../../lib/tpm-product-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runProductCycle());
}
