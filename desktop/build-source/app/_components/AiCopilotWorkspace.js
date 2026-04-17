"use client";

import { useEffect } from "react";
import { ProductInfinityBrief } from "./ProductInfinityBrief";
import { ProductRuntimeDiagnostics } from "./ProductRuntimeDiagnostics";
import { ProductCard, ProductPill } from "./ProductShell";
import {
  bodyTextStyle,
  moduleHeroStyle,
  moduleInsetStyle,
  modulePanelStyle,
  sectionLabelStyle
} from "./product-module-style";
import { deskTheme } from "./product-theme";
import { useProductTradingStore } from "./product-trading-store";

export function AiCopilotWorkspace({ data, prompts }) {
  const initialize = useProductTradingStore((state) => state.initialize);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const selectedRoute = useProductTradingStore((state) => state.selectedRoute);
  const aiGuidance = useProductTradingStore((state) => state.aiGuidance);
  const riskMode = useProductTradingStore((state) => state.riskMode);
  const protectionState = useProductTradingStore((state) => state.protectionState);
  const recentActions = useProductTradingStore((state) => state.recentActions);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const liveDataDiagnostics = useProductTradingStore((state) => state.liveDataDiagnostics);
  const executionStatus = useProductTradingStore((state) => state.executionStatus);
  const symbolRuntimeHealth = useProductTradingStore((state) => state.symbolRuntimeHealth);
  const executionEvents = useProductTradingStore((state) => state.executionEvents);

  useEffect(() => {
    initialize(data);
  }, [data, initialize]);

  const activeRuntime =
    symbolRuntimeHealth.find((item) => item.symbol === selectedSymbol) || symbolRuntimeHealth[0];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={moduleHeroStyle("info")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ ...moduleInsetStyle("info", 16), minHeight: 154 }}>
            <div style={sectionLabelStyle(deskTheme.colors.sky)}>Guidance Workspace</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 10 }}>{selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.65 }}>
              {selectedRoute?.name || "No active route"} is being translated into trader-facing guidance with {liveDataStatus?.label || "the local feed"} and {executionStatus?.label || "execution"} context.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <ProductPill label={riskMode} tone="info" />
              <ProductPill label={protectionState} tone={protectionState === "Locked" ? "danger" : protectionState === "Guarded" ? "warning" : "success"} />
              <ProductPill label={executionStatus?.label || "Execution offline"} tone={executionStatus?.tone || "warning"} />
            </div>
          </div>
          <ProductCard title="Mode" value={riskMode} tone="info" description="Shared risk context" />
          <ProductCard title="Feed Runtime" value={liveDataStatus?.state || "--"} tone={liveDataStatus?.tone || "warning"} description={`${liveDataStatus?.mode || "No market runtime"} | ${liveDataDiagnostics?.freshness || "Waiting"}`} />
          <ProductCard title="Next Action" description={aiGuidance?.nextAction || "No next action"} tone="success" />
        </div>
      </section>

      <ProductInfinityBrief
        title="Copilot Infinity Context"
        subtitle="AI Copilot now inherits the central orchestrator, product memory, and guarded-action priorities that shape safe operator guidance."
        accent="warning"
        preferredGoalKey="operator-workflow"
        compact
      />

      <section style={modulePanelStyle("info")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Command Brief</div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.8, marginTop: 8 }}>{selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              {selectedRoute?.name || "No active route"} | {riskMode} mode | {protectionState}
            </div>
          </div>
          <ProductPill label="Connected Copilot" tone="info" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
          <ProductCard title="Route Summary" description={aiGuidance?.routeSummary || "No active route summary"} tone="info" />
          <ProductCard title="Execution Suggestion" description={aiGuidance?.executionSuggestion || "No execution suggestion"} tone="success" />
          <ProductCard title="Warning State" description={aiGuidance?.warningState || "No warning state"} tone="danger" />
          <ProductCard title="Execution Engine" value={executionStatus?.label || "--"} tone={executionStatus?.tone || "warning"} description={executionStatus?.state || "No execution engine"} />
          <ProductCard title="Runtime Health" value={activeRuntime?.runtimeHealth || "--"} tone={activeRuntime?.feedHealth === "Degraded" || executionStatus?.rejectedOrders ? "danger" : activeRuntime?.feedHealth === "Stable" || executionStatus?.partialFills ? "warning" : "success"} description={`${activeRuntime?.feedHealth || "No health"} | ${activeRuntime?.signalState || "No signal"}`} />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 16 }}>
        <section style={modulePanelStyle("info")}>
          <div style={sectionLabelStyle()}>Guidance Feed</div>
          <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Trader Interpretation</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Shared AI interpretation of execution and risk context.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {[aiGuidance?.headline, aiGuidance?.riskNote, aiGuidance?.executionSuggestion, aiGuidance?.nextAction]
              .filter(Boolean)
              .map((item) => (
                <div key={item} style={moduleInsetStyle("info", 14)}>
                  <div style={{ ...bodyTextStyle(), marginTop: 2 }}>{item}</div>
                </div>
              ))}
          </div>
        </section>

        <section style={modulePanelStyle("success")}>
          <div style={sectionLabelStyle()}>Prompt Queue</div>
          <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Suggested Prompts</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Shared prompts for the current symbol and route.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {[...(aiGuidance?.prompts || []), ...prompts].slice(0, 6).map((prompt) => (
              <div key={prompt} style={moduleInsetStyle("success", 14)}>
                <div style={{ color: deskTheme.colors.sky, fontWeight: 800, lineHeight: 1.55 }}>{prompt}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={modulePanelStyle("warning")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabelStyle()}>Activity Handoff</div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Operator Context</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Latest shared session state relevant to copilot handoff.</div>
          </div>
          <ProductPill label={`${recentActions.length} Events`} tone="warning" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
          <div style={moduleInsetStyle(liveDataStatus?.tone || "info", 14)}>
            <div style={sectionLabelStyle()}>Market Feed</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{liveDataStatus?.label || "Feed offline"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              {liveDataStatus?.heartbeat || "--:--:--"} | {liveDataStatus?.latency || "Waiting"} | {liveDataDiagnostics?.feedHealth || "No health"}
            </div>
          </div>
          <div style={moduleInsetStyle(executionStatus?.tone || "warning", 14)}>
            <div style={sectionLabelStyle()}>Execution Rail</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{executionStatus?.label || "Execution offline"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              {executionStatus?.pendingOrders ?? 0} pending | {executionStatus?.partialFills ?? 0} partials | {executionStatus?.rejectedOrders ?? 0} rejects
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
          <div style={moduleInsetStyle(activeRuntime?.feedHealth === "Degraded" ? "danger" : "info", 14)}>
            <div style={sectionLabelStyle()}>Active Symbol Runtime</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{activeRuntime?.symbol || selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>
              {activeRuntime?.freshness || "Waiting"} | {activeRuntime?.signalState || "No signal"} | {activeRuntime?.runtimeHealth || "--"}
            </div>
          </div>
          <div style={moduleInsetStyle(executionStatus?.rejectedOrders ? "danger" : executionStatus?.partialFills ? "warning" : "success", 14)}>
            <div style={sectionLabelStyle()}>Execution Exceptions</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{executionStatus?.lastEvent || "Session idle"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{executionStatus?.lastEventDetail || "No execution detail."}</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {recentActions.slice(0, 6).map((action) => (
            <div key={action.id} style={moduleInsetStyle("warning", 14)}>
              <div style={{ fontWeight: 800 }}>{action.title}</div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{action.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={modulePanelStyle("danger")}>
        <div style={sectionLabelStyle()}>Execution Event Log</div>
        <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>Copilot Event Stream</div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Execution acknowledgements, fills, partial fills, and rejects streaming into operator guidance.</div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {executionEvents.slice(0, 6).map((event) => (
            <div key={event.id} style={moduleInsetStyle(event.status === "Rejected" ? "danger" : event.status === "Partially Filled" ? "warning" : "info", 14)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{event.symbol} | {event.event}</strong>
                <ProductPill label={event.status} tone={event.status === "Rejected" ? "danger" : event.status === "Partially Filled" ? "warning" : "info"} />
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8 }}>{event.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <ProductRuntimeDiagnostics
        title="Copilot Diagnostics"
        subtitle="Operator view of feed freshness, route readiness, protection posture, and execution runtime health."
        accent="warning"
        maxSymbols={3}
      />
    </div>
  );
}
