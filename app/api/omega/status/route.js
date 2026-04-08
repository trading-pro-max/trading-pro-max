import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runOmegaCycle } from "../../../../lib/tpm-omega-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "omega-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runOmegaCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runOmegaCycle());
  }
}
