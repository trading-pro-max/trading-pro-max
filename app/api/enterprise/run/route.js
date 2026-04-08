import { NextResponse } from "next/server";
import { runEnterpriseCycle } from "../../../../lib/tpm-enterprise-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runEnterpriseCycle());
}
