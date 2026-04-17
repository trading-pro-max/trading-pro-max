import Link from "next/link";
import { DeskSummaryPanel } from "./DeskSummaryPanel";
import { OperatorDeskAcceptancePanel } from "./OperatorDeskAcceptancePanel";
import {
  ProductList,
  ProductMetricRow,
  ProductPanel,
  ProductPill,
  ProductShell,
  ProductGrid
} from "./ProductShell";
import { coreModules } from "./product-modules";

export function ProductModulePage({
  module,
  title,
  subtitle,
  actions,
  stats,
  sections,
  metrics = [],
  statusLabel = "Canonical Module",
  showDeskSummary = true,
  deskSummaryCompact = false
}) {
  const adjacentModules = coreModules.filter((item) => item.href !== module.href);

  return (
    <ProductShell eyebrow="Trading Pro Max" title={title} subtitle={subtitle} actions={actions} stats={stats}>
      {showDeskSummary ? <DeskSummaryPanel moduleHref={module?.href || ""} compact={deskSummaryCompact} /> : null}
      <OperatorDeskAcceptancePanel surfaceHref={module?.href || "/"} compact />

      <ProductGrid>
        <ProductPanel title="Module Role" subtitle="How this surface fits the desktop trading workflow" aside={statusLabel}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ background: "#020617", borderRadius: 18, padding: 18, border: "1px solid rgba(148, 163, 184, 0.10)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{module.label}</div>
                  <div style={{ color: "#cbd5e1", marginTop: 8, lineHeight: 1.6 }}>{module.summary}</div>
                </div>
                <ProductPill label={module.label} tone={module.tone} />
              </div>
              <div style={{ color: "#94a3b8", marginTop: 12, lineHeight: 1.6 }}>{module.handoff}</div>
            </div>

            {metrics.length ? <ProductMetricRow items={metrics} /> : null}
          </div>
        </ProductPanel>

        <ProductPanel title="Cross-module Handshake" subtitle="Fast navigation through the real product entry points">
          <ProductList
            items={adjacentModules}
            renderItem={(item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                  background: "#020617",
                  borderRadius: 16,
                  padding: 16,
                  color: "inherit",
                  textDecoration: "none",
                  border: "1px solid rgba(148, 163, 184, 0.10)"
                }}
              >
                <div>
                  <strong>{item.label}</strong>
                  <div style={{ color: "#94a3b8", marginTop: 6, lineHeight: 1.5 }}>{item.summary}</div>
                </div>
                <ProductPill label="Open" tone={item.tone} />
              </Link>
            )}
          />
        </ProductPanel>
      </ProductGrid>

      {sections.map((section) => (
        <ProductPanel key={section.title} title={section.title} subtitle={section.subtitle} aside={section.aside}>
          {section.content}
        </ProductPanel>
      ))}
    </ProductShell>
  );
}
