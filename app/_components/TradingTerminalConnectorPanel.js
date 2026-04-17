import styles from "./TradingTerminal.module.css";
import { cx } from "./trading-terminal-utils";

export function TradingTerminalConnectorPanel({ connectors }) {
  return (
    <section className={cx(styles.panel, styles.connectorPanel)}>
      <div className={styles.panelHeaderCompact}>
        <div>
          <div className={styles.panelEyebrow}>Connector Readiness Framework</div>
          <h3>Integration Readiness</h3>
        </div>
        <span className={styles.inlineBadge}>Readiness only</span>
      </div>

      <div className={styles.connectorList}>
        {connectors.map((connector) => (
          <div key={connector.id} className={styles.connectorCard}>
            <div className={styles.connectorHeader}>
              <strong>{connector.label}</strong>
              <span className={styles.inlineBadge}>{connector.validationState}</span>
            </div>
            <small>{connector.configured ? "Configured" : "Not configured"}</small>
            <div className={styles.connectorSummary}>
              {connector.capabilitySummary.map((item) => (
                <div key={item} className={styles.reasonItem}>
                  {item}
                </div>
              ))}
            </div>
            {connector.missingFields.length ? (
              <div className={styles.connectorMeta}>
                <span>Missing</span>
                <p>{connector.missingFields.join(", ")}</p>
              </div>
            ) : null}
            {connector.blockedReason ? (
              <div className={styles.connectorMeta}>
                <span>Blocked</span>
                <p>{connector.blockedReason}</p>
              </div>
            ) : null}
            {connector.unsupportedReason ? (
              <div className={styles.connectorMeta}>
                <span>Unsupported</span>
                <p>{connector.unsupportedReason}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
