import styles from "./TradingTerminal.module.css";
import { cx } from "./trading-terminal-utils";

function displayTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "No operator actions yet.";
}

function Field({ label, children }) {
  return (
    <label className={styles.fieldWrap}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TradingTerminalControlCenter({
  controlCenter,
  accountMode,
  providerKey,
  riskDraft,
  pendingAction,
  actionLoading,
  onAccountModeChange,
  onProviderChange,
  onRefreshPolicyChange,
  onRiskFieldChange,
  onSaveRiskSettings,
  onArmAction,
  onClearAction,
  onExecuteAction
}) {
  return (
    <section className={cx(styles.panel, styles.controlPanel)}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelEyebrow}>Operator Control Center</div>
          <h2>Session Control Surface</h2>
          <p>{controlCenter.modeState.summary}</p>
        </div>
        <span className={styles.executionModePill}>{controlCenter.session.sessionId}</span>
      </div>

      <div className={styles.controlGrid}>
        <Field label="Mode State">
          <select value={accountMode} onChange={(event) => onAccountModeChange(event.target.value)} className={styles.field}>
            <option value="Paper">Paper</option>
            <option value="Preview">Live-ready Preview</option>
          </select>
        </Field>

        <Field label="Provider">
          <select value={providerKey} onChange={(event) => onProviderChange(event.target.value)} className={styles.field}>
            {controlCenter.providerSelection.options.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Refresh Policy">
          <select value={controlCenter.refreshPolicy.key} onChange={(event) => onRefreshPolicyChange(event.target.value)} className={styles.field}>
            <option value="Fast">Fast</option>
            <option value="Balanced">Balanced</option>
            <option value="Deliberate">Deliberate</option>
          </select>
        </Field>

        <Field label="Recovery State">
          <div className={styles.readonlyField}>
            {controlCenter.session.recoveryAvailable ? `Checkpoint ${controlCenter.session.recoveryReason || "ready"}` : "No checkpoint"}
          </div>
        </Field>
      </div>

      <div className={styles.controlMetaGrid}>
        <div className={styles.summaryCell}>
          <span>Refresh</span>
          <strong>{controlCenter.refreshPolicy.label}</strong>
          <small>{controlCenter.refreshPolicy.description}</small>
        </div>
        <div className={styles.summaryCell}>
          <span>Last Action</span>
          <strong>{controlCenter.session.lastAction || "None"}</strong>
          <small>{displayTime(controlCenter.session.lastRecoveredAt || controlCenter.session.lastResetAt)}</small>
        </div>
      </div>

      <div className={styles.validationBlock}>
        <h3>Risk Governance</h3>
        <div className={styles.executionFieldGrid}>
          <Field label="Max Position">
            <input value={riskDraft.maxPaperPositionNotional} onChange={(event) => onRiskFieldChange("maxPaperPositionNotional", event.target.value)} className={styles.field} />
          </Field>
          <Field label="Max Symbol Exposure">
            <input value={riskDraft.maxSymbolExposure} onChange={(event) => onRiskFieldChange("maxSymbolExposure", event.target.value)} className={styles.field} />
          </Field>
          <Field label="Max Session Exposure">
            <input value={riskDraft.maxSessionExposure} onChange={(event) => onRiskFieldChange("maxSessionExposure", event.target.value)} className={styles.field} />
          </Field>
          <Field label="Max Session Loss">
            <input value={riskDraft.maxSessionLoss} onChange={(event) => onRiskFieldChange("maxSessionLoss", event.target.value)} className={styles.field} />
          </Field>
          <Field label="Stop-Loss Policy">
            <select value={riskDraft.stopLossPolicy} onChange={(event) => onRiskFieldChange("stopLossPolicy", event.target.value)} className={styles.field}>
              <option value="required">Required</option>
              <option value="warn-only">Warn-only</option>
            </select>
          </Field>
          <Field label="Duplicate Orders">
            <select value={String(riskDraft.preventDuplicateOrders)} onChange={(event) => onRiskFieldChange("preventDuplicateOrders", event.target.value === "true")} className={styles.field}>
              <option value="true">Block</option>
              <option value="false">Allow</option>
            </select>
          </Field>
          <Field label="Conflicting Orders">
            <select value={String(riskDraft.preventConflictingOrders)} onChange={(event) => onRiskFieldChange("preventConflictingOrders", event.target.value === "true")} className={styles.field}>
              <option value="true">Block</option>
              <option value="false">Allow</option>
            </select>
          </Field>
          <Field label="Preview Lock">
            <select value={String(riskDraft.blockPreviewExecution)} onChange={(event) => onRiskFieldChange("blockPreviewExecution", event.target.value === "true")} className={styles.field}>
              <option value="true">Locked</option>
              <option value="false">Unlocked</option>
            </select>
          </Field>
        </div>
        <button type="button" onClick={onSaveRiskSettings} className={styles.rowAction}>
          Save Risk Policy
        </button>
      </div>

      <div className={styles.controlActionList}>
        {controlCenter.actions.map((item) => (
          <div key={item.id} className={styles.controlActionCard}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
            <div className={styles.rowActionGroup}>
              {pendingAction === item.id ? (
                <>
                  <button type="button" onClick={() => onExecuteAction(item.id)} className={cx(styles.rowAction, styles[`${item.danger}Action`])} disabled={actionLoading}>
                    Confirm
                  </button>
                  <button type="button" onClick={onClearAction} className={styles.rowAction}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => onArmAction(item.id)} className={cx(styles.rowAction, styles[`${item.danger}Action`])} disabled={actionLoading}>
                  Arm
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
