import { NextResponse } from "next/server";
import { runTelegramTest } from "../../../../../lib/tpm-live-integrations.mjs";

export const dynamic = "force-dynamic";

export async function POST(req){
  let body = {};
  try{ body = await req.json(); }catch{}
  const text = body?.text || "TPM live integration test";
  return NextResponse.json(await runTelegramTest(text));
}
