import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runExecutiveCycle } from "../../../../lib/tpm-executive-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "executive-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runExecutiveCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runExecutiveCycle());
  }
}
