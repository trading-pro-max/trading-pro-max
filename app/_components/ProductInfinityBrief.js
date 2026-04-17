"use client";

import { ProductPill } from "./ProductShell";
import {
  bodyTextStyle,
  moduleInsetStyle,
  modulePanelStyle,
  monoValueStyle,
  sectionLabelStyle
} from "./product-module-style";
import { useProductTradingStore } from "./product-trading-store";

function toneAccent(tone) {
  return tone === "danger" || tone === "warning" || tone === "success" ? tone : "info";
}

function pillTone(tone) {
  return tone === "danger" || tone === "warning" || tone === "success" || tone === "info" ? tone : "neutral";
}

export function ProductInfinityBrief({
  title = "Infinity Orchestrator",
  subtitle = "Guarded self-direction, product memory, and safe improvement priorities for the connected workspace.",
  accent = "info",
  preferredGoalKey = "",
  compact = false
}) {
  const infinityOrchestrator = useProductTradingStore((state) => state.infinityOrchestrator);
  const infinityLoop = useProductTradingStore((state) => state.infinityLoop);
  const productMemory = useProductTradingStore((state) => state.productMemory);
  const autonomyMode = useProductTradingStore((state) => state.autonomyMode);

  if (!infinityOrchestrator || !infinityLoop || !productMemory) {
    return null;
  }

  const focusGoal =
    infinityOrchestrator.goals.find((goal) => goal.key === preferredGoalKey) ||
    infinityOrchestrator.topPriority;
  const weakAreas = productMemory.recurringWeakAreas.slice(0, compact ? 3 : 5);
  const lastImprovement = infinityOrchestrator.lastImprovement || productMemory.lastImprovement;

  return (
    <section style={modulePanelStyle(accent)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={sectionLabelStyle()}>{compact ? "Infinity" : "Infinity Orchestrator"}</div>
          <div style={{ fontSize: compact ? 22 : 26, fontWeight: 950, letterSpacing: -0.6, marginTop: 8 }}>{title}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ProductPill label={autonomyMode || "Guarded Observe"} tone="info" />
          <ProductPill label={infinityLoop.status} tone={pillTone(infinityLoop.tone)} />
          <ProductPill label={`${productMemory.memoryDepth} memory items`} tone="neutral" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? 180 : 220}px, 1fr))`, gap: 12, marginTop: 16 }}>
        <div style={moduleInsetStyle(toneAccent(infinityOrchestrator.systemHealth.tone), 14)}>
          <div style={sectionLabelStyle()}>System Health</div>
          <div style={{ ...monoValueStyle(infinityOrchestrator.systemHealth.tone, compact ? 20 : 24), marginTop: 8 }}>
            {infinityOrchestrator.systemHealth.score}
          </div>
          <div style={{ color: "#cbd5e1", marginTop: 6, fontSize: 12 }}>{infinityOrchestrator.systemHealth.state}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{infinityOrchestrator.systemHealth.detail}</div>
        </div>
        <div style={moduleInsetStyle(toneAccent(focusGoal.tone), 14)}>
          <div style={sectionLabelStyle()}>Current Top Priority</div>
          <div style={{ fontSize: compact ? 18 : 20, fontWeight: 900, marginTop: 8 }}>{focusGoal.label}</div>
          <div style={{ ...monoValueStyle(focusGoal.tone, compact ? 18 : 20), marginTop: 8 }}>{focusGoal.score}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{focusGoal.whyItMatters}</div>
        </div>
        <div style={moduleInsetStyle(toneAccent(infinityOrchestrator.nextRecommendedAction.tone), 14)}>
          <div style={sectionLabelStyle()}>Next Safe Action</div>
          <div style={{ fontSize: compact ? 18 : 20, fontWeight: 900, marginTop: 8 }}>
            {infinityOrchestrator.nextRecommendedAction.label}
          </div>
          <div style={{ color: "#cbd5e1", marginTop: 6, fontSize: 12 }}>{infinityOrchestrator.nextRecommendedAction.status}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{infinityOrchestrator.nextRecommendedAction.reason}</div>
        </div>
        <div style={moduleInsetStyle(toneAccent(infinityLoop.tone), 14)}>
          <div style={sectionLabelStyle()}>Infinity Loop</div>
          <div style={{ fontSize: compact ? 18 : 20, fontWeight: 900, marginTop: 8 }}>{infinityLoop.currentStage.label}</div>
          <div style={{ color: "#cbd5e1", marginTop: 6, fontSize: 12 }}>{infinityLoop.currentStage.status}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 8 }}>{infinityLoop.currentStage.detail}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1.1fr 0.9fr", gap: 16, marginTop: 16 }}>
        <div style={moduleInsetStyle("warning", 14)}>
          <div style={sectionLabelStyle()}>Recurring Weak Areas</div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {weakAreas.map((area) => (
              <div key={area.key} style={{ display: "grid", gridTemplateColumns: compact ? "1fr 90px" : "1fr 90px 120px", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{area.label}</div>
                  <div style={{ color: "#9fb3c8", marginTop: 6, lineHeight: 1.55 }}>{area.detail}</div>
                </div>
                <div style={{ ...monoValueStyle(area.tone, 18), justifySelf: "start" }}>{area.score}</div>
                {!compact ? <ProductPill label={area.count ? `${area.count} hits` : "Clear"} tone={area.count ? pillTone(area.tone) : "success"} /> : null}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={moduleInsetStyle(lastImprovement?.tone || "info", 14)}>
            <div style={sectionLabelStyle()}>Last Improvement</div>
            <div style={{ fontSize: compact ? 18 : 20, fontWeight: 900, marginTop: 8 }}>
              {lastImprovement?.label || "No improvement logged yet"}
            </div>
            <div style={{ ...bodyTextStyle(), marginTop: 8 }}>
              {lastImprovement?.detail || "Guarded recommendations, recoveries, and operator actions will accumulate here."}
            </div>
          </div>
          <div style={moduleInsetStyle("info", 14)}>
            <div style={sectionLabelStyle()}>Last Recovery</div>
            <div style={{ fontSize: compact ? 18 : 20, fontWeight: 900, marginTop: 8 }}>
              {productMemory.pastRecoveryActions[0]?.label || "No recovery on record"}
            </div>
            <div style={{ ...bodyTextStyle(), marginTop: 8 }}>
              {productMemory.pastRecoveryActions[0]?.detail || "Recovery actions stay logged in local product memory for later operator review."}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
