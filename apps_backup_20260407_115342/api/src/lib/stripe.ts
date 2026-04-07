import Stripe from "stripe";
import { loadPlatformConfig } from "@trading-pro-max/shared";

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

export function getPaymentsConfig() {
  const config = loadPlatformConfig();

  return {
    enabled: Boolean(process.env.STRIPE_SECRET_KEY),
    priceId: process.env.STRIPE_PRICE_ID || null,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    successUrl:
      process.env.STRIPE_SUCCESS_URL ||
      `${config.publicBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl:
      process.env.STRIPE_CANCEL_URL ||
      `${config.publicBaseUrl}/billing/cancel`,
    portalReturnUrl:
      process.env.STRIPE_PORTAL_RETURN_URL ||
      `${config.publicBaseUrl}/settings`,
    webhookUrl: config.webhookPublicUrl,
    publicBaseUrl: config.publicBaseUrl,
    apiBaseUrl: config.apiUrl
  };
}
