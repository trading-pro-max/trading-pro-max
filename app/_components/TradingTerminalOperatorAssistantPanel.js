import styles from "./TradingTerminal.module.css";
import { cx, toneClassName } from "./trading-terminal-utils";

export function TradingTerminalOperatorAssistantPanel({ assistant }) {
  return (
    <section className={cx(styles.panel, styles.assistantPanel)}>
      <div className={styles.panelHeaderCompact}>
        <div>
          <div className={styles.panelEyebrow}>Autonomous Operator Assistance</div>
          <h3>Operator Assistant</h3>
        </div>
        <span className={styles.inlineBadge}>{assistant.recommendations.length} active</span>
      </div>

      <p className={styles.intelligenceHeadline}>{assistant.headline}</p>

      <div className={styles.recommendationBlock}>
        <h4>Active Recommendations</h4>
        {assistant.recommendations.map((item) => (
          <div key={item.code} className={cx(styles.recommendationItem, toneClassName(item.severity, styles))}>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <small>{item.action}</small>
          </div>
        ))}
      </div>

      <div className={styles.changeWidget}>
        <h4>What Changed</h4>
        {assistant.whatChanged.map((item) => (
          <div key={item} className={styles.changeItem}>
            {item}
          </div>
        ))}
      </div>

      <div className={styles.recommendationBlock}>
        <h4>Recommendation History</h4>
        {assistant.history.map((item) => (
          <div key={`${item.id}-${item.timeText}`} className={styles.recommendationHistoryItem}>
            <strong>{item.title}</strong>
            <span>{item.timeText}</span>
            <small>{item.action}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
