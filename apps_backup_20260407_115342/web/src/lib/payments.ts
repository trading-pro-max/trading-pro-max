const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8787';

export async function getPaymentsConfig() {
  const response = await fetch(`${API_BASE}/api/payments/config`);
  if (!response.ok) {
    throw new Error('Failed to load payments config');
  }
  return response.json();
}

export async function createCheckoutSession(payload: {
  priceId?: string;
  customerEmail?: string;
  mode?: 'payment' | 'subscription';
}) {
  const response = await fetch(`${API_BASE}/api/payments/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Checkout session failed');
  }

  return data;
}

export async function createPortalSession(payload: {
  customerId: string;
}) {
  const response = await fetch(`${API_BASE}/api/payments/portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Portal session failed');
  }

  return data;
}
