import { NextResponse } from "next/server";
import { runStrategyCycle } from "../../../../../lib/tpm-strategy-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runStrategyCycle());
}
