import { NextResponse } from "next/server";
import { runProductionPromotion } from "../../../../lib/tpm-production-promotion.mjs";

export async function POST() {
  return NextResponse.json(runProductionPromotion());
}
