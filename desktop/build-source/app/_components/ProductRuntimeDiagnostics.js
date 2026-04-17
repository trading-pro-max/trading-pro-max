"use client";

import { getLiveChartTone, getLiveFreshnessTone, getLiveHealthTone, getZeroCostLiveMode } from "./product-live-data";
import { ProductPill } from "./ProductShell";
import { bodyTextStyle, dataRowStyle, moduleInsetStyle, modulePanelStyle, monoValueStyle, sectionLabelStyle } from "./product-module-style";
import { createButton, deskTheme } from "./product-theme";
import { useProductTradingStore } from "./product-trading-store";

function toneAccent(tone) {
  return tone === "danger" || tone === "success" || tone === "warning" ? tone : "info";
}

function pillTone(tone) {
  return tone === "danger" || tone === "success" || tone === "warning" || tone === "info" ? tone : "neutral";
}

function directionTone(direction) {
  if (direction === "up" || direction === "improving") return "success";
  if (direction === "down" || direction === "softening") return "danger";
  if (direction === "shifted") return "warning";
  return "neutral";
}

function actionButtonLabel(action) {
  if (action.requiresSupportedAdapter || action.blocked) return "Log Block";
  if (action.requiresApproval) return "Run With Approval";
  if (action.recommended) return "Run Recommended";
  return "Run Action";
}

function renderChecks(items = []) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => (
        <div key={`${item.label}-${item.state}`} style={{ ...dataRowStyle(), gridTemplateColumns: "1.15fr 110px" }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>{item.label}</div>
              {typeof item.required === "boolean" ? (
                <ProductPill label={item.required ? "Required" : "Optional"} tone={item.required ? "warning" : "neutral"} />
              ) : null}
            </div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{item.detail}</div>
            {item.placeholder ? (
              <div style={{ color: deskTheme.colors.muted, marginTop: 6, fontSize: 12 }}>Placeholder: {item.placeholder}</div>
            ) : null}
          </div>
          <ProductPill label={item.state} tone={pillTone(item.tone)} />
        </div>
      ))}
    </div>
  );
}

function reportCount(report) {
  return report.payload?.entries?.length || report.payload?.checkpoints?.length || report.payload?.recommendationHistory?.length || report.payload?.adapters?.length || report.payload?.alerts?.length || 0;
}

function exportReport(report) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(report.payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = report.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function ProductRuntimeDiagnostics({
  title = "Runtime Diagnostics",
  subtitle = "Connected feed, execution, route, and protection health for the shared product session.",
  accent = "info",
  compact = false,
  maxSymbols = 4
}) {
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const liveDataDiagnostics = useProductTradingStore((state) => state.liveDataDiagnostics);
  const chartData = useProductTradingStore((state) => state.chartData);
  const symbolRuntimeHealth = useProductTradingStore((state) => state.symbolRuntimeHealth);
  const operatorDiagnostics = useProductTradingStore((state) => state.operatorDiagnostics);
  const evaluationModel = useProductTradingStore((state) => state.evaluationModel);
  const runtimeSignals = useProductTradingStore((state) => state.runtimeSignals);
  const operatorPolicy = useProductTradingStore((state) => state.operatorPolicy);
  const guardedActions = useProductTradingStore((state) => state.guardedActions);
  const guardedActionResults = useProductTradingStore((state) => state.guardedActionResults);
  const autonomyAuditLog = useProductTradingStore((state) => state.autonomyAuditLog);
  const autonomyDiagnostics = useProductTradingStore((state) => state.autonomyDiagnostics);
  const connectorReadiness = useProductTradingStore((state) => state.connectorReadiness);
  const controlledAlerts = useProductTradingStore((state) => state.controlledAlerts);
  const recommendationLoop = useProductTradingStore((state) => state.recommendationLoop);
  const autonomyMode = useProductTradingStore((state) => state.autonomyMode);
  const lastRecoveryAction = useProductTradingStore((state) => state.lastRecoveryAction);
  const runtimeTrendHistory = useProductTradingStore((state) => state.runtimeTrendHistory);
  const runtimeTrendSummary = useProductTradingStore((state) => state.runtimeTrendSummary);
  const operatorReports = useProductTradingStore((state) => state.operatorReports);
  const productMemory = useProductTradingStore((state) => state.productMemory);
  const infinityLoop = useProductTradingStore((state) => state.infinityLoop);
  const infinityOrchestrator = useProductTradingStore((state) => state.infinityOrchestrator);
  const runGuardedAction = useProductTradingStore((state) => state.runGuardedAction);

  if (!operatorDiagnostics || !evaluationModel || !runtimeSignals || !operatorPolicy || !connectorReadiness || !controlledAlerts || !recommendationLoop || !runtimeTrendSummary || !operatorReports || !autonomyDiagnostics || !productMemory || !infinityLoop || !infinityOrchestrator) {
    return null;
  }

  const cards = [
    operatorDiagnostics.feedState,
    operatorDiagnostics.executionState,
    operatorDiagnostics.protectionPosture,
    operatorDiagnostics.routeReadiness,
    operatorDiagnostics.runtimeHealth,
    runtimeSignals.sessionContinuity
  ];
  const scoreCards = autonomyDiagnostics.scores;
  const activeRuntime = operatorDiagnostics.activeRuntime;
  const runtimeRows = [...(activeRuntime ? [activeRuntime] : []), ...symbolRuntimeHealth.filter((item) => item.symbol !== activeRuntime?.symbol)].slice(0, maxSymbols);
  const controlActions = guardedActions.filter((action) => ["diagnose", "simulate", "apply-safe-ui-adjustment", "apply-safe-runtime-reset", "apply-safe-session-recovery", "apply-safe-risk-mode-downgrade", "apply-safe-feed-fallback"].includes(action.key));
  const alertRows = controlledAlerts.alerts.slice(0, compact ? 3 : 6);
  const reportRows = operatorReports.slice(0, compact ? 3 : 5);
  const trendMetrics = [
    runtimeTrendSummary.metrics.feedQuality,
    runtimeTrendSummary.metrics.executionIntegrity,
    runtimeTrendSummary.metrics.workspaceHealth,
    runtimeTrendSummary.metrics.sessionStability,
    runtimeTrendSummary.metrics.runtimeConfidence,
    runtimeTrendSummary.metrics.recommendationShift
  ];
  const adapterPanels = [connectorReadiness.liveData, connectorReadiness.broker];
  const zeroCostMode = getZeroCostLiveMode(liveDataStatus?.key, liveDataStatus);
  const weakPoints = infinityOrchestrator.weakPoints.slice(0, compact ? 3 : 5);
  const memoryRows = productMemory.improvementHistory.slice(0, compact ? 3 : 5);

  return (
    <section style={modulePanelStyle(accent)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={sectionLabelStyle()}>{compact ? "Control Room" : "Operator Diagnostics"}</div>
          <div style={{ fontSize: compact ? 22 : 26, fontWeight: 950, letterSpacing: -0.6, marginTop: 8 }}>{title}</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ProductPill label={selectedSymbol || "No Symbol"} tone="info" />
          <ProductPill label={autonomyMode || "Guarded Observe"} tone="info" />
          <ProductPill label={evaluationModel.runtimeConfidence.state} tone={pillTone(evaluationModel.runtimeConfidence.tone)} />
          <ProductPill label={controlledAlerts.highestSeverity === "Clear" ? "Alerts Clear" : controlledAlerts.highestSeverity} tone={controlledAlerts.highestSeverity === "Critical" ? "danger" : controlledAlerts.highestSeverity === "Warning" ? "warning" : controlledAlerts.highestSeverity === "Notice" ? "info" : "success"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? 150 : 170}px, 1fr))`, gap: 12, marginTop: 16 }}>
        {cards.map((card) => (
          <div key={card.label} style={moduleInsetStyle(toneAccent(card.tone), 14)}>
            <div style={sectionLabelStyle()}>{card.label}</div>
            <div style={{ ...monoValueStyle(card.tone, compact ? 20 : 24), marginTop: 8 }}>{card.value}</div>
            <div style={{ ...bodyTextStyle(), marginTop: 8, color: deskTheme.colors.soft }}>{card.hint || card.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? 140 : 160}px, 1fr))`, gap: 12, marginTop: 16 }}>
        {scoreCards.map((scoreCard) => (
          <div key={scoreCard.label} style={moduleInsetStyle(toneAccent(scoreCard.tone), 14)}>
            <div style={sectionLabelStyle()}>{scoreCard.label}</div>
            <div style={{ ...monoValueStyle(scoreCard.tone, compact ? 18 : 22), marginTop: 8 }}>{scoreCard.score}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 6, fontSize: 12 }}>{scoreCard.state}</div>
            <div style={{ ...bodyTextStyle(), marginTop: 8, color: deskTheme.colors.soft }}>{scoreCard.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1.05fr 0.95fr", gap: 16, marginTop: 16 }}>
        <div style={moduleInsetStyle(toneAccent(infinityOrchestrator.systemHealth.tone), 14)}>
          <div style={sectionLabelStyle()}>Infinity Orchestrator</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{infinityOrchestrator.topPriority.label}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{infinityOrchestrator.summary}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}>
            <div style={moduleInsetStyle(toneAccent(infinityOrchestrator.systemHealth.tone), 10)}>
              <div style={sectionLabelStyle()}>System Health</div>
              <div style={{ ...monoValueStyle(infinityOrchestrator.systemHealth.tone, 18), marginTop: 6 }}>{infinityOrchestrator.systemHealth.score}</div>
            </div>
            <div style={moduleInsetStyle(toneAccent(infinityLoop.tone), 10)}>
              <div style={sectionLabelStyle()}>Loop Status</div>
              <div style={{ ...monoValueStyle(infinityLoop.tone, 18), marginTop: 6 }}>{infinityLoop.status}</div>
            </div>
            <div style={moduleInsetStyle(toneAccent(infinityOrchestrator.nextRecommendedAction.tone), 10)}>
              <div style={sectionLabelStyle()}>Next Safe Action</div>
              <div style={{ fontWeight: 800, marginTop: 8 }}>{infinityOrchestrator.nextRecommendedAction.label}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {weakPoints.map((point) => (
              <ProductPill key={point.key} label={`${point.label} ${point.score}`} tone={pillTone(point.tone)} />
            ))}
          </div>
        </div>

        <div style={moduleInsetStyle("warning", 14)}>
          <div style={sectionLabelStyle()}>Product Memory</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{productMemory.summary}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {memoryRows.map((entry) => (
              <div key={entry.id} style={moduleInsetStyle(toneAccent(entry.tone), 10)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{entry.label}</div>
                  <ProductPill label={entry.category || entry.status || "Logged"} tone={pillTone(entry.tone)} />
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{entry.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "minmax(300px, 0.9fr) minmax(0, 1.1fr)", gap: 16, marginTop: 16 }}>
        <div style={moduleInsetStyle(controlledAlerts.highestSeverity === "Critical" ? "danger" : controlledAlerts.highestSeverity === "Warning" ? "warning" : "info", 14)}>
          <div style={sectionLabelStyle()}>Controlled Alerts</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{controlledAlerts.highestSeverity === "Clear" ? "No Active Alerts" : `${controlledAlerts.highestSeverity} Review`}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{controlledAlerts.summary}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {alertRows.length ? alertRows.map((alert) => (
              <div key={alert.id} style={moduleInsetStyle(toneAccent(alert.tone), 12)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{alert.label}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ProductPill label={alert.severity} tone={pillTone(alert.tone)} />
                    <ProductPill label={alert.source} tone="neutral" />
                  </div>
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{alert.reason}</div>
                <div style={{ color: deskTheme.colors.text, marginTop: 8, lineHeight: 1.6 }}>Recommended action: {alert.recommendedAction}</div>
              </div>
            )) : <div style={{ ...bodyTextStyle(), color: deskTheme.colors.soft }}>Feed, execution, and autonomy lanes are within guarded limits.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={moduleInsetStyle(toneAccent(operatorDiagnostics.runtimeHealth.tone), 14)}>
            <div style={sectionLabelStyle()}>Active Symbol Runtime</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{activeRuntime?.symbol || selectedSymbol || "No Symbol Selected"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
              <div><div style={sectionLabelStyle()}>Freshness</div><div style={{ ...monoValueStyle(getLiveFreshnessTone(activeRuntime?.freshness || "--"), 18), marginTop: 6 }}>{activeRuntime?.freshness || "--"}</div></div>
              <div><div style={sectionLabelStyle()}>Signal State</div><div style={{ ...monoValueStyle(toneAccent(operatorDiagnostics.runtimeHealth.tone), 18), marginTop: 6 }}>{activeRuntime?.signalState || "--"}</div></div>
              <div><div style={sectionLabelStyle()}>Last Update</div><div style={{ color: "#f8fafc", fontFamily: deskTheme.fonts.data, fontWeight: 800, marginTop: 6 }}>{activeRuntime?.lastUpdate || "--:--:--"}</div></div>
              <div><div style={sectionLabelStyle()}>Health</div><div style={{ ...monoValueStyle(toneAccent(operatorDiagnostics.runtimeHealth.tone), 18), marginTop: 6 }}>{activeRuntime?.runtimeHealth || "--"}</div></div>
              <div><div style={sectionLabelStyle()}>Provider Symbol</div><div style={{ color: "#f8fafc", fontFamily: deskTheme.fonts.data, fontWeight: 800, marginTop: 6 }}>{liveDataDiagnostics?.providerSymbol || activeRuntime?.providerSymbol || "--"}</div></div>
              <div><div style={sectionLabelStyle()}>Chart Lane</div><div style={{ ...monoValueStyle(getLiveChartTone(liveDataStatus?.chartReadiness || chartData?.readinessState, liveDataStatus?.chartFreshness || chartData?.freshness), 18), marginTop: 6 }}>{liveDataStatus?.chartReadiness || chartData?.readinessState || "--"}</div></div>
              <div><div style={sectionLabelStyle()}>Last Candle</div><div style={{ color: "#f8fafc", fontFamily: deskTheme.fonts.data, fontWeight: 800, marginTop: 6 }}>{liveDataStatus?.lastCandleUpdate ? new Date(liveDataStatus.lastCandleUpdate).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : "--"}</div></div>
              <div><div style={sectionLabelStyle()}>Chart Freshness</div><div style={{ ...monoValueStyle(getLiveFreshnessTone(liveDataStatus?.chartFreshness || chartData?.freshness || "--"), 18), marginTop: 6 }}>{liveDataStatus?.chartFreshness || chartData?.freshness || "--"}</div></div>
            </div>
            <div style={{ ...bodyTextStyle(), marginTop: 12 }}>{operatorDiagnostics.note}</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {runtimeRows.map((item) => (
              <div key={item.symbol} style={{ ...dataRowStyle(), gridTemplateColumns: compact ? "1.2fr 110px 110px" : "1.2fr 120px 110px 130px" }}>
                <div><div style={{ fontWeight: 800 }}>{item.symbol}</div><div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{item.providerState} | {item.lastUpdateAge}</div></div>
                <div style={{ ...monoValueStyle(getLiveHealthTone(item.feedHealth || "Stable"), 18), justifySelf: "start" }}>{item.runtimeHealth}</div>
                <ProductPill label={item.feedHealth} tone={getLiveHealthTone(item.feedHealth || "Stable")} />
                {!compact ? <ProductPill label={item.signalState} tone={item.signalState === "Protected" || item.signalState === "Weak" ? "danger" : item.signalState === "Building" ? "warning" : "success"} /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 16, marginTop: 16 }}>
        <div style={moduleInsetStyle(toneAccent(zeroCostMode.tone), 14)}>
          <div style={sectionLabelStyle()}>Zero-Cost Operating Rule</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{zeroCostMode.label}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{zeroCostMode.detail}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <ProductPill label="Local-first" tone="success" />
            <ProductPill label="Paper execution only" tone="info" />
            <ProductPill label="Demo fallback preserved" tone="neutral" />
          </div>
        </div>
        <div style={moduleInsetStyle("info", 14)}>
          <div style={sectionLabelStyle()}>Autonomy Mode</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{autonomyMode || operatorPolicy.mode}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{operatorPolicy.summary}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <ProductPill label={autonomyDiagnostics.recommendedAction.label} tone={pillTone(autonomyDiagnostics.recommendedAction.tone)} />
            <ProductPill label={autonomyDiagnostics.blockedAction.label} tone={pillTone(autonomyDiagnostics.blockedAction.tone)} />
          </div>
        </div>
        <div style={moduleInsetStyle(toneAccent(lastRecoveryAction?.tone || autonomyDiagnostics.lastRecoveryAction.tone), 14)}>
          <div style={sectionLabelStyle()}>Last Recovery Action</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{(lastRecoveryAction || autonomyDiagnostics.lastRecoveryAction).label}</div>
          <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>{(lastRecoveryAction || autonomyDiagnostics.lastRecoveryAction).detail}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <ProductPill label={(lastRecoveryAction || autonomyDiagnostics.lastRecoveryAction).status} tone={pillTone((lastRecoveryAction || autonomyDiagnostics.lastRecoveryAction).tone)} />
            <ProductPill label={(lastRecoveryAction || autonomyDiagnostics.lastRecoveryAction).time || "--:--"} tone="neutral" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 16, marginTop: 16 }}>
        {adapterPanels.map((adapter) => (
          <div key={adapter.key} style={moduleInsetStyle(toneAccent(adapter.tone), 14)}>
            <div style={sectionLabelStyle()}>{compact ? "Adapter Readiness" : "Adapter Onboarding"}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{adapter.adapterName}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{adapter.capabilitySummary}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <ProductPill label={adapter.validationState} tone={adapter.validationState === "Invalid" ? "danger" : "warning"} />
              <ProductPill label={adapter.readinessState} tone={pillTone(adapter.tone)} />
              <ProductPill label="Connectivity Disabled" tone="neutral" />
            </div>
            <div style={{ ...bodyTextStyle(), marginTop: 12, color: deskTheme.colors.soft }}>{adapter.blockedReason}</div>
            {!compact ? (
              <>
                <div style={{ marginTop: 14 }}><div style={sectionLabelStyle()}>Required Config Fields</div><div style={{ marginTop: 10 }}>{renderChecks(adapter.requiredConfigFields)}</div></div>
                <div style={{ marginTop: 14 }}><div style={sectionLabelStyle()}>Capability Checks</div><div style={{ marginTop: 10 }}>{renderChecks(adapter.capabilityChecks)}</div></div>
                <div style={{ marginTop: 14 }}><div style={sectionLabelStyle()}>Config Validation</div><div style={{ marginTop: 10 }}>{renderChecks(adapter.configValidation)}</div></div>
                <div style={{ ...bodyTextStyle(), marginTop: 12, color: deskTheme.colors.soft }}>Unsupported reason: {adapter.unsupportedReason}</div>
              </>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1.18fr 0.82fr", gap: 16, marginTop: 16 }}>
        <div style={moduleInsetStyle("info", 14)}>
          <div style={sectionLabelStyle()}>Guarded Operator Controls</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>Control Actions</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>Lawful operator-triggered actions with last result, reason, and audit memory.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {controlActions.slice(0, compact ? 3 : controlActions.length).map((action) => {
              const lastResult = guardedActionResults?.[action.key];
              const auditEntry = autonomyAuditLog.find((entry) => entry.key === action.key);
              return (
                <div key={action.key} style={moduleInsetStyle(toneAccent(action.tone), 12)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{action.label}</div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{action.reason}</div>
                    </div>
                    <ProductPill label={action.status} tone={pillTone(action.tone)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
                    <div style={moduleInsetStyle("info", 10)}>
                      <div style={sectionLabelStyle()}>Last Run Result</div>
                      <div style={{ fontWeight: 800, marginTop: 8 }}>{lastResult?.status || "No run recorded"}</div>
                      <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{lastResult?.detail || "No operator result recorded yet."}</div>
                    </div>
                    {!compact ? (
                      <div style={moduleInsetStyle("warning", 10)}>
                        <div style={sectionLabelStyle()}>Audit Entry</div>
                        <div style={{ fontWeight: 800, marginTop: 8 }}>{auditEntry?.time || "--:--"}</div>
                        <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{auditEntry?.detail || "No audit entry recorded yet."}</div>
                      </div>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => runGuardedAction(action.key)} style={{ ...createButton({ tone: action.blocked || action.requiresSupportedAdapter ? "danger" : action.requiresApproval ? "warning" : action.recommended ? "success" : "info" }), justifyContent: "center", width: compact ? "100%" : "fit-content", marginTop: 10 }}>
                    {actionButtonLabel(action)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={moduleInsetStyle("warning", 14)}>
          <div style={sectionLabelStyle()}>Trend and Audit</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{runtimeTrendSummary.readinessDirection}</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{runtimeTrendSummary.summary}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {trendMetrics.slice(0, compact ? 3 : trendMetrics.length).map((metric) => (
              <div key={metric.label} style={{ ...dataRowStyle(), gridTemplateColumns: "1fr 100px" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{metric.label}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{metric.previous === null || metric.previous === undefined ? "No prior checkpoint" : `Previous: ${metric.previous}`}</div>
                </div>
                <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                  <div style={{ ...monoValueStyle(directionTone(metric.direction), 18) }}>{metric.current}</div>
                  <ProductPill label={metric.direction === "baseline" ? "Baseline" : metric.direction === "shifted" ? "Shifted" : metric.direction === "up" ? `Up ${metric.delta}` : metric.direction === "down" ? `Down ${Math.abs(metric.delta)}` : "Stable"} tone={pillTone(directionTone(metric.direction))} />
                </div>
              </div>
            ))}
            {autonomyAuditLog.slice(0, compact ? 2 : 3).map((entry) => (
              <div key={entry.id} style={moduleInsetStyle(toneAccent(entry.tone), 10)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{entry.label}</div>
                  <ProductPill label={entry.status} tone={pillTone(entry.tone)} />
                </div>
                <div style={{ color: deskTheme.colors.soft, marginTop: 6, lineHeight: 1.6 }}>{entry.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={moduleInsetStyle("success", 14)}>
        <div style={sectionLabelStyle()}>{compact ? "Report Summary" : "Exportable Operator Reports"}</div>
        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{compact ? "Local Report Pack" : "Operator Review Pack"}</div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>Autonomy audits, runtime trends, recovery history, recommendation shifts, and connector readiness are prepared for local operator review.</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? 180 : 220}px, 1fr))`, gap: 12, marginTop: 14 }}>
          {reportRows.map((report) => (
            <div key={report.id} style={moduleInsetStyle("info", 12)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{report.label}</div>
                <ProductPill label={`${reportCount(report)} items`} tone="neutral" />
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{report.summary}</div>
              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                {(report.previewLines || []).map((line) => (
                  <div key={line} style={{ ...bodyTextStyle(), color: deskTheme.colors.text }}>{line}</div>
                ))}
              </div>
              {!compact ? (
                <>
                  <div style={{ color: deskTheme.colors.muted, marginTop: 10, fontSize: 12 }}>{report.filename}</div>
                  <button type="button" onClick={() => exportReport(report)} style={{ ...createButton({ tone: "info" }), width: "100%", justifyContent: "center", marginTop: 12 }}>
                    Export Local Report
                  </button>
                </>
              ) : null}
            </div>
          ))}
        </div>
        {!compact && runtimeTrendHistory.length ? (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {runtimeTrendHistory.slice(0, 4).map((row) => (
              <div key={row.id} style={{ ...dataRowStyle(), gridTemplateColumns: "1.2fr 110px 140px" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{row.time} | {row.autonomyMode}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>Recommendation: {row.recommendationLabel} | Recovery count: {row.recoveryCount}</div>
                </div>
                <div style={{ ...monoValueStyle("info", 18), justifySelf: "start" }}>{row.runtimeConfidenceScore}</div>
                <ProductPill label={row.recommendationLabel} tone="info" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
