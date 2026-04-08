import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runAgentMeshCycle } from "../../../../lib/tpm-agentmesh-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "agentmesh-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runAgentMeshCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runAgentMeshCycle());
  }
}
