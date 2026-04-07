import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
  referralCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    const lead = await db.lead.upsert({
      where: { email: parsed.email.toLowerCase() },
      update: {
        source: parsed.source || "launch",
        referralCode: parsed.referralCode || null,
      },
      create: {
        email: parsed.email.toLowerCase(),
        source: parsed.source || "launch",
        referralCode: parsed.referralCode || null,
      },
    });

    if (parsed.referralCode) {
      await db.referral.updateMany({
        where: { code: parsed.referralCode },
        data: { signups: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true, lead });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "WAITLIST_FAILED" }, { status: 400 });
  }
}
