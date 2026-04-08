import { NextResponse } from "next/server";
import { runSupremacyCycle } from "../../../../lib/tpm-supremacy-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runSupremacyCycle());
}
