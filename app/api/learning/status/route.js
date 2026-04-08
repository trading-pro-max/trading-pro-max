import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runLearningCycle } from "../../../../lib/tpm-learning-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "learning-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runLearningCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runLearningCycle());
  }
}
