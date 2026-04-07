import { Router } from "express";
export const billingReadinessRouter = Router();
billingReadinessRouter.get("/readiness", (_req, res) => {
  const secret = !!process.env.STRIPE_SECRET_KEY;
  const publishable = !!process.env.STRIPE_PUBLISHABLE_KEY;
  const price = !!process.env.STRIPE_PRICE_ID;
  res.json({
    ok: secret && publishable && price,
    configured: { stripeSecretKey: secret, stripePublishableKey: publishable, stripePriceId: price },
    urls: {
      successUrl: process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/billing/success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: process.env.STRIPE_CANCEL_URL || "http://localhost:5173/billing/cancel",
      webhookUrl: process.env.WEBHOOK_PUBLIC_URL || "http://localhost:8787/api/payments/webhook"
    }
  });
});
