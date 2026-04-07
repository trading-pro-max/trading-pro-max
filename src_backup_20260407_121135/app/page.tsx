export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 12 }}>TRADING PRO MAX</div>
        <h1 style={{ fontSize: 48, margin: "12px 0" }}>Core Stable Engine</h1>
        <p style={{ color: "#94a3b8" }}>Platform rebuild is active.</p>
        <a href="/control" style={{ color: "#22c55e", fontWeight: 900, textDecoration: "none" }}>Open Control Center</a>
      </div>
    </main>
  );
}