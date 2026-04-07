import { NextResponse } from 'next/server'; const g=globalThis as any; if(!g.__TPM_PAPER__) g.__TPM_PAPER__=[]; export async function GET(){ return NextResponse.json(g.__TPM_PAPER__); }
