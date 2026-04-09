import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runHyperGrowthCycle } from "../../../../lib/tpm-hypergrowth-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "hypergrowth-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runHyperGrowthCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runHyperGrowthCycle());
  }
}
