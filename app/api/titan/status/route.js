import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runTitanCycle } from "../../../../../lib/tpm-titan-core.mjs";
export const dynamic = "force-dynamic";
export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "titan-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runTitanCycle());
  try { return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8"))); }
  catch { return NextResponse.json(runTitanCycle()); }
}
