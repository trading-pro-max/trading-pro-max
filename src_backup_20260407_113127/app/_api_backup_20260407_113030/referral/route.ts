import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { makeReferralCode } from "@/lib\growth\referral";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const email = parsed.email.toLowerCase();

    let existing = await db.referral.findFirst({ where: { email } });
    if (!existing) {
      existing = await db.referral.create({
        data: {
          email,
          code: makeReferralCode(email),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      code: existing.code,
      link: `http://localhost:3000/launch?ref=${existing.code}`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "REFERRAL_FAILED" }, { status: 400 });
  }
}
