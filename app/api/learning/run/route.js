import { NextResponse } from "next/server";
import { runLearningCycle } from "../../../../lib/tpm-learning-core.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(runLearningCycle());
}
