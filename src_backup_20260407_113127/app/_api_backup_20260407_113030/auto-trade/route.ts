import { NextResponse } from "next/server";

let autoMode = true;

export async function GET() {
  return NextResponse.json({ autoMode });
}

export async function POST() {
  autoMode = !autoMode;
  return NextResponse.json({ autoMode });
}
