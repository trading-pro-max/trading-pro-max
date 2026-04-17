import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runLiveIntegrationsCycle } from "../../../../lib/tpm-live-integrations.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "live-integrations-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(await runLiveIntegrationsCycle());

  try{
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  }catch{
    return NextResponse.json(await runLiveIntegrationsCycle());
  }
}
