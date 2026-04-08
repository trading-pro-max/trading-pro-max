import { NextResponse } from "next/server";
import { runVectorCycle } from "../../../../lib/tpm-vector-core.mjs";
export const dynamic = "force-dynamic";
export async function POST(){ return NextResponse.json(runVectorCycle()); }
