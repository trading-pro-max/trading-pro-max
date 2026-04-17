import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runInfinitySevenCycle } from "../../../../lib/tpm-infinity-seven-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "infinity-seven-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runInfinitySevenCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runInfinitySevenCycle());
  }
}
