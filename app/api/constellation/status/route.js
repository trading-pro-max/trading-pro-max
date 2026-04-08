import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runConstellationCycle } from "../../../../lib/tpm-constellation-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "constellation-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runConstellationCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runConstellationCycle());
  }
}
