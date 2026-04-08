import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runHorizonCycle } from "../../../../lib/tpm-horizon-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "horizon-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runHorizonCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runHorizonCycle());
  }
}
