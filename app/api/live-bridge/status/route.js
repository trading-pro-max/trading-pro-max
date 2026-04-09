import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runLiveBridgeCycle } from "../../../../lib/tpm-live-bridge-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "live-bridge-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runLiveBridgeCycle());
  try{
    return NextResponse.json(JSON.parse(fs.readFileSync(file,"utf8")));
  }catch{
    return NextResponse.json(runLiveBridgeCycle());
  }
}
