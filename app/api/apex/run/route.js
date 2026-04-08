import { NextResponse } from 'next/server';
import { runApexCycle } from '../../../../lib/tpm-apex-core.mjs';

export const dynamic = 'force-dynamic';

export async function POST(){
  return NextResponse.json(runApexCycle());
}
