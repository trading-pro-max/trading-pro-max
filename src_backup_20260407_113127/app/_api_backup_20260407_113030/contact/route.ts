import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    const item = await db.contactMessage.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        message: parsed.message,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "CONTACT_FAILED" }, { status: 400 });
  }
}
