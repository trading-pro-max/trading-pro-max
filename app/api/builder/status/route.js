import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runAutonomousBuilderCycle } from "../../../../lib/tpm-autobuilder-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "autonomous-builder-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runAutonomousBuilderCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runAutonomousBuilderCycle());
  }
}
