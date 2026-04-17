import { NextResponse } from "next/server";
import { runAnalyticsCycle } from "../../../../lib/tpm-analytics-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runAnalyticsCycle());
}
