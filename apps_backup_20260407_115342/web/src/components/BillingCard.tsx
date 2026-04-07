import React, { useMemo, useState } from 'react';
import { createCheckoutSession, getPaymentsConfig } from '../lib/payments';

export default function BillingCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('admin@tradingpromax.local');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useMemo(() => {
    getPaymentsConfig()
      .then((cfg) => {
        setEnabled(Boolean(cfg?.enabled));
        setConfigLoaded(true);
      })
      .catch(() => {
        setEnabled(false);
        setConfigLoaded(true);
      });
  }, []);

  async function startCheckout() {
    setLoading(true);
    setMessage('');

    try {
      const result = await createCheckoutSession({
        customerEmail: email,
        mode: 'subscription'
      });

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      setMessage('Session created but no redirect URL returned.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 18,
        padding: 20,
        background: 'rgba(255,255,255,.04)',
        display: 'grid',
        gap: 12,
        maxWidth: 520
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800 }}>Billing</div>
      <div style={{ color: '#9fb0d0' }}>
        {configLoaded
          ? enabled
            ? 'Payments layer is integrated and ready for Stripe keys.'
            : 'Payments layer is integrated but Stripe keys are missing.'
          : 'Loading billing config...'}
      </div>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder='customer email'
        style={{
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(0,0,0,.2)',
          color: 'white',
          padding: '12px 14px'
        }}
      />

      <button
        onClick={startCheckout}
        disabled={loading}
        style={{
          borderRadius: 12,
          border: 'none',
          padding: '12px 16px',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        {loading ? 'Opening checkout...' : 'Open Stripe Checkout'}
      </button>

      {message ? <div style={{ color: '#ffb4c0' }}>{message}</div> : null}
    </div>
  );
}
