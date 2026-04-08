import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runBrokerCycle } from "../../../../lib/tpm-broker-core.mjs";

export const dynamic = "force-dynamic";

export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "broker-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runBrokerCycle());
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return NextResponse.json(runBrokerCycle());
  }
}
