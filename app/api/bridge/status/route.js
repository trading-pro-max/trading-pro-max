import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runBridgeCycle } from "../../../../lib/tpm-bridge-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "bridge-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runBridgeCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runBridgeCycle());
  }
}
