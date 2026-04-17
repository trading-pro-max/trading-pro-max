import Link from "next/link";
import { getManifest } from "../lib/tpm-runtime.mjs";
import { coreModules } from "./_components/product-modules";
import { deskTheme } from "./_components/product-theme";

export const dynamic = "force-dynamic";
export const metadata = {
  title: {
    default: "Trading Pro Max",
    template: "%s | Trading Pro Max"
  },
  description: "Desktop-first institutional trading workspace for Trading Pro Max."
};

export default function RootLayout({ children }) {
  const manifest = getManifest();
  const productLinks = [
    { href: "/", label: "Workspace" },
    ...coreModules.map((item) => ({ href: item.href, label: item.label }))
  ];

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020617", color: "white", fontFamily: deskTheme.fonts.ui }}>
        <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${deskTheme.colors.line}`, background: "rgba(2,6,23,.92)", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 1600, margin: "0 auto", padding: "14px 20px", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: deskTheme.colors.sky, letterSpacing: 4, fontSize: 11, fontWeight: 900 }}>{manifest.productName.toUpperCase()}</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Local Release Candidate Workspace</div>
              </div>
              <div style={{ color: deskTheme.colors.soft, fontSize: 13, maxWidth: 540, lineHeight: 1.5 }}>
                Local product surface only. The six core trading modules are the canonical entry points for the repo.
              </div>
            </div>
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ color: "white", textDecoration: "none", border: `1px solid ${deskTheme.colors.line}`, background: "#0b1220", padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
