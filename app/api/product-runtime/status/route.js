import { NextResponse } from "next/server";
import { getProductRuntimeStatus } from "../../../../lib/tpm-product-runtime.mjs";

export async function GET() {
  return NextResponse.json(getProductRuntimeStatus());
}
