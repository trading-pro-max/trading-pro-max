import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runQuantumCycle } from "../../../../lib/tpm-quantum-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "quantum-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runQuantumCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runQuantumCycle());
  }
}
