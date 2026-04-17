import styles from "./TradingTerminal.module.css";
import { cx, toneClassName } from "./trading-terminal-utils";

function ReasonList({ title, items, tone }) {
  return (
    <div className={styles.reasonList}>
      <h4>{title}</h4>
      {items.map((item) => (
        <div key={item} className={cx(styles.reasonItem, toneClassName(tone, styles))}>
          {item}
        </div>
      ))}
    </div>
  );
}

function BreakdownItem({ item }) {
  return (
    <div className={styles.breakdownItem}>
      <div className={styles.breakdownHead}>
        <span>{item.label}</span>
        <strong className={toneClassName(item.tone, styles)}>{item.value}</strong>
      </div>
      <small>{item.detail}</small>
    </div>
  );
}

export function TradingTerminalIntelligencePanel({ market, intelligence }) {
  return (
    <section className={cx(styles.panel, styles.intelligencePanel)}>
      <div className={styles.panelHeaderCompact}>
        <div>
          <div className={styles.panelEyebrow}>Explainability Engine</div>
          <h3>Decision Snapshot</h3>
        </div>
        <span className={cx(styles.inlineBadge, intelligence.riskScore >= 70 ? styles.warningBadge : styles.positiveBadge)}>
          {intelligence.confidence}%
        </span>
      </div>

      <div className={styles.intelligenceHero}>
        <div className={styles.confidenceRing}>
          <strong>{intelligence.confidence}%</strong>
          <span>confidence</span>
        </div>
        <div>
          <p className={styles.intelligenceHeadline}>{intelligence.headline}</p>
          <div className={styles.intelligenceMeta}>
            <span>Bias: {intelligence.bias}</span>
            <span>Momentum: {intelligence.momentumState}</span>
            <span>Volatility: {intelligence.volatilityState}</span>
            <span>Structure: {intelligence.structureState}</span>
          </div>
        </div>
      </div>

      <div className={styles.scoreRow}>
        <div className={styles.scoreCard}>
          <span>Opportunity</span>
          <strong className={styles.positiveTone}>{intelligence.opportunityScore}</strong>
        </div>
        <div className={styles.scoreCard}>
          <span>Risk Score</span>
          <strong className={intelligence.riskScore >= 70 ? styles.warningTone : styles.neutralTone}>{intelligence.riskScore}</strong>
        </div>
        <div className={styles.scoreCard}>
          <span>Regime</span>
          <strong>{intelligence.regime}</strong>
        </div>
      </div>

      <div className={styles.breakdownGrid}>
        {intelligence.confidenceBreakdown.map((item) => (
          <BreakdownItem key={item.label} item={item} />
        ))}
      </div>

      <div className={styles.reasonGrid}>
        <ReasonList title="Why Trade" items={intelligence.whyTrade} tone="positive" />
        <ReasonList title="Why Not" items={intelligence.whyNot} tone="warning" />
      </div>

      <div className={styles.changeWidget}>
        <h4>What Changed</h4>
        {intelligence.whatChanged.map((item) => (
          <div key={item} className={styles.changeItem}>
            {item}
          </div>
        ))}
      </div>

      <div className={styles.reasonGrid}>
        <ReasonList title="Invalidation Factors" items={intelligence.invalidationFactors} tone="warning" />
        <ReasonList title="Risk Flags" items={intelligence.warnings.length ? intelligence.warnings : ["No active operator risk flags."]} tone="warning" />
      </div>

      <div className={styles.intelligenceFooter}>
        <span className={styles.inlineBadge}>{market.symbol}</span>
        <span className={styles.inlineBadge}>{market.nextEvent}</span>
        <span className={styles.inlineBadge}>{intelligence.summary}</span>
      </div>
    </section>
  );
}
