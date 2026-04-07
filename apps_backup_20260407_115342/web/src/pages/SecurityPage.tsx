import React, { useEffect, useState } from "react";

type SecurityPayload = {
  ok?: boolean;
  env?: string;
  lockdown?: boolean;
  adminEmail?: string;
  issuer?: string;
  audience?: string;
  accessTokenTtlMinutes?: number;
  refreshTokenTtlDays?: number;
  cookie?: {
    name?: string;
    secure?: boolean;
    sameSite?: string;
    httpOnly?: boolean;
  };
  rateLimit?: {
    apiWindowMs?: number;
    apiMax?: number;
    authMax?: number;
  };
  internalWebhookTokenConfigured?: boolean;
};

export default function SecurityPage() {
  const [data, setData] = useState<SecurityPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8787/api/security/status")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load security status");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Security</h1>

      {error ? <div style={{ color: "#ff9db0" }}>{error}</div> : null}

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 8 }}>
        <div><strong>Environment:</strong> {data?.env || "..."}</div>
        <div><strong>Lockdown:</strong> {data?.lockdown ? "ON" : "OFF"}</div>
        <div><strong>Admin Email:</strong> {data?.adminEmail || "..."}</div>
        <div><strong>Issuer:</strong> {data?.issuer || "..."}</div>
        <div><strong>Audience:</strong> {data?.audience || "..."}</div>
        <div><strong>Access TTL:</strong> {data?.accessTokenTtlMinutes || "..."} minutes</div>
        <div><strong>Refresh TTL:</strong> {data?.refreshTokenTtlDays || "..."} days</div>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 8 }}>
        <div><strong>Cookie Name:</strong> {data?.cookie?.name || "..."}</div>
        <div><strong>Cookie Secure:</strong> {data?.cookie?.secure ? "YES" : "NO"}</div>
        <div><strong>SameSite:</strong> {data?.cookie?.sameSite || "..."}</div>
        <div><strong>HTTP Only:</strong> {data?.cookie?.httpOnly ? "YES" : "NO"}</div>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 8 }}>
        <div><strong>API Window:</strong> {data?.rateLimit?.apiWindowMs || "..."} ms</div>
        <div><strong>API Max:</strong> {data?.rateLimit?.apiMax || "..."}</div>
        <div><strong>Auth Max:</strong> {data?.rateLimit?.authMax || "..."}</div>
        <div><strong>Webhook Token:</strong> {data?.internalWebhookTokenConfigured ? "CONFIGURED" : "MISSING"}</div>
      </div>
    </main>
  );
}
