import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  const body = await req.text();

  try {
    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const email = event.data.object.customer_email;

      await prisma.user.update({
        where: { email },
        data: { plan: "pro" },
      });
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
