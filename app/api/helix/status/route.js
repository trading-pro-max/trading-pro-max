import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runHelixCycle } from "../../../../lib/tpm-helix-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "helix-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runHelixCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runHelixCycle());
  }
}
