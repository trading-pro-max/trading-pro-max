import { NextResponse } from "next/server";
import { runInfinityCycle } from "../../../../lib/tpm-infinity-core.mjs";
export const dynamic="force-dynamic";
export async function POST(){ return NextResponse.json(runInfinityCycle()); }
