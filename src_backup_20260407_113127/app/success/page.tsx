"use client";

import { useEffect } from "react";

export default function Success() {
  useEffect(() => {
    fetch("/api/upgrade", { method: "POST" });
  }, []);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      background: "#0b0f19",
      color: "white"
    }}>
      <h1>? PRO Activated</h1>
      <a href="/dashboard">
        <button style={{ marginTop: 20 }}>Enter Platform</button>
      </a>
    </div>
  );
}
