import styles from "./TradingTerminal.module.css";
import { cx, toneClassName } from "./trading-terminal-utils";

function badgeToneClass(tone) {
  if (tone === "positive") return styles.positiveBadge;
  if (tone === "warning") return styles.warningBadge;
  if (tone === "danger") return styles.dangerBadge;
  return "";
}

function checkStatusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "warn") return "Warn";
  if (status === "fail") return "Fail";
  if (status === "pending") return "Pending";
  return "Info";
}

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
              <div>
                <strong>{connector.name}</strong>
                <small className={styles.connectorCaption}>
                  {connector.configured ? "Configured" : "Not configured"} | Last validation {connector.lastValidationLabel}
                </small>
              </div>
              <div className={styles.connectorBadgeRow}>
                <span className={styles.inlineBadge}>{connector.category}</span>
                <span className={cx(styles.inlineBadge, badgeToneClass(connector.readinessTone))}>{connector.readinessLabel}</span>
              </div>
            </div>

            <div className={styles.connectorSummary}>
              {connector.capabilitySummary.map((item) => (
                <div key={item} className={styles.reasonItem}>
                  {item}
                </div>
              ))}
            </div>

            <div className={styles.connectorCheckList}>
              {connector.validationChecks.map((item) => (
                <div key={`${connector.id}-${item.label}`} className={styles.connectorCheck}>
                  <div className={styles.connectorCheckHead}>
                    <span>{item.label}</span>
                    <strong className={toneClassName(item.tone, styles)}>{checkStatusLabel(item.status)}</strong>
                  </div>
                  <small>{item.detail}</small>
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
            <div className={styles.connectorMeta}>
              <span>Operator</span>
              <p>{connector.operatorRecommendation}</p>
            </div>
            <div className={styles.connectorSafeNotice}>
              <span>Local-Safe Mode</span>
              <p>{connector.localSafeNotice}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
