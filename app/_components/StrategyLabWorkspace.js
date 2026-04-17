"use client";

import { useEffect } from "react";
import { ProductSymbolSearch } from "./ProductSymbolSearch";
import { ProductInfinityBrief } from "./ProductInfinityBrief";
import { ProductCard, ProductPill } from "./ProductShell";
import { getLiveChartTone, getLiveFreshnessTone } from "./product-live-data";
import {
  actionChipStyle,
  bodyTextStyle,
  dataRowStyle,
  moduleHeroStyle,
  moduleInsetStyle,
  modulePanelStyle,
  monoValueStyle,
  rowButtonStyle,
  sectionLabelStyle
} from "./product-module-style";
import { deskTheme } from "./product-theme";
import { useProductTradingStore } from "./product-trading-store";

function routeTone(state) {
  if (state === "Protected" || state === "Blocked") return "danger";
  if (state === "Watch" || state === "Ready") return "warning";
  return "success";
}

function buildMiniChartPath(points = [], width = 320, height = 84) {
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

export function StrategyLabWorkspace({ data }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const selectRoute = useProductTradingStore((state) => state.selectRoute);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const routeNotes = useProductTradingStore((state) => state.routeNotes);
  const routeLibrary = useProductTradingStore((state) => state.routeLibrary);
  const aiGuidance = useProductTradingStore((state) => state.aiGuidance);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const signalBoard = useProductTradingStore((state) => state.signalBoard);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const chartData = useProductTradingStore((state) => state.chartData);
  const chartOverlayModel = useProductTradingStore((state) => state.chartOverlayModel);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  const activeRoute =
    routeLibrary.find((route) => route.name === selectedRoute?.name) ||
    routeLibrary.find((route) => route.asset === selectedSymbol) ||
    selectedRoute;
  const readiness =
    activeRoute?.state === "Protected"
      ? "Hold for defensive handling"
      : activeRoute?.state === "Watch"
        ? "Monitor before execution"
        : "Ready for staged execution";
  const chartPath = buildMiniChartPath(chartData?.points || []);
  const chartTone = getLiveChartTone(chartData?.readinessState, chartData?.freshness);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={moduleHeroStyle("info")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ ...moduleInsetStyle("info", 16), minHeight: 154 }}>
            <div style={sectionLabelStyle()}>Route Management</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 10 }}>
              {activeRoute?.name || "No Route Selected"}
            </div>
            <div style={{ color: "#9fb3c8", marginTop: 8, lineHeight: 1.65 }}>
              {activeRoute?.asset || "Select a route to promote it into execution readiness."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <ProductPill label={activeRoute?.state || "Review"} tone={routeTone(activeRoute?.state)} />
              <ProductPill label={activeRoute?.confidence || "--"} tone="success" />
              <ProductPill label={liveDataStatus?.label || "Feed offline"} tone={liveDataStatus?.tone || "neutral"} />
            </div>
          </div>
          <ProductCard title="Qualified Routes" value={String(routeLibrary.length).padStart(2, "0")} tone="info" description="Desktop strategy queue" />
          <ProductCard title="Confidence" value={activeRoute?.confidence || "--"} tone="success" description="Current route conviction" />
          <ProductCard title="Execution Readiness" value={activeRoute?.state || "--"} tone={routeTone(activeRoute?.state)} description={readiness} />
          <ProductCard title="Chart Runtime" value={chartData?.readinessState || "--"} tone={chartTone} description={`${chartData?.providerSymbol || liveDataStatus?.providerSymbol || "No mapping"} | ${chartData?.timeframe || "--"}`} />
        </div>
      </section>

      <ProductInfinityBrief
        title="Strategy Priority Engine"
        subtitle="Strategy Lab now sees the same goal ranking, weak-point memory, and safe-action loop that drives the shared product runtime."
        accent="info"
        preferredGoalKey="operator-workflow"
        compact
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 380px) minmax(0, 1fr)", gap: 16 }}>
        <section style={modulePanelStyle("info")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle()}>Route Stack</div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Strategy Queue</div>
              <div style={{ color: "#9fb3c8", marginTop: 6 }}>Select the active strategy route for the product.</div>
            </div>
            <ProductPill label={`${routeLibrary.length} Routes`} tone="info" />
          </div>

          <div style={{ marginTop: 14 }}>
            <ProductSymbolSearch
              title="Route Symbol Search"
              subtitle="Search supported instruments and move Strategy Lab onto a new route candidate."
              accent="info"
              compact
            />
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {routeLibrary.map((route) => {
              const isActive = route.asset === selectedSymbol;
              return (
                <button key={route.name} type="button" onClick={() => selectRoute(route.name)} style={rowButtonStyle(isActive, routeTone(route.state))}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900 }}>{route.name}</div>
                      <div style={{ color: "#9fb3c8", marginTop: 4 }}>{route.asset}</div>
                    </div>
                    <ProductPill label={route.state} tone={routeTone(route.state)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                    <div>
                      <div style={sectionLabelStyle()}>Confidence</div>
                      <div style={{ ...monoValueStyle("success", 18), marginTop: 6 }}>{route.confidence}</div>
                    </div>
                    <div>
                      <div style={sectionLabelStyle()}>Execution</div>
                      <div style={{ ...monoValueStyle(routeTone(route.state), 18), marginTop: 6 }}>{route.executionReadiness || route.state}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={modulePanelStyle("warning")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle()}>Route Dossier</div>
              <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>
                {activeRoute?.name || "No Route Selected"}
              </div>
              <div style={{ color: "#9fb3c8", marginTop: 6 }}>{activeRoute?.asset || "No active symbol"}</div>
            </div>
            {activeRoute ? <ProductPill label={activeRoute.state} tone={routeTone(activeRoute.state)} /> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 16 }}>
            <ProductCard title="Selected Route" value={activeRoute?.name || "--"} tone="info" description="Shared with Execution Center" />
            <ProductCard title="Qualification" value={activeRoute?.qualificationState || activeRoute?.state || "--"} tone={routeTone(activeRoute?.state)} description="Current route state" />
            <ProductCard title="Confidence" value={activeRoute?.confidence || "--"} tone="success" description="Trader-facing conviction" />
            <ProductCard title="Execution Engine" value={executionStatus?.label || "--"} tone={executionStatus?.tone || "warning"} description={executionStatus?.state || readiness} />
            <ProductCard title="Provider Symbol" value={chartData?.providerSymbol || liveDataStatus?.providerSymbol || "--"} tone="info" description={`${chartData?.mappingState || liveDataStatus?.mappingState || "Native"} | ${chartData?.freshness || "Waiting"}`} />
            <ProductCard title="Candle Lane" value={chartData?.timeframe || "--"} tone={chartTone} description={chartData?.lastCandleUpdate ? `Last candle ${new Date(chartData.lastCandleUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for chart update"} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            {routeLibrary.slice(0, 5).map((route) => (
              <button key={route.name} type="button" onClick={() => selectRoute(route.name)} style={actionChipStyle(route.name === activeRoute?.name, routeTone(route.state))}>
                {route.name}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 16, marginTop: 16 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {routeNotes.map((note) => (
                <div key={note} style={moduleInsetStyle("info", 14)}>
                  <div style={sectionLabelStyle()}>Route Note</div>
                  <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{note}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={moduleInsetStyle(liveDataStatus?.tone || "info", 14)}>
                <div style={sectionLabelStyle()}>Feed Runtime</div>
                <div style={{ fontWeight: 800, marginTop: 8 }}>{liveDataStatus?.mode || "No live runtime"}</div>
                <div style={{ color: "#9fb3c8", marginTop: 8 }}>Heartbeat {liveDataStatus?.heartbeat || "--:--:--"} | {liveDataStatus?.latency || "Waiting"}</div>
              </div>
              <div style={moduleInsetStyle(chartTone, 14)}>
                <div style={sectionLabelStyle()}>Live Chart Model</div>
                <div style={{ position: "relative", marginTop: 10, borderRadius: 14, overflow: "hidden", border: `1px solid ${deskTheme.colors.lineSoft}`, background: "linear-gradient(180deg, rgba(5, 10, 20, 0.96) 0%, rgba(2, 6, 23, 1) 100%)", minHeight: 118 }}>
                  <svg viewBox="0 0 320 84" style={{ width: "100%", height: 118, display: "block" }} preserveAspectRatio="none">
                    {[0.2, 0.4, 0.6, 0.8].map((line) => (
                      <line key={line} x1="0" x2="320" y1={84 * line} y2={84 * line} stroke="rgba(148, 163, 184, 0.10)" strokeWidth="1" />
                    ))}
                    {chartPath ? <path d={chartPath} fill="none" stroke="#38bdf8" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" /> : null}
                  </svg>
                  <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ProductPill label={chartData?.timeframe || "--"} tone="info" />
                    <ProductPill label={chartData?.readinessState || "--"} tone={chartTone} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
                  <div>
                    <div style={sectionLabelStyle()}>Provider Symbol</div>
                    <div style={{ color: "#f8fafc", fontWeight: 800, marginTop: 6 }}>{chartData?.providerSymbol || liveDataStatus?.providerSymbol || "--"}</div>
                  </div>
                  <div>
                    <div style={sectionLabelStyle()}>Freshness</div>
                    <div style={{ ...monoValueStyle(getLiveFreshnessTone(chartData?.freshness || liveDataStatus?.chartFreshness || "--"), 18), marginTop: 6 }}>
                      {chartData?.freshness || liveDataStatus?.chartFreshness || "--"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 10 }}>
                  {(chartOverlayModel?.summaries || []).slice(0, 3).map((summary) => (
                    <div key={summary.label}>
                      <div style={sectionLabelStyle()}>{summary.label}</div>
                      <div style={{ ...monoValueStyle(summary.tone, 16), marginTop: 6 }}>{summary.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ color: "#9fb3c8", marginTop: 8, lineHeight: 1.6 }}>
                  {chartData?.degradedReason || "Strategy qualification is linked to the active provider-backed candle lane when the feed is ready."}
                </div>
              </div>
              <div style={moduleInsetStyle("warning", 14)}>
                <div style={sectionLabelStyle()}>Execution Suggestion</div>
                <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{aiGuidance?.executionSuggestion || readiness}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section style={modulePanelStyle("info")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Route Queue</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Qualification Stack</div>
            <div style={{ color: "#9fb3c8", marginTop: 6 }}>Priority order for execution handoff and feed confirmation.</div>
          </div>
          <ProductPill label={liveDataStatus?.state || "Route Console"} tone={liveDataStatus?.tone || "warning"} />
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {routeLibrary.map((route, index) => {
            const signal = signalBoard[index] || signalBoard.find((item) => item.symbol === route.asset);
            return (
              <div key={route.name} style={{ ...dataRowStyle(), gridTemplateColumns: "1.2fr 130px 110px 150px 1fr" }}>
                <strong>{route.name}</strong>
                <span style={{ color: "#9fb3c8" }}>{route.asset}</span>
                <span style={{ ...monoValueStyle("success", 18), justifySelf: "start" }}>{route.confidence}</span>
                <ProductPill label={route.state} tone={routeTone(route.state)} />
                <span style={{ color: "#cbd5e1" }}>
                  {signal ? `${signal.strength} ${signal.impulse.toLowerCase()} | ${route.executionReadiness}` : route.executionReadiness}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
