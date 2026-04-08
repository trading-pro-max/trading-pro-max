import { NextResponse } from "next/server";
import { runJump4Cycle } from "../../../../lib/tpm-jump4-core.mjs";
export const dynamic="force-dynamic";
export async function POST(){ return NextResponse.json(runJump4Cycle()) }
