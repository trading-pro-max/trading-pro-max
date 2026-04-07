export const metadata = {
  title: "Trading Pro Max",
  description: "Global Trading Operating System"
};

const links = [
  { href: "/control", label: "Control" },
  { href: "/workspace", label: "Workspace" },
  { href: "/strategy-lab", label: "Strategy Lab" },
  { href: "/execution", label: "Execution" },
  { href: "/autonomy", label: "Autonomy" },
  { href: "/identity", label: "Identity" },
  { href: "/platform", label: "Platform" },
  { href: "/ops", label: "Ops" }
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020617", color: "white", fontFamily: "Arial, sans-serif" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1f2937", background: "rgba(2,6,23,.92)", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 1500, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 11 }}>TRADING PRO MAX</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>Global Operating System</div>
            </div>
            <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {links.map((x) => (
                <a
                  key={x.href}
                  href={x.href}
                  style={{
                    color: "white",
                    textDecoration: "none",
                    border: "1px solid #334155",
                    background: "#0b1220",
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 14
                  }}
                >
                  {x.label}
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
