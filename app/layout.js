import { getManifest } from "../lib/tpm-runtime.mjs";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  const manifest = getManifest();

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020617", color: "white", fontFamily: "Arial, sans-serif" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1f2937", background: "rgba(2,6,23,.92)", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 1600, margin: "0 auto", padding: "14px 20px", display: "grid", gap: 12 }}>
            <div>
              <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 11 }}>{manifest.productName.toUpperCase()}</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{manifest.systemTitle}</div>
            </div>
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="/" style={{ color: "white", textDecoration: "none", border: "1px solid #334155", background: "#0b1220", padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}>Home</a>
              <a href="/builder" style={{ color: "white", textDecoration: "none", border: "1px solid #334155", background: "#0b1220", padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}>Builder</a>
              {manifest.modules.map((m) => (
                <a
                  key={m.slug}
                  href={`/${m.slug}`}
                  style={{ color: "white", textDecoration: "none", border: "1px solid #334155", background: "#0b1220", padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}
                >
                  {m.title}
                </a>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
