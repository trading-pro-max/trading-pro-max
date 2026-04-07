import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:8787";

export default function AuthPage() {
  const [email, setEmail] = useState("admin@tradingpromax.local");
  const [password, setPassword] = useState("admin123");
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function loadStatus() {
    try {
      const response = await fetch(`${API_BASE}/api/auth/status`, {
        credentials: "include"
      });
      const data = await response.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function login() {
    setMessage("Signing in...");
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Login failed");
      setMessage("Login successful");
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function logout() {
    setMessage("Signing out...");
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setMessage("Logged out");
    await loadStatus();
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Auth</h1>

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18, display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{ padding: 12, borderRadius: 12 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" style={{ padding: 12, borderRadius: 12 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={login} style={{ padding: "12px 16px", borderRadius: 12, fontWeight: 700 }}>Login</button>
          <button onClick={logout} style={{ padding: "12px 16px", borderRadius: 12, fontWeight: 700 }}>Logout</button>
        </div>
        {message ? <div>{message}</div> : null}
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(status, null, 2)}</pre>
      </div>
    </main>
  );
}
