import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runJump4Cycle } from "../../../../lib/tpm-jump4-core.mjs";
export const dynamic="force-dynamic";
export async function GET(){
  const f=path.join(process.cwd(),".tpm","jump4-runtime.json");
  if(!fs.existsSync(f)) return NextResponse.json(runJump4Cycle());
  try{return NextResponse.json(JSON.parse(fs.readFileSync(f,"utf8")))}catch{return NextResponse.json(runJump4Cycle())}
}
