"use client";

import { useEffect } from "react";
import { ProductInfinityBrief } from "./ProductInfinityBrief";
import { ProductCard, ProductPill } from "./ProductShell";
import {
  actionChipStyle,
  bodyTextStyle,
  dataRowStyle,
  moduleHeroStyle,
  moduleInsetStyle,
  modulePanelStyle,
  monoValueStyle,
  sectionLabelStyle
} from "./product-module-style";
import { deskTheme } from "./product-theme";
import { useProductTradingStore } from "./product-trading-store";

function toneForProtection(value) {
  if (value === "Locked") return "danger";
  if (value === "Guarded") return "warning";
  return "success";
}

export function RiskControlWorkspace({ data }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const marketPosture = useProductTradingStore((state) => state.marketPosture);
  const riskSummary = useProductTradingStore((state) => state.riskSummary);
  const riskMode = useProductTradingStore((state) => state.riskMode);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const executionEvents = useProductTradingStore((state) => state.executionEvents);
  const setRiskMode = useProductTradingStore((state) => state.setRiskMode);
  const setProtectionState = useProductTradingStore((state) => state.setProtectionState);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  const summary = riskSummary || {
    drawdown: "0.62%",
    openRisk: "1.38R",
    protectionState,
    guardStatus: `${data.lanes?.length || 0} guard lanes active`
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={moduleHeroStyle("danger")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ ...moduleInsetStyle("danger", 16), minHeight: 154 }}>
            <div style={sectionLabelStyle("#fda4af")}>Protection Console</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 10 }}>
              {selectedSymbol || "No Symbol Selected"}
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.65 }}>
              {selectedRoute?.name || "No active route"} is running under {protectionState.toLowerCase()} protection with {executionStatus?.label || "execution"} active.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <ProductPill label={riskMode} tone="info" />
              <ProductPill label={protectionState} tone={toneForProtection(protectionState)} />
              <ProductPill label={liveDataStatus?.label || "Feed offline"} tone={liveDataStatus?.tone || "neutral"} />
            </div>
          </div>
          <ProductCard title="Risk Mode" value={riskMode} tone="info" description="Shared session risk posture" />
          <ProductCard title="Protection" value={protectionState} tone={toneForProtection(protectionState)} description="Active protection state" />
          <ProductCard title="Execution Engine" value={executionStatus?.label || "--"} tone={executionStatus?.tone || "warning"} description={executionStatus?.state || "No execution engine"} />
        </div>
      </section>

      <ProductInfinityBrief
        title="Risk Autonomy Console"
        subtitle="Risk Control is linked to the same guarded infinity loop for runtime stability, recovery history, and safe risk posture adjustments."
        accent="danger"
        preferredGoalKey="runtime-stability"
        compact
      />

      <section style={modulePanelStyle("danger")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Risk Dashboard</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>{selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{selectedRoute?.name || "No active route"}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProductPill label={marketPosture?.posture || "Monitoring"} tone="warning" />
            <ProductPill label={protectionState} tone={toneForProtection(protectionState)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 16 }}>
          <ProductCard title="Risk Posture" value={marketPosture?.posture || "Monitoring"} tone="warning" description={marketPosture?.bias || "No active bias"} />
          <ProductCard title="Drawdown" value={summary.drawdown} tone="success" description="Session drawdown" />
          <ProductCard title="Open Risk" value={summary.openRisk} tone="warning" description="Current active exposure" />
          <ProductCard title="Protection" value={protectionState} tone={toneForProtection(protectionState)} description="Shared protection state" />
          <ProductCard title="Feed Runtime" value={liveDataStatus?.state || "--"} tone={liveDataStatus?.tone || "neutral"} description={`${liveDataStatus?.mode || "No live runtime"} | ${liveDataStatus?.freshness || "Waiting"}`} />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section style={modulePanelStyle("info")}>
          <div style={sectionLabelStyle()}>Risk Handling</div>
          <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Risk Mode</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Change the shared risk handling mode for the current session.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            {["Defensive", "Balanced", "Aggressive"].map((mode) => (
              <button key={mode} type="button" onClick={() => setRiskMode(mode)} style={actionChipStyle(mode === riskMode, "info")}>
                {mode}
              </button>
            ))}
          </div>
          <div style={{ ...moduleInsetStyle("info", 14), marginTop: 16 }}>
            <div style={sectionLabelStyle()}>Control Note</div>
            <div style={{ ...bodyTextStyle(), marginTop: 8 }}>
              Risk mode shifts the shared session posture across execution, AI guidance, and the shell rail.
            </div>
          </div>
        </section>

        <section style={modulePanelStyle("danger")}>
          <div style={sectionLabelStyle()}>Protection Handling</div>
          <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Protection State</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Adjust the local protection posture and keep it reflected across modules.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            {["Armed", "Guarded", "Locked"].map((state) => (
              <button key={state} type="button" onClick={() => setProtectionState(state)} style={actionChipStyle(state === protectionState, toneForProtection(state))}>
                {state}
              </button>
            ))}
          </div>
          <div style={{ ...moduleInsetStyle(toneForProtection(protectionState), 14), marginTop: 16 }}>
            <div style={sectionLabelStyle()}>Protection Note</div>
            <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{summary.guardStatus}</div>
          </div>
        </section>
      </div>

      <section style={modulePanelStyle("danger")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Guard Matrix</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Protection Lanes</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Live lane health and guard coverage across the operating session.</div>
          </div>
          <ProductPill label={`${(data.lanes || []).length} Lanes`} tone="danger" />
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {(data.lanes || []).map((lane) => (
            <div key={lane.slug} style={{ ...dataRowStyle(), gridTemplateColumns: "1.1fr 110px 1fr 140px" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{lane.title}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{lane.status}</div>
              </div>
              <div style={{ ...monoValueStyle("success", 20), justifySelf: "start" }}>{lane.progress}%</div>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(15, 23, 42, 0.92)", overflow: "hidden", border: `1px solid ${deskTheme.colors.lineSoft}` }}>
                <div style={{ width: `${lane.progress}%`, height: "100%", background: "linear-gradient(90deg, rgba(248, 113, 113, 0.92) 0%, rgba(245, 158, 11, 0.92) 55%, rgba(34, 197, 94, 0.92) 100%)" }} />
              </div>
              <ProductPill label={lane.status} tone={lane.progress >= 80 ? "success" : lane.progress >= 50 ? "warning" : "danger"} />
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
          <div style={moduleInsetStyle(liveDataStatus?.tone || "info", 14)}>
            <div style={sectionLabelStyle()}>Market Feed</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{liveDataStatus?.label || "Feed offline"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{liveDataStatus?.heartbeat || "--:--:--"} | {liveDataStatus?.latency || "Waiting"}</div>
          </div>
          <div style={moduleInsetStyle(executionStatus?.tone || "success", 14)}>
            <div style={sectionLabelStyle()}>Execution Queue</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{executionStatus?.pendingOrders ?? 0} pending</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{executionStatus?.label || "Execution offline"} | {executionStatus?.partialFills ?? 0} partials | {executionStatus?.rejectedOrders ?? 0} rejects</div>
          </div>
        </div>
      </section>

      <section style={modulePanelStyle("danger")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Execution Exceptions</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Protection Event Review</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Partial fills, rejects, acknowledgements, and closes relevant to current protection posture.</div>
          </div>
          <ProductPill label={`${executionEvents.length} Events`} tone={executionStatus?.rejectedOrders ? "danger" : executionStatus?.partialFills ? "warning" : "success"} />
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {executionEvents.slice(0, 6).map((event) => (
            <div key={event.id} style={{ ...dataRowStyle(), gridTemplateColumns: "1.1fr 120px 1fr" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{event.symbol} | {event.event}</div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{event.detail}</div>
              </div>
              <ProductPill label={event.status} tone={event.status === "Rejected" ? "danger" : event.status === "Partially Filled" ? "warning" : "info"} />
              <div style={{ color: deskTheme.colors.soft, justifySelf: "start" }}>{event.time} | {event.provider}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
