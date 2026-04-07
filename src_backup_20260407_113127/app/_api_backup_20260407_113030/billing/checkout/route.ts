import { NextResponse } from "next/server";
import { stripe, PRICE_ID } from "@/lib/billing/stripe";

export async function POST() {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: "http://localhost:3000/control?paid=1",
    cancel_url: "http://localhost:3000/control?canceled=1",
  });

  return NextResponse.json({ url: session.url });
}
