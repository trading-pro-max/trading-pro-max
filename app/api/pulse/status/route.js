import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runPulseCycle } from "../../../../lib/tpm-pulse-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "pulse-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runPulseCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runPulseCycle());
  }
}
