import Link from "next/link";
import { ProductWorkspaceChrome } from "./ProductWorkspaceChrome";
import { createPillStyle, createSurface, deskTheme, toneMap } from "./product-theme";

const shell = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(8, 145, 178, 0.20) 0%, transparent 22%), radial-gradient(circle at 80% 14%, rgba(59, 130, 246, 0.16) 0%, transparent 26%), linear-gradient(180deg, #07101d 0%, #040914 46%, #02050c 100%)",
  color: deskTheme.colors.text,
  fontFamily: deskTheme.fonts.ui
};

const wrap = {
  position: "relative",
  zIndex: 1,
  maxWidth: 1600,
  margin: "0 auto",
  padding: "28px 22px 54px"
};

const soft = { color: deskTheme.colors.soft };

export function ProductShell({ eyebrow, title, subtitle, actions, stats, children }) {
  return (
    <main style={shell}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255, 255, 255, 0.01) 0%, transparent 100%)", pointerEvents: "none" }} />
      <div style={wrap}>
        <ProductWorkspaceChrome title={title} actions={actions}>
          <section style={{ ...createSurface({ level: "hero", accent: "info", padding: 26, radius: "xxl" }) }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.95fr)", gap: 20, alignItems: "start" }}>
              <div style={{ maxWidth: 980 }}>
                <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: deskTheme.colors.sky, fontWeight: 900 }}>{eyebrow}</div>
                <h1 style={{ fontSize: "clamp(38px, 5vw, 54px)", lineHeight: 1.02, letterSpacing: -1.8, margin: "14px 0 0", fontWeight: 950 }}>{title}</h1>
                <p style={{ margin: "16px 0 0", lineHeight: 1.75, color: "#d6e2f2", fontSize: 15, maxWidth: 920 }}>{subtitle}</p>
              </div>

              <div style={{ ...createSurface({ level: "elevated", accent: "slate", padding: 18, radius: "xl" }), display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: deskTheme.colors.soft }}>Workspace Class</div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>Trading Pro Max</div>
                  <div style={{ ...soft, marginTop: 8, lineHeight: 1.6 }}>Institutional-grade local product surface with shared state, persistent session memory, and connected operator flows.</div>
                </div>

                {actions?.length ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {actions.map((action) => (
                      <Link key={action.href} href={action.href} style={{ ...createButton({ primary: !!action.primary }), flex: "1 1 180px", textAlign: "center" }}>
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {stats?.length ? (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {stats.map((stat) => (
                <div key={stat.label} style={{ ...createSurface({ level: "elevated", accent: stat.tone || "slate", padding: 18, radius: "xl" }) }}>
                  <div style={{ ...soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.6 }}>{stat.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10, letterSpacing: -0.8 }}>{stat.value}</div>
                  {stat.hint ? <div style={{ ...soft, fontSize: 12, marginTop: 10, lineHeight: 1.55 }}>{stat.hint}</div> : null}
                </div>
              ))}
            </section>
          ) : null}

          {children}
        </ProductWorkspaceChrome>
      </div>
    </main>
  );
}

export function ProductPanel({ title, subtitle, children, aside }) {
  return (
    <section style={{ ...createSurface({ level: "elevated", accent: "slate", padding: 22, radius: "xl" }) }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 2, color: deskTheme.colors.soft, textTransform: "uppercase", fontWeight: 800 }}>Workspace Block</div>
          <div style={{ fontSize: 25, fontWeight: 900, marginTop: 8, letterSpacing: -0.4 }}>{title}</div>
          {subtitle ? <div style={{ ...soft, marginTop: 8, lineHeight: 1.6 }}>{subtitle}</div> : null}
        </div>
        {aside ? <div style={{ ...soft, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ProductGrid({ columns = 2, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 1 ? 320 : 300}px, 1fr))`, gap: 16 }}>
      {children}
    </div>
  );
}

export function ProductCard({ title, value, description, tone = "neutral" }) {
  return (
    <div style={{ ...createSurface({ level: "elevated", accent: tone, padding: 18, radius: "lg" }) }}>
      <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", color: deskTheme.colors.soft, fontWeight: 800 }}>{title}</div>
      {value ? <div style={{ fontSize: 30, fontWeight: 900, marginTop: 12, letterSpacing: -0.8, color: toneMap[tone] || toneMap.neutral }}>{value}</div> : null}
      {description ? <div style={{ marginTop: 10, color: "#d6e2f2", lineHeight: 1.6 }}>{description}</div> : null}
    </div>
  );
}

export function ProductList({ items, renderItem }) {
  return <div style={{ display: "grid", gap: 12 }}>{items.map(renderItem)}</div>;
}

export function ProductPill({ label, tone = "neutral" }) {
  return <span style={createPillStyle(tone)}>{label}</span>;
}

export function ProductMetricRow({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      {items.map((item) => (
        <div key={item.label} style={{ ...createSurface({ level: "elevated", accent: item.tone || "slate", padding: 18, radius: "lg" }) }}>
          <div style={{ ...soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>{item.label}</div>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 10, letterSpacing: -0.6, color: toneMap[item.tone] || toneMap.neutral }}>{item.value}</div>
          {item.hint ? <div style={{ color: "#d6e2f2", marginTop: 10, lineHeight: 1.55 }}>{item.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}

function createButton({ primary = false }) {
  return {
    textDecoration: "none",
    ...createPillButton(primary)
  };
}

function createPillButton(primary) {
  return {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: deskTheme.radii.md,
    border: primary ? "1px solid rgba(34, 197, 94, 0.26)" : `1px solid ${deskTheme.colors.line}`,
    background: primary
      ? "linear-gradient(180deg, rgba(34, 197, 94, 0.96) 0%, rgba(21, 128, 61, 0.96) 100%)"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(8, 15, 29, 0.96) 100%)",
    color: primary ? "#04130a" : deskTheme.colors.text,
    fontWeight: 800,
    boxShadow: primary ? "0 18px 48px rgba(34, 197, 94, 0.22)" : deskTheme.shadows.inner
  };
}
