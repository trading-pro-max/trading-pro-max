import { NextResponse } from "next/server";
import { runProductRuntimeCycle } from "../../../../lib/tpm-product-runtime.mjs";

export async function POST() {
  return NextResponse.json(runProductRuntimeCycle());
}
