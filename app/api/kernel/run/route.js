import { NextResponse } from "next/server";
import { runKernelCycle } from "../../../../lib/tpm-kernel-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runKernelCycle());
}
