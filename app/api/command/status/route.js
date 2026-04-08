import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runCommandCycle } from "../../../../lib/tpm-command-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "command-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runCommandCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runCommandCycle());
  }
}
