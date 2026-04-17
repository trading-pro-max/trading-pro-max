import styles from "./TradingTerminal.module.css";
import { cx, toneClassName } from "./trading-terminal-utils";

function DiagnosticCard({ label, value, tone = "neutral" }) {
  return (
    <div className={styles.diagnosticCard}>
      <span>{label}</span>
      <strong className={toneClassName(tone, styles)}>{value}</strong>
    </div>
  );
}

export function TradingTerminalDiagnosticsPanel({ diagnostics }) {
  const readiness = diagnostics.platformReadiness;
  const readinessItems = readiness
    ? [
        { label: "UI State", value: readiness.uiState.label, detail: readiness.uiState.detail, tone: readiness.uiState.tone },
        {
          label: "Data Pipeline",
          value: readiness.dataPipeline.label,
          detail: readiness.dataPipeline.detail,
          tone: readiness.dataPipeline.tone
        },
        {
          label: "Execution Engine",
          value: readiness.executionEngine.label,
          detail: readiness.executionEngine.detail,
          tone: readiness.executionEngine.tone
        },
        {
          label: "Persistence",
          value: readiness.persistence.label,
          detail: readiness.persistence.detail,
          tone: readiness.persistence.tone
        },
        {
          label: "Guardrails",
          value: readiness.guardrails.label,
          detail: readiness.guardrails.detail,
          tone: readiness.guardrails.tone
        },
        {
          label: "Local Readiness",
          value: readiness.overall.label,
          detail: readiness.overall.detail,
          tone: readiness.overall.tone
        }
      ]
    : [];

  return (
    <section className={cx(styles.panel, styles.diagnosticsPanel)}>
      <div className={styles.panelHeaderCompact}>
        <div>
          <div className={styles.panelEyebrow}>Runtime Health Center</div>
          <h3>Health Closure</h3>
        </div>
        <span className={styles.inlineBadge}>{diagnostics.alertState}</span>
      </div>

      <div className={styles.diagnosticGrid}>
        <DiagnosticCard label="Feed Freshness" value={diagnostics.feedFreshness} tone={diagnostics.feedFreshness === "Fresh" ? "positive" : "warning"} />
        <DiagnosticCard label="Provider" value={diagnostics.providerHealth} tone="positive" />
        <DiagnosticCard label="Quote Sync" value={diagnostics.quoteSyncState} tone="warning" />
        <DiagnosticCard label="Candle Sync" value={diagnostics.candleSyncState} tone="warning" />
        <DiagnosticCard label="Execution" value={diagnostics.executionEngine} tone={diagnostics.executionEngine === "Ready" ? "positive" : "warning"} />
        <DiagnosticCard label="Persistence" value={diagnostics.persistenceStatus} tone="positive" />
        <DiagnosticCard label="Integrity" value={diagnostics.sessionIntegrity} tone={diagnostics.sessionIntegrity === "Nominal" ? "positive" : "warning"} />
        <DiagnosticCard label="Explainability" value={diagnostics.explainability} tone="neutral" />
        <DiagnosticCard label="Runtime" value={diagnostics.runtimeHealth} tone="positive" />
      </div>

      {readinessItems.length ? (
        <div className={styles.readinessBlock}>
          <div className={styles.panelHeaderCompact}>
            <div>
              <div className={styles.panelEyebrow}>Platform Readiness</div>
              <h3>Operator Closure</h3>
            </div>
            <span className={styles.inlineBadge}>{readiness.overall.label}</span>
          </div>

          <div className={styles.summaryGrid}>
            {readinessItems.map((item) => (
              <div key={item.label} className={styles.summaryCell}>
                <span>{item.label}</span>
                <strong className={toneClassName(item.tone, styles)}>{item.value}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.alertBlock}>
        <h4>Issues</h4>
        {(diagnostics.issues.length ? diagnostics.issues : [{ label: "Nominal", detail: "No active runtime issues were detected.", action: "Maintain operator discipline." }]).map((item) => (
          <div key={`${item.label}-${item.action}`} className={styles.alertIssue}>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
            <small>{item.action}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
