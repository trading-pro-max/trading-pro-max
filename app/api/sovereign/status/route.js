import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSovereignCycle } from "../../../../lib/tpm-sovereign-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "sovereign-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runSovereignCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runSovereignCycle());
  }
}
