import React, { useEffect, useState } from "react";
import { getRuntimeConfig } from "../lib/runtime";
import { getPaymentsConfig } from "../lib/payments";

type RuntimeData = {
  env?: string;
  publicBaseUrl?: string;
  apiUrl?: string;
  webhookPublicUrl?: string;
  corsOrigin?: string;
};

type PaymentsData = {
  enabled?: boolean;
  priceId?: string | null;
  webhookUrl?: string;
  publicBaseUrl?: string;
};

export default function ExternalConnectPage() {
  const [runtime, setRuntime] = useState<RuntimeData | null>(null);
  const [payments, setPayments] = useState<PaymentsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getRuntimeConfig(), getPaymentsConfig()])
      .then(([runtimeData, paymentsData]) => {
        setRuntime(runtimeData);
        setPayments(paymentsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load external config");
      });
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>External Connection</h1>

      {error ? (
        <div style={{ color: "#ff9db0" }}>{error}</div>
      ) : null}

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 10 }}>
        <div><strong>Environment:</strong> {runtime?.env || "..."}</div>
        <div><strong>Public Base URL:</strong> {runtime?.publicBaseUrl || "..."}</div>
        <div><strong>API URL:</strong> {runtime?.apiUrl || "..."}</div>
        <div><strong>Webhook URL:</strong> {runtime?.webhookPublicUrl || "..."}</div>
        <div><strong>CORS:</strong> {runtime?.corsOrigin || "..."}</div>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 10 }}>
        <div><strong>Payments Enabled:</strong> {payments?.enabled ? "YES" : "NO"}</div>
        <div><strong>Stripe Price:</strong> {payments?.priceId || "NOT SET"}</div>
        <div><strong>Checkout Base:</strong> {payments?.publicBaseUrl || "..."}</div>
        <div><strong>Webhook Target:</strong> {payments?.webhookUrl || "..."}</div>
      </div>
    </main>
  );
}
