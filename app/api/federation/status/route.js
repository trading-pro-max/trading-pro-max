import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runFederationCycle } from "../../../../lib/tpm-federation-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "federation-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runFederationCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runFederationCycle());
  }
}
