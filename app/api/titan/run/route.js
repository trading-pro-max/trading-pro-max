import { NextResponse } from "next/server";
import { runTitanCycle } from "../../../../../lib/tpm-titan-core.mjs";
export const dynamic = "force-dynamic";
export async function POST(){ return NextResponse.json(runTitanCycle()); }
