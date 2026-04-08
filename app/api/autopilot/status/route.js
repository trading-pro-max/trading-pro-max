import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runAutopilotCycle } from "../../../../lib/tpm-autopilot-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "autopilot-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runAutopilotCycle());
  try{
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  }catch{
    return NextResponse.json(runAutopilotCycle());
  }
}
