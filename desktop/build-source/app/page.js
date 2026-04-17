import {
  ProductCard,
  ProductGrid,
  ProductList,
  ProductMetricRow,
  ProductPanel,
  ProductPill,
  ProductShell
} from "./_components/ProductShell";
import { getMarketIntelligenceData, getProductRuntime, getProductWorkspaceData } from "./_components/product-data";
import { architectureTracks, coreModules, productEntryPoints } from "./_components/product-modules";

export const metadata = {
  title: "Operator Workspace",
  description: "Desktop-first product workspace for Trading Pro Max."
};

export default function Page() {
  const runtime = getProductRuntime();
  const workspace = getProductWorkspaceData();
  const market = getMarketIntelligenceData();

  const stats = [
    { label: "Product Mode", value: runtime.mode, hint: "Canonical local runtime" },
    { label: "Core Modules", value: String(runtime.modules?.length || 0), hint: "Product-first navigation" },
    { label: "Execution Routes", value: String(runtime.metrics?.executionRoutes ?? 0), hint: "Decision-ready routes" },
    { label: "Desktop Readiness", value: `${runtime.metrics?.desktopReadiness ?? 0}%`, hint: runtime.releaseGate }
  ];

  return (
    <ProductShell
      eyebrow="Trading Pro Max"
      title="Operator Workspace"
      subtitle="This root route now acts as the product command surface, not a landing page. It centers the six core modules, active route quality, operator feed, and the desktop-first execution posture."
      actions={[
        { href: "/market-intelligence", label: "Open Market Intelligence" },
        { href: "/strategy-lab", label: "Open Strategy Lab" },
        { href: "/execution-center", label: "Open Execution Center", primary: true }
      ]}
      stats={stats}
    >
      <ProductGrid>
        <ProductPanel title="Core Modules" subtitle="Canonical entry points for the real product" aside={`${runtime.overallProgress}% complete`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {coreModules.map((route) => (
              <a key={route.href} href={route.href} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#020617", borderRadius: 18, padding: 18, border: "1px solid rgba(148, 163, 184, 0.10)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{route.label}</div>
                      <div style={{ color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>{route.summary}</div>
                    </div>
                    <ProductPill label="Open" tone={route.tone} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </ProductPanel>

        <ProductPanel title="Product Architecture" subtitle="Fastest product-first path from the current repo">
          <div style={{ display: "grid", gap: 12 }}>
            {architectureTracks.map((track) => (
              <ProductCard key={track.title} title={track.title} description={track.description} />
            ))}
          </div>
        </ProductPanel>
      </ProductGrid>

      <ProductPanel title="Real Product Entry Points" subtitle="Where to enter the local desktop product cleanly">
        <ProductGrid>
          <div style={{ display: "grid", gap: 12 }}>
            <ProductCard title="Primary UI Root" description={productEntryPoints.workspace} />
            {productEntryPoints.modules.map((item) => (
              <ProductCard key={item.href} title={item.label} description={item.href} />
            ))}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {productEntryPoints.runtimeApis.map((item) => (
              <ProductCard key={item.href} title={item.label} description={item.href} />
            ))}
          </div>
        </ProductGrid>
      </ProductPanel>

      <ProductGrid>
        <ProductPanel title="Market Intelligence Snapshot" subtitle="Immediate read on current focus instruments">
          <ProductList
            items={market.watchlist}
            renderItem={(item) => (
              <div key={item.symbol} style={{ background: "#020617", borderRadius: 16, padding: 16, border: "1px solid rgba(148, 163, 184, 0.10)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
                  <strong>{item.symbol}</strong>
                  <span style={{ color: "#94a3b8" }}>{item.bias}</span>
                  <span style={{ color: "#22c55e", fontWeight: 800 }}>{item.confidence}</span>
                </div>
                <div style={{ color: "#cbd5e1", marginTop: 8, lineHeight: 1.6 }}>{item.note}</div>
              </div>
            )}
          />
        </ProductPanel>

        <ProductPanel title="Operator Feed" subtitle="Local product events">
          <ProductList
            items={workspace.feed || []}
            renderItem={(item) => (
              <div key={item.time + item.text} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 12, background: "#020617", borderRadius: 16, padding: 16 }}>
                <strong style={{ color: "#38bdf8" }}>{item.time}</strong>
                <span style={{ color: "#cbd5e1", lineHeight: 1.6 }}>{item.text}</span>
              </div>
            )}
          />
        </ProductPanel>
      </ProductGrid>

      <ProductPanel title="Priority Routes" subtitle="Strategy-to-execution handoff at a glance">
        <div style={{ display: "grid", gap: 10 }}>
          {(workspace.routes || []).map((route) => (
            <div key={route.name} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 100px 120px", gap: 12, background: "#020617", borderRadius: 16, padding: 16 }}>
              <strong>{route.name}</strong>
              <span style={{ color: "#94a3b8" }}>{route.asset}</span>
              <span style={{ color: "#22c55e", fontWeight: 800 }}>{route.confidence}</span>
              <span style={{ color: "#7dd3fc", fontWeight: 800 }}>{route.state}</span>
            </div>
          ))}
        </div>
      </ProductPanel>

      <ProductPanel title="Module Coverage" subtitle="Fast health read across the six core modules">
        <ProductMetricRow
          items={coreModules.map((item) => ({
            label: item.label,
            value: "Ready",
            hint: item.handoff,
            tone: item.tone
          }))}
        />
      </ProductPanel>
    </ProductShell>
  );
}
