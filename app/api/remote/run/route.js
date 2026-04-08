import { NextResponse } from "next/server";
import { runRemotePromotion } from "../../../../lib/tpm-remote-promotion.mjs";

export async function POST() {
  return NextResponse.json(runRemotePromotion());
}
