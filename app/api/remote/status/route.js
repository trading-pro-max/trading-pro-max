import { NextResponse } from "next/server";
import { getRemotePromotionStatus } from "../../../../lib/tpm-remote-promotion.mjs";

export async function GET() {
  return NextResponse.json(getRemotePromotionStatus());
}
