import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSupremacyCycle } from "../../../../lib/tpm-supremacy-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "supremacy-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runSupremacyCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runSupremacyCycle());
  }
}
