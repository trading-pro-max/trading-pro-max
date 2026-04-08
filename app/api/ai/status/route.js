import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runAiCycle } from "../../../../../lib/tpm-ai-brain.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "ai-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runAiCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runAiCycle());
  }
}
