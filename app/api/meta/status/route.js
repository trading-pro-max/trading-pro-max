import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runMetaCycle } from "../../../../lib/tpm-meta-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "meta-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runMetaCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runMetaCycle());
  }
}
