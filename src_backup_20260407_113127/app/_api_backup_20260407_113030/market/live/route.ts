import { NextResponse } from "next/server";
import { analyzeLiveMarket } from "@/lib/real/engine";

export async function GET() {
  const data = await analyzeLiveMarket();
  return NextResponse.json(data);
}
