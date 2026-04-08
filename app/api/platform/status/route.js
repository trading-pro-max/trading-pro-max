import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runPlatformCycle } from "../../../../lib/tpm-platform-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "platform-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runPlatformCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runPlatformCycle());
  }
}
