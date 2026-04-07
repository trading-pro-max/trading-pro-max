export function validateEnv() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY_MISSING');
  if (!key.startsWith('sk_')) throw new Error('INVALID_STRIPE_SECRET_KEY');
}
