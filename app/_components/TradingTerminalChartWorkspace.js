import styles from "./TradingTerminal.module.css";
import { buildChartModel, cx, toneClassName } from "./trading-terminal-utils";

function StatPill({ label, value }) {
  return (
    <div className={styles.statPill}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getPanelItems(panelTab, market, view, provider) {
  if (panelTab === "Volume") {
    return [
      { label: "Volume", value: view.volume, tone: "positive" },
      { label: "Liquidity", value: market.liquidity, tone: "neutral" },
      { label: "Feed", value: provider.feedHealth, tone: "warning" }
    ];
  }

  if (panelTab === "Order Flow") {
    return [
      { label: "Bias", value: market.intelligence.bias, tone: "positive" },
      { label: "Imbalance", value: view.imbalance, tone: view.rawChange >= 0 ? "positive" : "negative" },
      { label: "Catalyst", value: market.catalyst, tone: "neutral" }
    ];
  }

  if (panelTab === "Correlation") {
    return [
      { label: "Correlation", value: market.correlation, tone: "neutral" },
      { label: "Regime", value: market.intelligence.regime, tone: "warning" },
      { label: "Volatility", value: market.intelligence.volatilityState, tone: "warning" }
    ];
  }

  return [
    { label: "Order Flow", value: market.intelligence.bias, tone: view.rawChange >= 0 ? "positive" : "negative" },
    { label: "Liquidity", value: market.liquidity, tone: "neutral" },
    { label: "Correlation", value: market.correlation, tone: "neutral" }
  ];
}

export function TradingTerminalChartWorkspace({
  market,
  view,
  chartConfig,
  indicators,
  chartStatus,
  provider,
  selectedPanelTab,
  activeTool,
  onTimeframeChange,
  onIndicatorToggle,
  onPanelTabChange,
  onToolChange
}) {
  const chartModel = buildChartModel(view.candles, indicators);
  const panelItems = getPanelItems(selectedPanelTab, market, view, provider);

  return (
    <section className={cx(styles.panel, styles.chartPanel)}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelEyebrow}>Chart Workspace</div>
          <div className={styles.chartHeadline}>
            <h2>{market.symbol}</h2>
            <span className={cx(styles.priceMove, view.rawChange >= 0 ? styles.positiveTone : styles.negativeTone)}>
              {view.last} {view.change}
            </span>
          </div>
          <p>{market.note}</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.inlineBadge}>{market.category}</span>
          <span className={styles.inlineBadge}>{view.label}</span>
          <span className={styles.inlineBadge}>{view.sourceLabel}</span>
          <span className={styles.inlineBadge}>{view.syncState}</span>
          <span className={cx(styles.inlineBadge, view.freshness === "Fresh" ? styles.positiveBadge : styles.warningBadge)}>{view.freshness}</span>
          <span className={cx(styles.inlineBadge, styles.positiveBadge)}>{market.intelligence.confidence}% confidence</span>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.segmentGroup}>
          {chartConfig.timeframes.map((frame) => (
            <button
              key={frame}
              type="button"
              onClick={() => onTimeframeChange(frame)}
              className={cx(styles.segmentButton, view.key === frame && styles.segmentButtonActive)}
            >
              {frame}
            </button>
          ))}
        </div>

        <div className={styles.segmentGroup}>
          {chartConfig.indicators.map((indicator) => (
            <button
              key={indicator}
              type="button"
              onClick={() => onIndicatorToggle(indicator)}
              className={cx(styles.segmentButton, indicators[indicator] && styles.segmentButtonActive)}
            >
              {indicator}
            </button>
          ))}
        </div>

        <div className={styles.segmentGroup}>
          {chartConfig.tools.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => onToolChange(tool)}
              className={cx(styles.segmentButton, activeTool === tool && styles.segmentButtonActive)}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.marketStatsStrip}>
        {view.statsStrip.map((stat) => (
          <StatPill key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className={styles.chartCanvas}>
        {chartStatus.chartLoading ? <div className={styles.chartStatusOverlay}>Refreshing live candles...</div> : null}
        {chartStatus.chartError ? <div className={styles.chartStatusBanner}>Holding the last valid candle set while the chart lane reconnects.</div> : null}
        <svg viewBox={`0 0 ${chartModel.width} ${chartModel.height}`} className={styles.chartSvg} aria-label={`${market.symbol} candlestick chart`}>
          {chartModel.gridLines.map((line) => (
            <g key={line.label}>
              <line x1="0" y1={line.y} x2="940" y2={line.y} className={styles.chartGrid} />
              <text x="874" y={line.y - 6} className={styles.chartLabel}>
                {line.label}
              </text>
            </g>
          ))}

          {chartModel.indicatorPaths.map((indicatorPath) => (
            <path key={indicatorPath.key} d={indicatorPath.path} className={styles[indicatorPath.className]} />
          ))}

          {chartModel.volumeBars.map((bar, index) => (
            <rect
              key={`volume-${index}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              className={bar.up ? styles.volumeUp : styles.volumeDown}
            />
          ))}

          {chartModel.wickLines.map((line, index) => (
            <line
              key={`wick-${index}`}
              x1={line.x}
              y1={line.y1}
              x2={line.x}
              y2={line.y2}
              className={line.up ? styles.wickUp : styles.wickDown}
            />
          ))}

          {chartModel.candleBars.map((bar, index) => (
            <rect
              key={`candle-${index}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx="2"
              className={bar.up ? styles.candleUp : styles.candleDown}
            />
          ))}

          <line x1="0" y1={chartModel.currentPriceY} x2="940" y2={chartModel.currentPriceY} className={styles.currentPriceLine} />
          <text x="816" y={chartModel.currentPriceY - 8} className={styles.currentPriceLabel}>
            {chartModel.currentPrice}
          </text>

          {chartModel.timeLabels.map((item) => (
            <text key={`${item.label}-${item.x}`} x={item.x} y="414" className={styles.chartTimeLabel}>
              {item.label}
            </text>
          ))}
        </svg>
      </div>

      <div className={styles.panelFooter}>
        <div className={styles.panelTabs}>
          {chartConfig.panelTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onPanelTabChange(tab)}
              className={cx(styles.panelTab, selectedPanelTab === tab && styles.panelTabActive)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.miniPanelGrid}>
          {panelItems.map((panel) => (
            <div key={panel.label} className={styles.miniPanel}>
              <span>{panel.label}</span>
              <strong className={toneClassName(panel.tone, styles)}>{panel.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
