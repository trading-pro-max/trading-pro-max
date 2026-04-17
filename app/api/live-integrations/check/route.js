import { NextResponse } from "next/server";
import { runLiveIntegrationsCycle } from "../../../../lib/tpm-live-integrations.mjs";

export const dynamic = "force-dynamic";

export async function POST(){
  return NextResponse.json(await runLiveIntegrationsCycle());
}
