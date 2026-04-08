import { NextResponse } from "next/server";
import { getProductionPromotionStatus } from "../../../../lib/tpm-production-promotion.mjs";

export async function GET() {
  return NextResponse.json(getProductionPromotionStatus());
}
