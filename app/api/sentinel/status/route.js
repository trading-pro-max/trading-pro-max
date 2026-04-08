import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSentinelCycle } from "../../../../lib/tpm-sentinel-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "sentinel-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runSentinelCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runSentinelCycle());
  }
}
