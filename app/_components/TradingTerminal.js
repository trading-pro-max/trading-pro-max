"use client";

import { startTransition } from "react";
import styles from "./TradingTerminal.module.css";
import { TradingTerminalActivityZone } from "./TradingTerminalActivityZone";
import { TradingTerminalChartWorkspace } from "./TradingTerminalChartWorkspace";
import { TradingTerminalConnectorPanel } from "./TradingTerminalConnectorPanel";
import { TradingTerminalControlCenter } from "./TradingTerminalControlCenter";
import { TradingTerminalDiagnosticsPanel } from "./TradingTerminalDiagnosticsPanel";
import { TradingTerminalExecutionPanel } from "./TradingTerminalExecutionPanel";
import { TradingTerminalIntelligencePanel } from "./TradingTerminalIntelligencePanel";
import { TradingTerminalOperatorAssistantPanel } from "./TradingTerminalOperatorAssistantPanel";
import { TradingTerminalSidebar } from "./TradingTerminalSidebar";
import { TradingTerminalTopbar } from "./TradingTerminalTopbar";
import { TradingTerminalWatchlistPanel } from "./TradingTerminalWatchlistPanel";
import { useTradingTerminalLiveState } from "./useTradingTerminalLiveState";

export function TradingTerminal({ data }) {
  const {
    state,
    seed,
    snapshot,
    status,
    currentMarket,
    currentView,
    diagnostics,
    intelligence,
    operatorAssistant,
    controlCenter,
    connectorReadiness,
    validation,
    positions,
    filteredMarkets,
    searchInputRef,
    activityTabs,
    actions
  } =
    useTradingTerminalLiveState(data);

  const currentSection = seed.sections.find((item) => item.id === state.activeSection) || seed.sections[0];
  const favorites = state.favorites;
  const sortedMarkets = [...snapshot.watchlist].sort((left, right) => {
    const favoriteScore = Number(Boolean(favorites[right.symbol])) - Number(Boolean(favorites[left.symbol]));
    if (favoriteScore !== 0) return favoriteScore;
    return left.symbol.localeCompare(right.symbol);
  });

  const topbarConnection = {
    state: snapshot.provider.connectionState,
    latencyMs: state.telemetry.latencyMs,
    sequence: state.telemetry.sequence,
    feed: `${snapshot.provider.label} | ${snapshot.provider.feedHealth}`
  };

  const topbarStatusTiles = [
    {
      label: "Last",
      value: currentView.last,
      detail: `${currentView.change} | ${currentView.label}`,
      tone: currentView.rawChange >= 0 ? "positive" : "negative"
    },
    {
      label: "Runtime",
      value: diagnostics.runtimeHealth,
      detail: `${diagnostics.alertState} | ${diagnostics.sessionIntegrity}`,
      tone: diagnostics.alertState === "Nominal" ? "positive" : "warning"
    },
    {
      label: "Opportunity",
      value: `${intelligence.opportunityScore}`,
      detail: `${intelligence.confidence}% confidence | ${intelligence.bias}`,
      tone: intelligence.bias === "Balanced" ? "warning" : "positive"
    },
    {
      label: "Risk Score",
      value: `${intelligence.riskScore}`,
      detail: `${diagnostics.guardrail} | ${diagnostics.sessionRisk}`,
      tone: intelligence.riskScore >= 70 ? "warning" : "neutral"
    },
    {
      label: "Feed",
      value: `${topbarConnection.latencyMs} ms`,
      detail: `${topbarConnection.feed} | ${topbarConnection.sequence}`,
      tone: topbarConnection.latencyMs > 28 ? "warning" : "positive"
    },
    {
      label: "Journal",
      value: String(snapshot.decisionJournal.length),
      detail: `${state.recommendationHistory.length} recommendations`,
      tone: "neutral"
    }
  ];

  const activitySummary = [
    { label: "Net PnL", value: diagnostics.pnl, tone: diagnostics.pnl.startsWith("-") ? "negative" : "positive" },
    { label: "Open Risk", value: diagnostics.sessionRisk, tone: "warning" },
    { label: "Positions", value: String(positions.length), tone: "positive" },
    { label: "Pending", value: String(state.pendingOrders.length), tone: "neutral" },
    { label: "Health", value: diagnostics.alertState, tone: diagnostics.alertState === "Nominal" ? "positive" : "warning" }
  ];

  return (
    <main className={styles.terminal}>
      <TradingTerminalSidebar
        brand={seed.brand}
        sections={seed.sections}
        activeSection={state.activeSection}
        releaseGate="LOCAL_PAPER_BUILD"
        runtimeHealth={diagnostics.runtimeHealth}
        onSectionSelect={(section) => startTransition(() => actions.setSection(section))}
      />

      <section className={styles.workspace}>
        <TradingTerminalTopbar
          section={currentSection}
          market={currentMarket}
          marketView={currentView}
          accountMode={state.accountMode}
          accountModes={seed.execution.accountModes}
          notifications={state.notifications}
          connection={topbarConnection}
          sessionState={snapshot.session.state}
          sessionBias={snapshot.session.bias}
          runtimeAlert={diagnostics.alertState}
          statusTiles={topbarStatusTiles}
          searchQuery={state.searchQuery}
          filteredMarkets={filteredMarkets}
          searchOpen={state.searchOpen}
          searchInputRef={searchInputRef}
          onSearchQueryChange={actions.setSearchQuery}
          onSearchOpen={actions.setSearchOpen}
          onMarketSelect={(symbol) => startTransition(() => actions.setSymbol(symbol))}
          onAccountModeChange={actions.setAccountMode}
        />

        <div className={styles.layout}>
          <div className={styles.coreRow}>
            <aside className={styles.marketRail}>
              <TradingTerminalWatchlistPanel
                markets={sortedMarkets}
                selectedSymbol={state.selectedSymbol}
                favorites={state.favorites}
                heatCards={snapshot.marketHeat}
                provider={snapshot.provider}
                onMarketSelect={(symbol) => startTransition(() => actions.setSymbol(symbol))}
                onToggleFavorite={actions.toggleFavorite}
              />
            </aside>

            <div className={styles.chartColumn}>
              <TradingTerminalChartWorkspace
                market={currentMarket}
                view={currentView}
                chartConfig={seed.chart}
                indicators={state.indicators}
                chartStatus={status}
                provider={snapshot.provider}
                selectedPanelTab={state.selectedPanelTab}
                activeTool={state.activeTool}
                onTimeframeChange={(timeframe) => startTransition(() => actions.setTimeframe(timeframe))}
                onIndicatorToggle={actions.toggleIndicator}
                onPanelTabChange={actions.setPanelTab}
                onToolChange={actions.setTool}
              />
            </div>

            <aside className={styles.executionRail}>
              <TradingTerminalExecutionPanel
                market={currentMarket}
                accountMode={state.accountMode}
                liveConfirmed={state.liveConfirmed}
                orderDraft={state.orderDraft}
                executionConfig={seed.execution}
                validation={validation}
                notice={state.tradeNotice}
                account={snapshot.account}
                onAccountModeChange={actions.setAccountMode}
                onLiveConfirmedChange={actions.setLiveConfirmed}
                onFieldChange={actions.setOrderField}
                onSideChange={actions.setSide}
                onSubmit={actions.submitOrder}
              />

              <div className={styles.rightRailStack}>
                <TradingTerminalIntelligencePanel market={currentMarket} intelligence={intelligence} />
                <TradingTerminalOperatorAssistantPanel assistant={operatorAssistant} />
                <TradingTerminalDiagnosticsPanel diagnostics={diagnostics} provider={snapshot.provider} chart={currentView} />
                <TradingTerminalControlCenter
                  controlCenter={controlCenter}
                  accountMode={state.accountMode}
                  providerKey={snapshot.desk.providerKey}
                  riskDraft={state.riskDraft}
                  pendingAction={state.pendingControlAction}
                  actionLoading={status.actionLoading}
                  onAccountModeChange={actions.setAccountMode}
                  onProviderChange={actions.setProviderKey}
                  onRefreshPolicyChange={actions.setRefreshPolicy}
                  onRiskFieldChange={actions.setRiskField}
                  onSaveRiskSettings={actions.saveRiskSettings}
                  onArmAction={actions.armControlAction}
                  onClearAction={actions.clearControlAction}
                  onExecuteAction={actions.executeControlAction}
                />
                <TradingTerminalConnectorPanel connectors={connectorReadiness} />
              </div>
            </aside>
          </div>

          <TradingTerminalActivityZone
            selectedTab={state.selectedActivityTab}
            tabs={activityTabs}
            positions={positions}
            pendingOrders={state.pendingOrders}
            fills={state.fills}
            decisionJournal={state.decisionJournal}
            activityLog={state.activityLog}
            auditTrail={state.auditTrail}
            summary={activitySummary}
            onTabChange={actions.setActivityTab}
            onFillPending={actions.fillPendingOrder}
            onCancelPending={actions.cancelPendingOrder}
            onClosePosition={actions.closePosition}
          />
        </div>
      </section>
    </main>
  );
}
