"use client";

import { useEffect } from "react";
import { ProductSymbolSearch } from "./ProductSymbolSearch";
import { ProductInfinityBrief } from "./ProductInfinityBrief";
import { ProductRuntimeDiagnostics } from "./ProductRuntimeDiagnostics";
import { ProductWatchlistManager } from "./ProductWatchlistManager";
import { ProductCard, ProductPill } from "./ProductShell";
import { getLiveChartTone, getLiveFreshnessTone, getLiveHealthTone } from "./product-live-data";
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

function postureTone(posture) {
  if (posture === "Defensive") return "danger";
  if (posture === "Observational") return "warning";
  return "success";
}

function routeTone(state) {
  if (state === "Protected" || state === "Blocked") return "danger";
  if (state === "Watch" || state === "Ready") return "warning";
  return "success";
}

function buildMiniChartPath(points = [], width = 360, height = 96) {
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

export function MarketIntelligenceWorkspace({ data }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const selectSymbol = useProductTradingStore((state) => state.selectSymbol);
  const selectRoute = useProductTradingStore((state) => state.selectRoute);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const watchlist = useProductTradingStore((state) => state.watchlist);
  const activeWatch = useProductTradingStore((state) => state.activeWatch);
  const marketPosture = useProductTradingStore((state) => state.marketPosture);
  const routeNotes = useProductTradingStore((state) => state.routeNotes);
  const marketFeeds = useProductTradingStore((state) => state.marketFeeds);
  const routeLibrary = useProductTradingStore((state) => state.routeLibrary);
  const liveDataSource = useProductTradingStore((state) => state.liveDataSource);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const liveDataDiagnostics = useProductTradingStore((state) => state.liveDataDiagnostics);
  const symbolRuntimeHealth = useProductTradingStore((state) => state.symbolRuntimeHealth);
  const liveDataProviders = useProductTradingStore((state) => state.liveDataProviders);
  const setLiveDataSource = useProductTradingStore((state) => state.setLiveDataSource);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const chartData = useProductTradingStore((state) => state.chartData);
  const chartOverlayModel = useProductTradingStore((state) => state.chartOverlayModel);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  const linkedRoutes = routeLibrary.filter((route) => route.asset === selectedSymbol);
  const activeRoute = selectedRoute || linkedRoutes[0];
  const topFeeds = marketFeeds.slice(0, 4);
  const activeRuntime =
    symbolRuntimeHealth.find((item) => item.symbol === selectedSymbol) || symbolRuntimeHealth[0];
  const chartPath = buildMiniChartPath(chartData?.points || []);
  const chartTone = getLiveChartTone(chartData?.readinessState, chartData?.freshness);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={moduleHeroStyle("info")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ ...moduleInsetStyle("info", 16), minHeight: 154 }}>
            <div style={sectionLabelStyle(deskTheme.colors.sky)}>Market Overview</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 10 }}>
              {activeWatch?.symbol || "No Symbol Selected"}
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.65 }}>
              {activeWatch?.note || "Shared market overview and signal posture for the active product symbol."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <ProductPill label={activeWatch?.strategy || "No route"} tone="info" />
              <ProductPill label={marketPosture?.posture || "Monitoring"} tone={postureTone(marketPosture?.posture)} />
              <ProductPill label={liveDataStatus?.label || "Feed offline"} tone={liveDataStatus?.tone || "neutral"} />
            </div>
          </div>
          <ProductCard
            title="Watchlist Context"
            value={String(watchlist.length).padStart(2, "0")}
            tone="info"
            description="Priority symbols in the active market board"
          />
          <ProductCard
            title="Signal Strength"
            value={marketPosture?.signalStrength || "--"}
            tone="success"
            description="Current active-symbol conviction"
          />
          <ProductCard
            title="Feed Runtime"
            value={liveDataStatus?.state || "--"}
            tone={liveDataStatus?.tone || "warning"}
            description={`${liveDataStatus?.mode || "No connected market runtime"} | ${liveDataDiagnostics?.freshness || "Waiting"}`}
          />
          <ProductCard
            title="Chart Runtime"
            value={chartData?.readinessState || "--"}
            tone={chartTone}
            description={`${chartData?.providerSymbol || liveDataStatus?.providerSymbol || "No mapping"} | ${chartData?.freshness || "Waiting"}`}
          />
        </div>
      </section>

      <ProductInfinityBrief
        title="Market Intelligence Orchestrator"
        subtitle="Live-data quality, runtime freshness, and recurring weak-area memory are shared into the market overview board."
        accent="info"
        preferredGoalKey="live-data-quality"
        compact
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 360px) minmax(0, 1fr)", gap: 16 }}>
        <section style={modulePanelStyle("info")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle()}>Market Watch</div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Shared Watchlist</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Select the product symbol context.</div>
            </div>
            <ProductPill label={`${watchlist.length} Symbols`} tone="info" />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {liveDataProviders.map((provider) => (
              <button
                key={provider.key}
                type="button"
                onClick={() => setLiveDataSource(provider.key)}
                style={actionChipStyle(provider.key === liveDataSource, provider.tone)}
              >
                {provider.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <ProductSymbolSearch
              title="Live Symbol Search"
              subtitle="Search the supported live catalog and move the active board onto a new symbol."
              accent="info"
              compact
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <ProductWatchlistManager
              title="Saved Watchlists"
              subtitle="Switch between locally saved market-focus boards without losing shared state continuity."
              accent="info"
              compact
            />
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {watchlist.map((item) => {
              const active = item.symbol === selectedSymbol;
              return (
                <button key={item.symbol} type="button" onClick={() => selectSymbol(item.symbol)} style={rowButtonStyle(active, "info")}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900 }}>{item.symbol}</div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>{item.strategy}</div>
                    </div>
                    <ProductPill label={item.status} tone={routeTone(item.status)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                    <div>
                      <div style={sectionLabelStyle()}>Last</div>
                      <div style={{ ...monoValueStyle("neutral", 18), marginTop: 6 }}>{String(item.last)}</div>
                    </div>
                    <div>
                      <div style={sectionLabelStyle()}>Change</div>
                      <div style={{ ...monoValueStyle(item.change?.startsWith("-") ? "danger" : "success", 18), marginTop: 6 }}>
                        {item.change}
                      </div>
                    </div>
                    <div>
                      <div style={sectionLabelStyle()}>Signal</div>
                      <div style={{ ...monoValueStyle("success", 18), marginTop: 6 }}>{item.signalStrength || item.confidence}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <ProductPill label={item.feedHealth || "Stable"} tone={getLiveHealthTone(item.feedHealth || "Stable")} />
                    <ProductPill label={item.freshness || "Warm"} tone={getLiveFreshnessTone(item.freshness || "Warm")} />
                    <ProductPill label={item.signalState || "Monitoring"} tone={item.signalState === "Protected" || item.signalState === "Weak" ? "danger" : item.signalState === "Building" ? "warning" : "success"} />
                    <ProductPill label={item.providerSymbol || "Native"} tone={item.mappingState === "Mapped" ? "info" : "neutral"} />
                  </div>
                  <div style={{ ...bodyTextStyle(), marginTop: 10, color: "#cbd5e1" }}>{item.bias}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={modulePanelStyle("info")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle()}>Active Market Board</div>
              <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>
                {activeWatch?.symbol || "No Symbol Selected"}
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
                {activeWatch?.strategy || "Shared market context from product state"}
              </div>
            </div>
            {activeWatch ? <ProductPill label={marketPosture?.posture || "Monitoring"} tone={postureTone(marketPosture?.posture)} /> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 16 }}>
            <div style={moduleInsetStyle("success", 14)}>
              <div style={sectionLabelStyle()}>Signal Strength</div>
              <div style={{ ...monoValueStyle("success", 24), marginTop: 8 }}>{marketPosture?.signalStrength || "--"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>Shared across the connected product.</div>
            </div>
            <div style={moduleInsetStyle("warning", 14)}>
              <div style={sectionLabelStyle()}>Market Bias</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{marketPosture?.bias || "No active bias"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>Current directional narrative.</div>
            </div>
            <div style={moduleInsetStyle("info", 14)}>
              <div style={sectionLabelStyle()}>Route Link</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{activeRoute?.name || "--"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{marketPosture?.posture || "No linked route"}</div>
            </div>
            <div style={moduleInsetStyle("neutral", 14)}>
              <div style={sectionLabelStyle()}>Execution State</div>
              <div style={{ ...monoValueStyle(routeTone(activeRoute?.state), 24), marginTop: 8 }}>{activeRoute?.state || "--"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{executionStatus?.label || "Execution adapter offline"}</div>
            </div>
            <div style={moduleInsetStyle(chartTone, 14)}>
              <div style={sectionLabelStyle()}>Provider Symbol</div>
              <div style={{ ...monoValueStyle("info", 24), marginTop: 8 }}>{chartData?.providerSymbol || liveDataStatus?.providerSymbol || "--"}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                {chartData?.timeframe || "--"} | {chartData?.mappingState || liveDataStatus?.mappingState || "Native"}
              </div>
            </div>
            <div style={moduleInsetStyle(getLiveHealthTone(activeRuntime?.feedHealth || "Stable"), 14)}>
              <div style={sectionLabelStyle()}>Runtime Health</div>
              <div style={{ ...monoValueStyle(getLiveHealthTone(activeRuntime?.feedHealth || "Stable"), 24), marginTop: 8 }}>
                {activeRuntime?.runtimeHealth || "--"}
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                {activeRuntime?.feedHealth || "No health"} | {activeRuntime?.freshness || "Waiting"} | {activeRuntime?.lastUpdate || "--:--:--"}
              </div>
            </div>
          </div>

          {linkedRoutes.length ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {linkedRoutes.map((route) => (
                <button key={route.name} type="button" onClick={() => selectRoute(route.name)} style={actionChipStyle(route.name === activeRoute?.name, routeTone(route.state))}>
                  {route.name}
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 16, marginTop: 16 }}>
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
                <div style={{ fontWeight: 800, marginTop: 8 }}>{liveDataStatus?.mode || "No connected runtime"}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>
                  Heartbeat {liveDataStatus?.heartbeat || "--:--:--"} | {liveDataStatus?.latency || "Waiting"}
                </div>
              </div>
              <div style={moduleInsetStyle(chartTone, 14)}>
                <div style={sectionLabelStyle()}>Live Chart Runtime</div>
                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: `1px solid ${deskTheme.colors.lineSoft}`, background: "linear-gradient(180deg, rgba(5, 10, 20, 0.96) 0%, rgba(2, 6, 23, 1) 100%)", minHeight: 132 }}>
                    <svg viewBox="0 0 360 96" style={{ width: "100%", height: 132, display: "block" }} preserveAspectRatio="none">
                      {[0.2, 0.4, 0.6, 0.8].map((line) => (
                        <line key={line} x1="0" x2="360" y1={96 * line} y2={96 * line} stroke="rgba(148, 163, 184, 0.10)" strokeWidth="1" />
                      ))}
                      {chartPath ? <path d={chartPath} fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" /> : null}
                    </svg>
                    <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ProductPill label={chartData?.timeframe || "--"} tone="info" />
                      <ProductPill label={chartData?.readinessState || liveDataStatus?.chartReadiness || "--"} tone={chartTone} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <div>
                      <div style={sectionLabelStyle()}>Last Candle</div>
                      <div style={{ ...monoValueStyle("neutral", 18), marginTop: 6 }}>
                        {chartData?.lastCandleUpdate ? new Date(chartData.lastCandleUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                      </div>
                    </div>
                    <div>
                      <div style={sectionLabelStyle()}>Freshness</div>
                      <div style={{ ...monoValueStyle(getLiveFreshnessTone(chartData?.freshness || liveDataStatus?.chartFreshness || "--"), 18), marginTop: 6 }}>
                        {chartData?.freshness || liveDataStatus?.chartFreshness || "--"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                    {(chartOverlayModel?.summaries || []).slice(0, 3).map((summary) => (
                      <div key={summary.label}>
                        <div style={sectionLabelStyle()}>{summary.label}</div>
                        <div style={{ ...monoValueStyle(summary.tone, 16), marginTop: 6 }}>{summary.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: deskTheme.colors.soft, lineHeight: 1.6 }}>
                    {chartData?.degradedReason || "Provider-backed candles are active for the current symbol when the live adapter is ready."}
                  </div>
                </div>
              </div>
              {topFeeds.map((feed) => (
                <div key={feed.slug} style={moduleInsetStyle(feed.status === "Streaming" ? "success" : "info", 14)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong>{feed.title}</strong>
                    <ProductPill label={`${feed.strength}%`} tone="success" />
                  </div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>Status: {feed.status}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.04fr 0.96fr", gap: 16 }}>
        <section style={modulePanelStyle("success")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle()}>Signal Lanes</div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Signal Feeds</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Shared feed lanes available to Market Intelligence and Execution Center.</div>
            </div>
            <ProductPill label={`${marketFeeds.length} Feeds`} tone="success" />
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {marketFeeds.map((feed) => (
              <div key={feed.slug} style={{ ...dataRowStyle(), gridTemplateColumns: "1.2fr 130px 110px" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{feed.title}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{liveDataStatus?.label || "Connected"} signal lane</div>
                </div>
                <div style={{ ...monoValueStyle("success", 22), justifySelf: "start" }}>{feed.strength}%</div>
                <ProductPill label={feed.status} tone={feed.status === "Streaming" ? "success" : "info"} />
              </div>
            ))}
          </div>
        </section>

        <section style={modulePanelStyle("info")}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle()}>Market Matrix</div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Overview Board</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Cross-symbol market scan for the current product session.</div>
            </div>
            <ProductPill label="Overview Active" tone="info" />
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {watchlist.map((item) => (
              <div key={item.symbol} style={{ ...dataRowStyle(), gridTemplateColumns: "130px minmax(0, 1.2fr) 150px 100px" }}>
                <strong>{item.symbol}</strong>
                <span style={{ color: "#cbd5e1", lineHeight: 1.55 }}>{item.note}</span>
                <span style={{ color: deskTheme.colors.soft }}>{item.bias}</span>
                <span style={{ ...monoValueStyle("success", 18), justifySelf: "end" }}>{item.signalStrength || item.confidence}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ProductRuntimeDiagnostics
        title="Market Feed Diagnostics"
        subtitle="Provider state, freshness, feed health, route readiness, and runtime health for the active market board."
        accent="info"
        maxSymbols={4}
      />
    </div>
  );
}
