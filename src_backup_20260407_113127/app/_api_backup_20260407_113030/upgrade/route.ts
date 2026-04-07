import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST() {
  try {
    await prisma.user.update({
      where: { email: "demo@tpm.com" },
      data: { plan: "pro" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: true });
  }
}
