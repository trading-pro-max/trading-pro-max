import React, { useEffect, useState } from "react";
import { getServicesStatus } from "../lib/services";

type ServiceItem = {
  key: string;
  label: string;
  enabled: boolean;
  valuePreview: string | null;
};

type ServicesPayload = {
  publicBaseUrl?: string;
  apiBaseUrl?: string;
  webhookPublicUrl?: string;
  supportEmail?: string;
  emailFrom?: string;
  services?: ServiceItem[];
};

export default function ServicesPage() {
  const [data, setData] = useState<ServicesPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getServicesStatus()
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load services");
      });
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Services</h1>

      {error ? <div style={{ color: "#ff9db0" }}>{error}</div> : null}

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 10 }}>
        <div><strong>Public Base URL:</strong> {data?.publicBaseUrl || "..."}</div>
        <div><strong>API Base URL:</strong> {data?.apiBaseUrl || "..."}</div>
        <div><strong>Webhook URL:</strong> {data?.webhookPublicUrl || "..."}</div>
        <div><strong>Support Email:</strong> {data?.supportEmail || "..."}</div>
        <div><strong>Email From:</strong> {data?.emailFrom || "..."}</div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {(data?.services || []).map((service) => (
          <div
            key={service.key}
            style={{
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 18,
              padding: 16,
              display: "grid",
              gap: 8
            }}
          >
            <div style={{ fontWeight: 800 }}>{service.label}</div>
            <div>Status: {service.enabled ? "CONNECTED" : "NOT CONNECTED"}</div>
            <div>Value: {service.valuePreview || "EMPTY"}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
