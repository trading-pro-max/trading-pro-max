import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runNavigatorCycle } from "../../../../lib/tpm-navigator-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "navigator-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runNavigatorCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runNavigatorCycle());
  }
}
