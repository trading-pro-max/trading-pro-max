"use client";

import { useEffect } from "react";
import { ProductSymbolSearch } from "./ProductSymbolSearch";
import { ProductInfinityBrief } from "./ProductInfinityBrief";
import { ProductWatchlistManager } from "./ProductWatchlistManager";
import { ProductPill } from "./ProductShell";
import { getLiveChartTone } from "./product-live-data";
import { projectChartPrice } from "./product-live-chart";
import { createSurface, deskTheme, toneMap } from "./product-theme";
import { useProductTradingStore } from "./product-trading-store";

function panelStyle({ padding = 16, background, border, radius = 20 } = {}) {
  return {
    ...createSurface({ level: "elevated", accent: "slate", padding, radius: radius >= 24 ? "xl" : "lg" }),
    background: background || "linear-gradient(180deg, rgba(10, 19, 36, 0.97) 0%, rgba(4, 9, 18, 0.99) 100%)",
    border: border || `1px solid ${deskTheme.colors.line}`,
    borderRadius: radius,
    padding
  };
}

function toneColor(tone) {
  return toneMap[tone] || deskTheme.colors.text;
}

function overlayFill(tone, alpha = 0.16) {
  if (tone === "danger") return `rgba(248, 113, 113, ${alpha})`;
  if (tone === "warning") return `rgba(245, 158, 11, ${alpha})`;
  if (tone === "success") return `rgba(34, 197, 94, ${alpha})`;
  return `rgba(56, 189, 248, ${alpha})`;
}

function statusTone(status) {
  if (
    status === "Protected" ||
    status === "Blocked" ||
    status === "Canceled" ||
    status === "Closed" ||
    status === "Rejected"
  ) {
    return "danger";
  }
  if (status === "Watch" || status === "Ready" || status === "Working" || status === "Partially Filled") return "warning";
  if (status === "Staged" || status === "Amend Ack") return "info";
  if (
    status === "Filled" ||
    status === "Qualified" ||
    status === "Momentum" ||
    status === "In plan" ||
    status === "Scaling" ||
    status === "Running" ||
    status === "Logged"
  ) {
    return "success";
  }
  return "info";
}

function buildChartPath(points, width, height) {
  if (!points.length) return "";
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: deskTheme.colors.soft, fontWeight: 800 }}>Terminal Block</div>
        <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>{title}</div>
        {subtitle ? <div style={{ color: deskTheme.colors.soft, marginTop: 7, lineHeight: 1.6 }}>{subtitle}</div> : null}
      </div>
      {right}
    </div>
  );
}

function TableHeaderCell({ label, align = "left" }) {
  return (
    <th style={{ padding: "0 14px 12px", color: deskTheme.colors.soft, textAlign: align, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontFamily: deskTheme.fonts.data }}>
      {label}
    </th>
  );
}

function TableCell({ children, tone, align = "left", weight = 500 }) {
  return (
    <td style={{ padding: "13px 14px", borderTop: `1px solid ${deskTheme.colors.lineSoft}`, color: tone || "#d7e3f4", textAlign: align, fontWeight: weight, verticalAlign: "top" }}>
      {children}
    </td>
  );
}

function RiskStrip({ primaryRoute, riskSummary, buyingPower, recentActions, liveDataStatus, executionStatus }) {
  const items = [
    { label: "Session Drawdown", value: riskSummary?.drawdown || "--", hint: "Live local session drawdown", tone: "success" },
    { label: "Open Risk", value: riskSummary?.openRisk || "--", hint: "Dynamic risk across open positions", tone: "warning" },
    {
      label: "Live Feed",
      value: liveDataStatus?.state || "--",
      hint: `${liveDataStatus?.label || "No feed"} | ${liveDataStatus?.latency || "Waiting"}`,
      tone: liveDataStatus?.tone || "info"
    },
    {
      label: "Execution",
      value: executionStatus?.mode || "--",
      hint: `${executionStatus?.pendingOrders ?? 0} pending | ${executionStatus?.openPositions ?? 0} open`,
      tone: executionStatus?.tone || "info"
    },
    { label: "Buying Power", value: buyingPower || "--", hint: "Available for qualified routes", tone: "neutral" }
  ];
  const lead = items[0];
  const rest = items.slice(1);

  return (
    <section
      style={{
        ...panelStyle({
          padding: 14,
          background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 28%), linear-gradient(180deg, rgba(8, 15, 29, 0.99) 0%, rgba(2, 6, 23, 1) 100%)",
          border: `1px solid ${deskTheme.colors.lineStrong}`
        }),
        display: "flex",
        flexWrap: "wrap",
        gap: 12
      }}
    >
      <div style={{ flex: "1.15 1 280px", background: "linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(15, 23, 42, 0.94) 76%)", borderRadius: 18, padding: 18, border: `1px solid ${deskTheme.colors.lineStrong}`, boxShadow: deskTheme.shadows.glow }}>
        <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.6, fontFamily: deskTheme.fonts.data }}>{lead.label}</div>
        <div style={{ marginTop: 12, fontSize: 42, fontWeight: 950, letterSpacing: -1.2, color: toneColor(lead.tone), fontFamily: deskTheme.fonts.data }}>{lead.value}</div>
        <div style={{ color: "#d7e3f4", marginTop: 10, lineHeight: 1.55 }}>{lead.hint}</div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ProductPill label={primaryRoute.asset} tone="info" />
          <ProductPill label={primaryRoute.state} tone={statusTone(primaryRoute.state)} />
        </div>
      </div>

      <div style={{ flex: "1.85 1 520px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {rest.map((item) => (
          <div key={item.label} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(8, 15, 29, 0.94) 100%)", borderRadius: 16, padding: 15, border: `1px solid ${deskTheme.colors.line}` }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontFamily: deskTheme.fonts.data }}>{item.label}</div>
            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 900, letterSpacing: -0.5, color: toneColor(item.tone), fontFamily: deskTheme.fonts.data }}>{item.value}</div>
            <div style={{ color: "#d7e3f4", marginTop: 7, lineHeight: 1.45 }}>{item.hint}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: "0.8 1 240px", background: "linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(8, 15, 29, 0.96) 100%)", borderRadius: 16, padding: 15, border: `1px solid ${deskTheme.colors.line}` }}>
        <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontFamily: deskTheme.fonts.data }}>Desk Status</div>
        <div style={{ marginTop: 10, color: "#f8fafc", fontWeight: 800 }}>{recentActions[0]?.title || "Session quiet"}</div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.5 }}>{recentActions[0]?.detail || "Execution, notes, and route actions will stream here."}</div>
        <div style={{ marginTop: 12, display: "grid", gap: 8, color: deskTheme.colors.sky, fontWeight: 700, fontSize: 12 }}>
          <span>{liveDataStatus?.heartbeat || "--:--:--"} heartbeat</span>
          <span>{executionStatus?.lastEvent || "Execution idle"}</span>
          <span>Bracket-ready desk flow active</span>
        </div>
      </div>
    </section>
  );
}

function WatchList({ items, activeSymbol, onSelect }) {
  return (
    <div style={{ ...panelStyle({ padding: 16, background: "rgba(8, 15, 29, 0.96)" }), height: "100%" }}>
      <SectionHeader title="Market Watch" subtitle="Execution symbols and route state" right={<ProductPill label={`${items.length} symbols`} tone="info" />} />
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {items.map((item) => {
          const isActive = item.symbol === activeSymbol;
          const changeValue = String(item.change || "--");
          const changeTone = changeValue.startsWith("-") ? "#f87171" : "#22c55e";
          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelect(item.symbol)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                background: isActive ? "linear-gradient(135deg, rgba(56, 189, 248, 0.20) 0%, rgba(15, 23, 42, 0.92) 82%)" : "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.94) 100%)",
                borderRadius: 16,
                padding: 14,
                border: isActive ? `1px solid ${deskTheme.colors.lineStrong}` : `1px solid ${deskTheme.colors.line}`,
                color: "inherit",
                boxShadow: isActive ? deskTheme.shadows.glow : deskTheme.shadows.inner
              }}
            >
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.3, fontFamily: deskTheme.fonts.data }}>Route Monitor</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{item.symbol}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 4, fontSize: 13 }}>{item.strategy}</div>
                </div>
                <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                  <ProductPill label={item.status} tone={statusTone(item.status)} />
                  <ProductPill label={item.impulse || "Balanced"} tone={item.impulse === "Expansion" ? "success" : item.impulse === "Compression" ? "warning" : "info"} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginTop: 12, alignItems: "end" }}>
                <span style={{ color: "#f8fafc", fontWeight: 900, fontFamily: deskTheme.fonts.data, fontSize: 18 }}>{String(item.last)}</span>
                <span style={{ color: changeTone, fontWeight: 900, fontFamily: deskTheme.fonts.data }}>{changeValue}</span>
                <span style={{ color: deskTheme.colors.sky, fontWeight: 900, fontFamily: deskTheme.fonts.data }}>{item.signalStrength || item.confidence}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
                <div>
                  <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Bid</div>
                  <div style={{ color: "#f8fafc", fontFamily: deskTheme.fonts.data, marginTop: 4, fontWeight: 800 }}>{item.bid || "--"}</div>
                </div>
                <div>
                  <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Ask</div>
                  <div style={{ color: "#f8fafc", fontFamily: deskTheme.fonts.data, marginTop: 4, fontWeight: 800 }}>{item.ask || "--"}</div>
                </div>
                <div>
                  <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Spread</div>
                  <div style={{ color: deskTheme.colors.sky, fontFamily: deskTheme.fonts.data, marginTop: 4, fontWeight: 800 }}>{item.spread || "--"}</div>
                </div>
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>{item.note || item.bias}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChartPanel({
  chart,
  primaryRoute,
  activeWatch,
  liveDataStatus,
  executionStatus,
  tradeTape = [],
  overlayModel,
  chartTimeframe,
  chartTimeframes,
  onTimeframeChange
}) {
  const chartWidth = 1480;
  const chartHeight = 600;
  const chartPath = buildChartPath(chart.points, chartWidth, chartHeight);
  const changeValue = String(activeWatch.change || "--");
  const changeTone = changeValue.startsWith("-") ? "danger" : "success";
  const chartTone = getLiveChartTone(chart.readinessState, chart.freshness);

  const headerStats = [
    { label: "Last", value: String(activeWatch.last), tone: "neutral" },
    { label: "Change", value: changeValue, tone: changeTone },
    { label: "Bid / Ask", value: `${activeWatch.bid || "--"} / ${activeWatch.ask || "--"}`, tone: "info" },
    { label: "Route", value: primaryRoute.confidence, tone: "info" },
    { label: "State", value: primaryRoute.state, tone: statusTone(primaryRoute.state) },
    { label: "Provider Symbol", value: chart.providerSymbol || liveDataStatus?.providerSymbol || "--", tone: "info" }
  ];

  const footerStats = [
    { label: "Bias", value: activeWatch.strategy, tone: "success" },
    { label: "Structure", value: primaryRoute.state === "Protected" ? "Defense First" : "Trend Supportive", tone: "neutral" },
    { label: "Execution", value: executionStatus?.label || (primaryRoute.state === "Watch" ? "Wait For Confirmation" : "Bracket Ready"), tone: "info" },
    { label: "Feed", value: liveDataStatus?.label || "No feed", tone: liveDataStatus?.tone || "info" },
    { label: "Volatility", value: primaryRoute.state === "Protected" ? "Restricted" : "Moderate Expansion", tone: "warning" }
  ];
  const routeZones = overlayModel?.routeZones || [];
  const protectionOverlays = overlayModel?.protectionOverlays || [];
  const executionMarkers = overlayModel?.executionMarkers || [];

  return (
    <div style={{ ...panelStyle({ padding: 18, background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 30%), linear-gradient(180deg, rgba(8, 15, 29, 0.99) 0%, rgba(2, 6, 23, 1) 100%)", border: `1px solid ${deskTheme.colors.lineStrong}` }), minHeight: 900 }}>
      <SectionHeader
        title={`${chart.symbol} Chart`}
        subtitle={`${primaryRoute.name} | ${primaryRoute.state} | ${chart.timeframe} execution structure`}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProductPill label={liveDataStatus?.label || "Feed offline"} tone={liveDataStatus?.tone || "neutral"} />
            <ProductPill label={executionStatus?.label || "No execution"} tone={executionStatus?.tone || "neutral"} />
            {chartTimeframes.map((timeframe) => (
              <button
                key={timeframe.key}
                type="button"
                onClick={() => onTimeframeChange(timeframe.key)}
                style={{
                  cursor: "pointer",
                  background: timeframe.key === chartTimeframe ? "rgba(56, 189, 248, 0.16)" : "rgba(15, 23, 42, 0.74)",
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: timeframe.key === chartTimeframe ? `1px solid ${deskTheme.colors.lineStrong}` : `1px solid ${deskTheme.colors.lineSoft}`,
                  color: timeframe.key === chartTimeframe ? deskTheme.colors.sky : deskTheme.colors.text,
                  fontWeight: 800
                }}
              >
                {timeframe.label}
              </button>
            ))}
            <ProductPill label={chart.readinessState || liveDataStatus?.chartReadiness || "Pending"} tone={chartTone} />
            {chart.levels.map((level) => (
              <ProductPill key={level.label} label={`${level.label} ${level.value}`} tone={level.tone} />
            ))}
          </div>
        }
      />

      <div style={{ marginTop: 18, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.90) 0%, rgba(4, 8, 18, 0.99) 100%)", borderRadius: 22, padding: 24, border: `1px solid ${deskTheme.colors.lineStrong}`, boxShadow: deskTheme.shadows.glow }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
          {headerStats.map((item) => (
            <div key={item.label} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.74) 0%, rgba(8, 15, 29, 0.90) 100%)", borderRadius: 14, padding: 13, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>{item.label}</div>
              <div style={{ color: toneColor(item.tone), fontWeight: 900, marginTop: 8, fontSize: 18, fontFamily: deskTheme.fonts.data }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: `1px solid ${deskTheme.colors.lineSoft}`, background: "linear-gradient(180deg, rgba(3, 8, 19, 0.96) 0%, rgba(2, 6, 23, 1) 100%)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 45%)", pointerEvents: "none" }} />
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: 700, display: "block" }} preserveAspectRatio="none">
            {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((line) => (
              <line key={line} x1="0" x2={chartWidth} y1={chartHeight * line} y2={chartHeight * line} stroke="rgba(148, 163, 184, 0.11)" strokeWidth="1" />
            ))}
            {[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((line) => (
              <line key={`v-${line}`} y1="0" y2={chartHeight} x1={chartWidth * line} x2={chartWidth * line} stroke="rgba(148, 163, 184, 0.07)" strokeWidth="1" />
            ))}
            {routeZones.map((zone) => {
              const yUpper = projectChartPrice(zone.upper, overlayModel, chartHeight);
              const yLower = projectChartPrice(zone.lower, overlayModel, chartHeight);
              return (
                <g key={zone.id}>
                  <rect
                    x="0"
                    y={Math.min(yUpper, yLower)}
                    width={chartWidth}
                    height={Math.max(Math.abs(yLower - yUpper), 6)}
                    fill={overlayFill(zone.tone, 0.12)}
                  />
                  <line
                    x1="0"
                    x2={chartWidth}
                    y1={yUpper}
                    y2={yUpper}
                    stroke={toneColor(zone.tone)}
                    strokeWidth="1.5"
                    strokeDasharray="10 8"
                  />
                </g>
              );
            })}
            {protectionOverlays.map((zone) => {
              const yUpper = projectChartPrice(zone.upper, overlayModel, chartHeight);
              const yLower = projectChartPrice(zone.lower, overlayModel, chartHeight);
              return (
                <g key={zone.id}>
                  <rect
                    x="0"
                    y={Math.min(yUpper, yLower)}
                    width={chartWidth}
                    height={Math.max(Math.abs(yLower - yUpper), 5)}
                    fill={overlayFill(zone.tone, 0.1)}
                  />
                  <line
                    x1="0"
                    x2={chartWidth}
                    y1={projectChartPrice((zone.upper + zone.lower) / 2, overlayModel, chartHeight)}
                    y2={projectChartPrice((zone.upper + zone.lower) / 2, overlayModel, chartHeight)}
                    stroke={toneColor(zone.tone)}
                    strokeWidth="2"
                  />
                </g>
              );
            })}
            <path d={chartPath} fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
            {executionMarkers.map((marker, index) => {
              const x = chartWidth - 90 - index * 120;
              const y = projectChartPrice(marker.price, overlayModel, chartHeight);
              return (
                <g key={marker.id}>
                  <line x1={x} x2={x} y1={y - 22} y2={y + 22} stroke={toneColor(marker.tone)} strokeWidth="1.5" strokeDasharray="4 4" />
                  <circle cx={x} cy={y} r="7" fill={toneColor(marker.tone)} stroke="rgba(255,255,255,0.4)" />
                </g>
              );
            })}
          </svg>
          <div style={{ position: "absolute", top: 18, left: 18, display: "grid", gap: 8, width: 190 }}>
            <div style={{ background: "rgba(8, 15, 29, 0.88)", borderRadius: 12, padding: 11, border: `1px solid ${deskTheme.colors.lineStrong}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Last / Change</div>
              <div style={{ color: "#f8fafc", fontWeight: 900, marginTop: 6, fontFamily: deskTheme.fonts.data }}>{String(activeWatch.last)}</div>
              <div style={{ color: toneMap[changeTone], marginTop: 4, fontWeight: 800, fontFamily: deskTheme.fonts.data }}>{changeValue}</div>
            </div>
            <div style={{ background: "rgba(8, 15, 29, 0.88)", borderRadius: 12, padding: 11, border: `1px solid ${deskTheme.colors.lineStrong}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Confidence</div>
              <div style={{ color: deskTheme.colors.sky, fontWeight: 900, marginTop: 6, fontFamily: deskTheme.fonts.data }}>{primaryRoute.confidence}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>Execution lane confidence</div>
            </div>
          </div>
          <div style={{ position: "absolute", top: 18, right: 18, display: "grid", gap: 8, width: 190 }}>
            <div style={{ background: "rgba(8, 15, 29, 0.88)", borderRadius: 12, padding: 11, border: `1px solid ${deskTheme.colors.lineStrong}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Chart Runtime</div>
              <div style={{ color: "#f8fafc", fontWeight: 800, marginTop: 6 }}>{chart.lastCandleUpdate ? new Date(chart.lastCandleUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>{chart.freshness || liveDataStatus?.chartFreshness || "Waiting"} | {chart.sourceLabel || liveDataStatus?.label || "No connector"}</div>
            </div>
            <div style={{ background: "rgba(8, 15, 29, 0.88)", borderRadius: 12, padding: 11, border: `1px solid ${deskTheme.colors.lineStrong}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Provider Mapping</div>
              <div style={{ color: deskTheme.colors.sky, fontWeight: 800, marginTop: 6 }}>{chart.providerSymbol || liveDataStatus?.providerSymbol || "--"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>{chart.mappingState || liveDataStatus?.mappingState || "Native"} | {chart.readinessState || "Pending"}</div>
            </div>
          </div>
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <div style={{ background: "rgba(8, 15, 29, 0.84)", borderRadius: 12, padding: 10, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Session Range</div>
              <div style={{ color: "#f8fafc", marginTop: 5, fontWeight: 800 }}>{chart.levels[1]?.value || "--"} / {chart.levels[2]?.value || "--"}</div>
            </div>
            <div style={{ background: "rgba(8, 15, 29, 0.84)", borderRadius: 12, padding: 10, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Chart State</div>
              <div style={{ color: toneColor(chartTone), marginTop: 5, fontWeight: 800 }}>{chart.readinessState || "Pending"}</div>
            </div>
            <div style={{ background: "rgba(8, 15, 29, 0.84)", borderRadius: 12, padding: 10, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Provider / Candle</div>
              <div style={{ color: "#f8fafc", marginTop: 5, fontWeight: 800 }}>{chart.providerSymbol || "--"} / {chart.lastCandleUpdate ? new Date(chart.lastCandleUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 16 }}>
          {(overlayModel?.summaries || []).map((summary) => (
            <div key={summary.label} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(8, 15, 29, 0.90) 100%)", borderRadius: 14, padding: 13, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>{summary.label}</div>
              <div style={{ color: toneColor(summary.tone), fontWeight: 900, marginTop: 8, fontFamily: deskTheme.fonts.data }}>{summary.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 16 }}>
          {tradeTape.map((trade) => (
            <div key={trade.id} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(8, 15, 29, 0.90) 100%)", borderRadius: 14, padding: 12, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>{trade.time}</div>
                <ProductPill label={trade.side} tone={trade.side === "Buy" ? "success" : "danger"} />
              </div>
              <div style={{ color: "#f8fafc", fontWeight: 900, marginTop: 10, fontFamily: deskTheme.fonts.data }}>{trade.price}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6, fontSize: 12 }}>{trade.symbol} | {trade.size} lot</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 16 }}>
          {footerStats.map((item) => (
            <div key={item.label} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(8, 15, 29, 0.90) 100%)", borderRadius: 14, padding: 13, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>{item.label}</div>
              <div style={{ color: toneColor(item.tone), fontWeight: 900, marginTop: 8 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {chart.degradedReason ? (
          <div style={{ marginTop: 14, background: "linear-gradient(180deg, rgba(120, 53, 15, 0.22) 0%, rgba(69, 26, 3, 0.18) 100%)", borderRadius: 14, padding: 12, border: "1px solid rgba(245, 158, 11, 0.25)", color: "#fde68a", lineHeight: 1.55 }}>
            Chart degradation: {chart.degradedReason}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TicketField({ label, value, onChange, editable = false }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontFamily: deskTheme.fonts.data }}>{label}</div>
      {editable ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            ...panelStyle({ padding: 12, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.96) 100%)", border: `1px solid ${deskTheme.colors.line}`, radius: 14 }),
            fontWeight: 800,
            color: "#f8fafc",
            outline: "none",
            fontFamily: deskTheme.fonts.data,
            letterSpacing: 0.2
          }}
        />
      ) : (
        <div style={{ ...panelStyle({ padding: 12, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.96) 100%)", border: `1px solid ${deskTheme.colors.line}`, radius: 14 }), fontWeight: 800, fontFamily: deskTheme.fonts.data, letterSpacing: 0.2 }}>{value}</div>
      )}
    </div>
  );
}

function OrderEntryPanel({ ticket, relatedOrders, executionStatus, onFieldChange, onSideChange, onPlaceOrder, onStageOrder, onAmendOrder }) {
  const presets = ["0.50", "1.00", "1.50", "2.00"];
  const latestLifecycle = relatedOrders[0];
  const amendableOrder = relatedOrders.find((order) => ["Staged", "Working"].includes(order.status));
  const lifecycleCounts = ["Staged", "Working", "Filled", "Canceled", "Closed"].map((status) => ({
    status,
    count: relatedOrders.filter((order) => order.status === status).length
  }));

  return (
    <div style={{ ...panelStyle({ padding: 18, background: "radial-gradient(circle at top right, rgba(34, 197, 94, 0.10), transparent 26%), linear-gradient(180deg, rgba(9, 16, 28, 0.99) 0%, rgba(2, 6, 23, 1) 100%)", border: `1px solid ${deskTheme.colors.lineStrong}` }) }}>
      <SectionHeader
        title="Order Entry"
        subtitle="Lead route execution ticket"
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProductPill label={ticket.type} tone="warning" />
            <ProductPill label={latestLifecycle?.status || "Ready"} tone={statusTone(latestLifecycle?.status || "Ready")} />
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <button
          type="button"
          onClick={() => onSideChange("Buy")}
          style={{ cursor: "pointer", border: ticket.side === "Buy" ? "1px solid rgba(34, 197, 94, 0.55)" : "1px solid rgba(34, 197, 94, 0.30)", background: "linear-gradient(180deg, rgba(34, 197, 94, 0.28) 0%, rgba(21, 128, 61, 0.10) 100%)", color: "#bbf7d0", padding: "14px 14px", borderRadius: 14, fontWeight: 900, boxShadow: ticket.side === "Buy" ? "0 16px 36px rgba(34, 197, 94, 0.18)" : deskTheme.shadows.inner }}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => onSideChange("Sell")}
          style={{ cursor: "pointer", border: ticket.side === "Sell" ? "1px solid rgba(248, 113, 113, 0.55)" : "1px solid rgba(248, 113, 113, 0.30)", background: "linear-gradient(180deg, rgba(248, 113, 113, 0.24) 0%, rgba(153, 27, 27, 0.10) 100%)", color: "#fecaca", padding: "14px 14px", borderRadius: 14, fontWeight: 900, boxShadow: ticket.side === "Sell" ? "0 16px 36px rgba(248, 113, 113, 0.18)" : deskTheme.shadows.inner }}
        >
          Sell
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}>
        <div style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 12, padding: 12, border: `1px solid ${deskTheme.colors.line}` }}>
          <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Route</div>
          <div style={{ color: "#f8fafc", fontWeight: 800, marginTop: 8 }}>{ticket.route}</div>
        </div>
        <div style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 12, padding: 12, border: `1px solid ${deskTheme.colors.line}` }}>
          <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Buying Power</div>
          <div style={{ color: "#f8fafc", fontWeight: 800, marginTop: 8, fontFamily: deskTheme.fonts.data }}>{ticket.buyingPower}</div>
        </div>
        <div style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 12, padding: 12, border: `1px solid ${deskTheme.colors.line}` }}>
          <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Ticket State</div>
          <div style={{ color: toneColor(statusTone(latestLifecycle?.status || "Ready")), fontWeight: 800, marginTop: 6 }}>{latestLifecycle?.status || "Ready"}</div>
        </div>
        <div style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 12, padding: 12, border: `1px solid ${deskTheme.colors.line}` }}>
          <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Execution Engine</div>
          <div style={{ color: toneColor(executionStatus?.tone || "info"), fontWeight: 800, marginTop: 6 }}>{executionStatus?.label || "No engine"}</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 5 }}>{executionStatus?.pendingOrders ?? 0} pending | {executionStatus?.partialFills ?? 0} partials | {executionStatus?.rejectedOrders ?? 0} rejects</div>
        </div>
      </div>

      <div style={{ marginTop: 14, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.3, fontFamily: deskTheme.fonts.data }}>Order Lifecycle</div>
            <div style={{ color: "#e2e8f0", marginTop: 6, fontWeight: 800 }}>
              {latestLifecycle ? `${latestLifecycle.symbol} ${latestLifecycle.side} is ${latestLifecycle.status.toLowerCase()} in the local terminal.` : "No active lifecycle yet for this symbol."}
            </div>
          </div>
          <ProductPill label={latestLifecycle?.time || "--"} tone="neutral" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 8, marginTop: 12 }}>
          {lifecycleCounts.map((item) => (
            <div key={item.status} style={{ background: "linear-gradient(180deg, rgba(8, 15, 29, 0.88) 0%, rgba(3, 8, 18, 0.98) 100%)", borderRadius: 12, padding: 10, border: `1px solid ${deskTheme.colors.lineSoft}` }}>
              <div style={{ color: deskTheme.colors.soft, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>{item.status}</div>
              <div style={{ color: toneColor(statusTone(item.status)), fontWeight: 900, marginTop: 8, fontFamily: deskTheme.fonts.data }}>{item.count}</div>
            </div>
          ))}
        </div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 12, lineHeight: 1.5 }}>
          {(latestLifecycle?.ackState ? `${latestLifecycle.ackState} | ` : "") + (executionStatus?.note || "Execution adapter state is unavailable.")}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <TicketField label="Symbol" value={ticket.symbol} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TicketField label="Order Size" value={ticket.size} editable onChange={(value) => onFieldChange("size", value)} />
          <TicketField label="Order Type" value={ticket.type} editable onChange={(value) => onFieldChange("type", value)} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onFieldChange("size", preset)}
              style={{
                cursor: "pointer",
                background: ticket.size === preset ? "rgba(56, 189, 248, 0.16)" : "rgba(15, 23, 42, 0.72)",
                borderRadius: 999,
                padding: "8px 12px",
                border: ticket.size === preset ? "1px solid rgba(56, 189, 248, 0.18)" : "1px solid rgba(148, 163, 184, 0.08)",
                color: "#e2e8f0",
                fontWeight: 800
              }}
            >
              {preset} lot
            </button>
          ))}
        </div>
        <TicketField label="Entry" value={ticket.entry} editable onChange={(value) => onFieldChange("entry", value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TicketField label="Stop Loss" value={ticket.stop} editable onChange={(value) => onFieldChange("stop", value)} />
          <TicketField label="Take Profit" value={ticket.target} editable onChange={(value) => onFieldChange("target", value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TicketField label="Risk" value={ticket.riskPct} editable onChange={(value) => onFieldChange("riskPct", value)} />
          <TicketField label="Notional" value={ticket.notional} editable onChange={(value) => onFieldChange("notional", value)} />
        </div>
      </div>

      <div style={{ marginTop: 16, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}` }}>
        <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.3, fontFamily: deskTheme.fonts.data }}>Operator Shortcuts</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10, color: "#cbd5e1", fontSize: 13 }}>
          <span>Enter sends the active working ticket</span>
          <span>Shift+B stages the bracket in local order flow</span>
          <span>Ctrl/Cmd+K opens the product launcher</span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={() => onPlaceOrder(ticket.side)} style={{ cursor: "pointer", border: 0, background: "linear-gradient(180deg, rgba(34, 197, 94, 0.98) 0%, rgba(21, 128, 61, 0.96) 100%)", color: "#04130a", padding: "15px 16px", borderRadius: 14, fontWeight: 900, boxShadow: "0 20px 46px rgba(34, 197, 94, 0.24)" }}>
          Send {ticket.side} Order
        </button>
        {amendableOrder ? (
          <button type="button" onClick={() => onAmendOrder(amendableOrder.id)} style={{ cursor: "pointer", border: `1px solid ${deskTheme.colors.lineStrong}`, background: "linear-gradient(180deg, rgba(14, 116, 144, 0.28) 0%, rgba(8, 15, 29, 0.96) 100%)", color: "#e0f2fe", padding: "14px 16px", borderRadius: 14, fontWeight: 800, boxShadow: deskTheme.shadows.inner }}>
            Amend {amendableOrder.status} Order
          </button>
        ) : null}
        <button type="button" onClick={() => onStageOrder(ticket.side)} style={{ cursor: "pointer", border: `1px solid ${deskTheme.colors.lineStrong}`, background: "linear-gradient(180deg, rgba(8, 47, 73, 0.30) 0%, rgba(8, 15, 29, 0.96) 100%)", color: "#f8fafc", padding: "14px 16px", borderRadius: 14, fontWeight: 800, boxShadow: deskTheme.shadows.inner }}>
          Stage As Bracket
        </button>
      </div>
    </div>
  );
}

function AiAssistantPanel({ aiPanel, recentActions, liveDataStatus, executionStatus }) {
  const cards = [
    { label: "Route Summary", value: aiPanel.routeSummary, tone: "info" },
    { label: "Risk Note", value: aiPanel.riskNote, tone: "warning" },
    { label: "Execution Suggestion", value: aiPanel.executionSuggestion, tone: "success" },
    { label: "Next Action", value: aiPanel.nextAction, tone: "info" },
    { label: "Warning State", value: aiPanel.warningState, tone: "danger" }
  ];

  return (
    <div style={{ ...panelStyle({ padding: 18, background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.10), transparent 28%), linear-gradient(180deg, rgba(9, 16, 28, 0.99) 0%, rgba(2, 6, 23, 1) 100%)", border: `1px solid ${deskTheme.colors.lineStrong}` }) }}>
      <SectionHeader title="AI Assistant" subtitle="Execution guidance and operator handoff" right={<ProductPill label="Live Guidance" tone="info" />} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
        <div style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}` }}>
          <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Feed Runtime</div>
          <div style={{ color: toneColor(liveDataStatus?.tone || "info"), fontWeight: 800, marginTop: 8 }}>{liveDataStatus?.label || "No feed"}</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{liveDataStatus?.connectorState || "Offline"} | {liveDataStatus?.latency || "Waiting"}</div>
        </div>
        <div style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}` }}>
          <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Execution Lane</div>
          <div style={{ color: toneColor(executionStatus?.tone || "info"), fontWeight: 800, marginTop: 8 }}>{executionStatus?.label || "No engine"}</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{executionStatus?.pendingOrders ?? 0} pending | {executionStatus?.lastEvent || "Idle"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}` }}>
            <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>{card.label}</div>
            <div style={{ color: toneColor(card.tone), fontWeight: 800, marginTop: 8, lineHeight: 1.55 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ color: deskTheme.colors.soft, marginTop: 16, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontFamily: deskTheme.fonts.data }}>Suggested prompts</div>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {aiPanel.prompts.map((prompt) => (
          <div key={prompt} style={{ background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}`, color: deskTheme.colors.sky, fontWeight: 800 }}>
            {prompt}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.92) 100%)", borderRadius: 14, padding: 14, border: `1px solid ${deskTheme.colors.line}` }}>
        <div style={{ color: deskTheme.colors.soft, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: deskTheme.fonts.data }}>Latest activity</div>
        <div style={{ color: "#e2e8f0", fontWeight: 700, marginTop: 8 }}>{recentActions[0]?.title || "No session activity yet"}</div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{executionStatus?.lastEventDetail || recentActions[0]?.detail || "Order flow, notes, and position updates will appear here."}</div>
      </div>
    </div>
  );
}

function PositionsTable({ positions, onClosePosition }) {
  return (
    <div style={{ ...panelStyle({ padding: 18, background: "rgba(8, 15, 29, 0.96)" }) }}>
      <SectionHeader title="Open Positions" subtitle="Live exposure across active routes" right={<ProductPill label={`${positions.length} open`} tone="success" />} />

      <div style={{ overflowX: "auto", marginTop: 16, borderRadius: 16, border: `1px solid ${deskTheme.colors.line}`, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.94) 100%)", boxShadow: deskTheme.shadows.inner }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <TableHeaderCell label="Symbol" />
              <TableHeaderCell label="Side" />
              <TableHeaderCell label="Size" />
              <TableHeaderCell label="Entry" />
              <TableHeaderCell label="Mark" />
              <TableHeaderCell label="PnL" />
              <TableHeaderCell label="Lifecycle" />
              <TableHeaderCell label="Risk" />
              <TableHeaderCell label="Status" />
              <TableHeaderCell label="Action" />
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => {
              const key = `${position.symbol}-${position.side}-${position.entry}`;
              return (
                <tr key={key} style={{ background: index % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "rgba(8, 15, 29, 0.22)" }}>
                  <TableCell weight={800}>
                    <div>{position.symbol}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{position.route || "Connected Route"}</div>
                  </TableCell>
                  <TableCell>{position.side}</TableCell>
                  <TableCell tone="#f8fafc" weight={800}><span style={{ fontFamily: deskTheme.fonts.data }}>{position.size}</span></TableCell>
                  <TableCell tone="#f8fafc" weight={800}><span style={{ fontFamily: deskTheme.fonts.data }}>{position.entry}</span></TableCell>
                  <TableCell tone="#f8fafc" weight={800}><span style={{ fontFamily: deskTheme.fonts.data }}>{position.mark}</span></TableCell>
                  <TableCell tone={position.pnl.startsWith("-") ? "#f87171" : "#22c55e"} weight={900}><span style={{ fontFamily: deskTheme.fonts.data }}>{position.pnl}</span></TableCell>
                  <TableCell tone={toneColor(statusTone(position.lifecycle))} weight={800}>{position.lifecycle}</TableCell>
                  <TableCell>{position.risk}</TableCell>
                  <TableCell tone={toneColor(statusTone(position.status))} weight={800}>{position.status}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => onClosePosition(key)} style={{ cursor: "pointer", border: "1px solid rgba(248, 113, 113, 0.24)", background: "linear-gradient(180deg, rgba(127, 29, 29, 0.24) 0%, rgba(68, 10, 10, 0.20) 100%)", color: "#fecaca", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                      Close
                    </button>
                  </TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTable({ history, executionEvents, activity, onPlaceOrder, onFillOrder, onPartialFill, onRejectOrder, onCancelOrder, onAmendOrder }) {
  const rows = [
    ...history.map((item) => ({
      kind: "order",
      id: item.id,
      symbol: item.symbol,
      side: item.side,
      type: `${item.type} | ${item.filledSize ? `${item.filledSize}/${item.size}` : item.size || "--"}`,
      status: item.status,
      time: item.time,
      source: item.ackState ? `${item.route || "Order Ticket"} | ${item.ackState}` : item.route || "Order Ticket"
    })),
    ...executionEvents.slice(0, 8).map((item) => ({
      kind: "event",
      id: item.orderId || item.id,
      symbol: `${item.symbol} ${item.event}`,
      side: "Exec",
      type: "Execution Event",
      status: item.status,
      time: item.time,
      source: item.detail || item.provider || "Connected execution"
    })),
    ...activity.slice(0, 8).map((item) => ({
      kind: "activity",
      id: item.id,
      symbol: item.title,
      side: "Flow",
      type: "Activity",
      status: item.status,
      time: "--",
      source: item.detail || "Connected activity"
    }))
  ];

  return (
    <div style={{ ...panelStyle({ padding: 18, background: "rgba(8, 15, 29, 0.96)" }) }}>
      <SectionHeader title="Order History / Recent Activity" subtitle="Filled, working, canceled, and queue events" right={<ProductPill label={`${rows.length} rows`} tone="neutral" />} />

      <div style={{ overflowX: "auto", marginTop: 16, borderRadius: 16, border: `1px solid ${deskTheme.colors.line}`, background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.94) 100%)", boxShadow: deskTheme.shadows.inner }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <TableHeaderCell label="Ref" />
              <TableHeaderCell label="Symbol / Owner" />
              <TableHeaderCell label="Side" />
              <TableHeaderCell label="Type" />
              <TableHeaderCell label="Status" />
              <TableHeaderCell label="Time" />
              <TableHeaderCell label="Source" />
              <TableHeaderCell label="Action" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id + row.source} style={{ background: index % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "rgba(8, 15, 29, 0.22)" }}>
                <TableCell weight={800}><span style={{ fontFamily: deskTheme.fonts.data }}>{row.id}</span></TableCell>
                <TableCell>{row.symbol}</TableCell>
                <TableCell>{row.side}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell tone={toneColor(statusTone(row.status))} weight={900}>{row.status}</TableCell>
                <TableCell><span style={{ fontFamily: deskTheme.fonts.data }}>{row.time}</span></TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>
                  {row.kind === "order" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {row.status === "Staged" ? (
                        <>
                          <button type="button" onClick={() => onAmendOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(14, 165, 233, 0.24)", background: "rgba(8, 47, 73, 0.20)", color: "#bae6fd", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Amend
                          </button>
                          <button type="button" onClick={() => onPlaceOrder(row.side, row.id)} style={{ cursor: "pointer", border: "1px solid rgba(56, 189, 248, 0.20)", background: "rgba(8, 47, 73, 0.24)", color: "#bae6fd", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Send
                          </button>
                          <button type="button" onClick={() => onCancelOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(245, 158, 11, 0.20)", background: "rgba(120, 53, 15, 0.18)", color: "#fde68a", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Cancel
                          </button>
                          <button type="button" onClick={() => onRejectOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(248, 113, 113, 0.24)", background: "rgba(127, 29, 29, 0.18)", color: "#fecaca", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Reject
                          </button>
                        </>
                      ) : null}
                      {["Working", "Partially Filled"].includes(row.status) ? (
                        <>
                          <button type="button" onClick={() => onAmendOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(14, 165, 233, 0.24)", background: "rgba(8, 47, 73, 0.20)", color: "#bae6fd", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Amend
                          </button>
                          <button type="button" onClick={() => onPartialFill(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(245, 158, 11, 0.24)", background: "rgba(120, 53, 15, 0.18)", color: "#fde68a", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Partial
                          </button>
                          <button type="button" onClick={() => onFillOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(34, 197, 94, 0.25)", background: "rgba(21, 128, 61, 0.20)", color: "#bbf7d0", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Fill
                          </button>
                          <button type="button" onClick={() => onRejectOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(248, 113, 113, 0.24)", background: "rgba(127, 29, 29, 0.18)", color: "#fecaca", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Reject
                          </button>
                          <button type="button" onClick={() => onCancelOrder(row.id)} style={{ cursor: "pointer", border: "1px solid rgba(245, 158, 11, 0.20)", background: "rgba(120, 53, 15, 0.18)", color: "#fde68a", borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>
                            Cancel
                          </button>
                        </>
                      ) : null}
                      {!["Staged", "Working", "Partially Filled"].includes(row.status) ? <span style={{ color: "#64748b" }}>-</span> : null}
                    </div>
                  ) : (
                    <span style={{ color: "#64748b" }}>-</span>
                  )}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExecutionTerminal({ data }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const selectSymbol = useProductTradingStore((state) => state.selectSymbol);
  const updateOrderTicketField = useProductTradingStore((state) => state.updateOrderTicketField);
  const setTicketSide = useProductTradingStore((state) => state.setTicketSide);
  const stageOrder = useProductTradingStore((state) => state.stageOrder);
  const placeOrder = useProductTradingStore((state) => state.placeOrder);
  const amendOrder = useProductTradingStore((state) => state.amendOrder);
  const fillOrder = useProductTradingStore((state) => state.fillOrder);
  const partialFillOrder = useProductTradingStore((state) => state.partialFillOrder);
  const rejectOrder = useProductTradingStore((state) => state.rejectOrder);
  const closePosition = useProductTradingStore((state) => state.closePosition);
  const cancelOrder = useProductTradingStore((state) => state.cancelOrder);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const primaryRoute = useProductTradingStore((state) => state.selectedRoute);
  const chart = useProductTradingStore((state) => state.chartData);
  const orderTicket = useProductTradingStore((state) => state.orderTicket);
  const aiPanel = useProductTradingStore((state) => state.aiGuidance);
  const activeWatch = useProductTradingStore((state) => state.activeWatch);
  const positions = useProductTradingStore((state) => state.openPositions);
  const history = useProductTradingStore((state) => state.recentOrders);
  const recentActions = useProductTradingStore((state) => state.recentActions);
  const riskSummary = useProductTradingStore((state) => state.riskSummary);
  const watchlist = useProductTradingStore((state) => state.watchlist);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const chartTimeframe = useProductTradingStore((state) => state.chartTimeframe);
  const chartTimeframes = useProductTradingStore((state) => state.chartTimeframes);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const executionEvents = useProductTradingStore((state) => state.executionEvents);
  const tradeTape = useProductTradingStore((state) => state.tradeTape);
  const chartOverlayModel = useProductTradingStore((state) => state.chartOverlayModel);
  const setChartTimeframe = useProductTradingStore((state) => state.setChartTimeframe);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  if (!primaryRoute || !chart || !orderTicket || !aiPanel || !activeWatch) {
    return null;
  }

  const relatedOrders = history.filter((order) => order.symbol === selectedSymbol);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <RiskStrip
        primaryRoute={primaryRoute}
        riskSummary={riskSummary}
        buyingPower={orderTicket.buyingPower}
        recentActions={recentActions}
        liveDataStatus={liveDataStatus}
        executionStatus={executionStatus}
      />

      <ProductInfinityBrief
        title="Execution Autonomy"
        subtitle="Execution Center is consuming the shared infinity orchestrator for queue quality, guarded recovery, and safe next-step guidance."
        accent="warning"
        preferredGoalKey="execution-quality"
        compact
      />

      <section style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
        <div style={{ flex: "0 0 280px", minWidth: 260, display: "grid", gap: 16 }}>
          <ProductSymbolSearch
            title="Live Symbol Search"
            subtitle="Search supported live-market symbols and move them straight into the active execution workspace."
            accent="info"
            compact
          />
          <ProductWatchlistManager
            title="Execution Watchlists"
            subtitle="Save symbol sets for macro, growth, or tactical execution focus."
            accent="info"
            compact
          />
          <WatchList items={watchlist} activeSymbol={selectedSymbol} onSelect={selectSymbol} />
        </div>
        <div style={{ flex: "2.15 1 720px", minWidth: 0 }}>
          <ChartPanel
            chart={chart}
            primaryRoute={primaryRoute}
            activeWatch={activeWatch}
            liveDataStatus={liveDataStatus}
            executionStatus={executionStatus}
            tradeTape={tradeTape}
            overlayModel={chartOverlayModel}
            chartTimeframe={chartTimeframe}
            chartTimeframes={chartTimeframes}
            onTimeframeChange={setChartTimeframe}
          />
        </div>
        <div style={{ flex: "1 1 420px", minWidth: 320, display: "grid", gap: 16 }}>
          <OrderEntryPanel
            ticket={orderTicket}
            relatedOrders={relatedOrders}
            executionStatus={executionStatus}
            onFieldChange={updateOrderTicketField}
            onSideChange={setTicketSide}
            onPlaceOrder={placeOrder}
            onStageOrder={stageOrder}
            onAmendOrder={amendOrder}
          />
          <AiAssistantPanel
            aiPanel={aiPanel}
            recentActions={recentActions}
            liveDataStatus={liveDataStatus}
            executionStatus={executionStatus}
          />
        </div>
      </section>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "start" }}>
        <div style={{ flex: "1.08 1 620px", minWidth: 0 }}>
          <PositionsTable positions={positions} onClosePosition={closePosition} />
        </div>
        <div style={{ flex: "0.92 1 520px", minWidth: 0 }}>
          <HistoryTable
            history={history}
            executionEvents={executionEvents}
            activity={recentActions}
            onPlaceOrder={placeOrder}
            onFillOrder={fillOrder}
            onPartialFill={partialFillOrder}
            onRejectOrder={rejectOrder}
            onCancelOrder={cancelOrder}
            onAmendOrder={amendOrder}
          />
        </div>
      </section>
    </div>
  );
}
