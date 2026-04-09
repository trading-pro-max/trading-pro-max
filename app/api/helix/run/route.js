import { NextResponse } from "next/server";
import { runHelixCycle } from "../../../../lib/tpm-helix-core.mjs";
export const dynamic = "force-dynamic";
export async function POST(){ return NextResponse.json(runHelixCycle()); }
