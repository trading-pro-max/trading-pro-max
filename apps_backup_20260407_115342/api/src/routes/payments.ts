import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getPaymentsConfig, getStripe } from '../lib/stripe';

export const paymentsRouter = Router();

function writeWebhookLog(line: unknown) {
  const logDir = path.resolve(process.cwd(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'payments-webhook.ndjson');
  fs.appendFileSync(logPath, `${JSON.stringify(line)}\n`, 'utf8');
}

paymentsRouter.get("/config", (_req, res) => {
  const cfg = getPaymentsConfig();
  res.json({
    ...cfg,
    runtime: {
      mode: process.env.APP_ENV || process.env.NODE_ENV || "development"
    }
  });
});

paymentsRouter.post('/checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const cfg = getPaymentsConfig();
    const body = req.body || {};

    const priceId = body.priceId || cfg.priceId;
    if (!priceId) {
      return res.status(400).json({ error: 'Missing STRIPE_PRICE_ID or body.priceId' });
    }

    const mode = body.mode === 'payment' ? 'payment' : 'subscription';
    const customerEmail =
      body.customerEmail ||
      process.env.DEMO_USER_EMAIL ||
      'admin@tradingpromax.local';

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      allow_promotion_codes: true,
      success_url: cfg.successUrl,
      cancel_url: cfg.cancelUrl
    });

    return res.json({
      ok: true,
      id: session.id,
      url: session.url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout session failed';
    return res.status(500).json({ error: message });
  }
});

paymentsRouter.post('/portal-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const cfg = getPaymentsConfig();
    const body = req.body || {};

    const customerId = body.customerId;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: cfg.portalReturnUrl
    });

    return res.json({
      ok: true,
      url: portal.url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal session failed';
    return res.status(500).json({ error: message });
  }
});

export async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      return res.status(400).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, secret);

    writeWebhookLog({
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode
    });

    return res.json({
      received: true,
      type: event.type
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook verification failed';
    return res.status(400).json({ error: message });
  }
}
