import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "NO_KEY" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: "demo@tpm.com",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Trading Pro Max PRO",
            },
            unit_amount: 2000,
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("STRIPE ERROR:", err);
    return NextResponse.json(
      { error: "STRIPE_FAILED" },
      { status: 500 }
    );
  }
}
