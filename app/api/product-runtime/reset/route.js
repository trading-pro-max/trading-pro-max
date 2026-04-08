import { NextResponse } from "next/server";
import { resetProductRuntime } from "../../../../lib/tpm-product-runtime.mjs";

export async function POST() {
  return NextResponse.json(resetProductRuntime());
}
