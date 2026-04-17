import styles from "./TradingTerminal.module.css";
import { cx, formatCurrency, toneClassName } from "./trading-terminal-utils";

function Field({ label, children }) {
  return (
    <label className={styles.fieldWrap}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SummaryCell({ label, value, tone = "neutral" }) {
  return (
    <div className={styles.summaryCell}>
      <span>{label}</span>
      <strong className={toneClassName(tone, styles)}>{value}</strong>
    </div>
  );
}

export function TradingTerminalExecutionPanel({
  market,
  accountMode,
  liveConfirmed,
  orderDraft,
  executionConfig,
  validation,
  notice,
  account,
  onAccountModeChange,
  onLiveConfirmedChange,
  onFieldChange,
  onSideChange,
  onSubmit
}) {
  const isPaper = accountMode === "Paper";

  return (
    <aside className={cx(styles.panel, styles.executionPanel)}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelEyebrow}>Right Execution Panel</div>
          <h2>Execution Ticket</h2>
          <p>{isPaper ? "Paper routing is active. Orders simulate with mark-aware fills, pending triggers, and portfolio updates." : "Preview mode stays locked for future broker integration. No live routing is available in this local-safe build."}</p>
        </div>
        <span className={cx(styles.executionModePill, isPaper ? styles.paperMode : styles.liveMode)}>
          {accountMode} mode
        </span>
      </div>

      <div className={styles.executionModeSwitch}>
        {executionConfig.accountModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onAccountModeChange(mode)}
            className={cx(styles.modeButton, accountMode === mode && styles.modeButtonActive, mode !== "Paper" && styles.liveButton)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className={cx(styles.executionBanner, isPaper ? styles.executionBannerPaper : styles.executionBannerLive)}>
        <strong>{isPaper ? "Paper Simulation" : "Broker Preview Lock"}</strong>
        <span>{isPaper ? "Orders update local account, positions, fills, diagnostics, and persistence." : "Preview mode is visible for future integration planning but execution is hard-blocked."}</span>
      </div>

      <div className={styles.summaryGrid}>
        <SummaryCell label="Balance" value={account.balanceText} />
        <SummaryCell label="Equity" value={account.equityText} />
        <SummaryCell label="Free Margin" value={account.freeMarginText} />
        <SummaryCell label="Session PnL" value={account.sessionPnlText} tone={account.sessionPnl >= 0 ? "positive" : "warning"} />
      </div>

      <form className={styles.executionForm} onSubmit={onSubmit}>
        <div className={styles.sideToggle}>
          {["Buy", "Sell"].map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => onSideChange(side)}
              className={cx(styles.sideButton, orderDraft.side === side && (side === "Buy" ? styles.buyActive : styles.sellActive))}
            >
              {side}
            </button>
          ))}
        </div>

        <div className={styles.executionFieldGrid}>
          <Field label="Order Type">
            <select value={orderDraft.type} onChange={(event) => onFieldChange("type", event.target.value)} className={styles.field}>
              {executionConfig.orderTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Time in Force">
            <select value={orderDraft.tif} onChange={(event) => onFieldChange("tif", event.target.value)} className={styles.field}>
              {executionConfig.tif.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Symbol">
            <div className={styles.readonlyField}>{market.symbol}</div>
          </Field>

          <Field label="Route">
            <div className={styles.readonlyField}>{market.route}</div>
          </Field>

          <Field label="Quantity / Size">
            <input value={orderDraft.quantity} onChange={(event) => onFieldChange("quantity", event.target.value)} className={styles.field} />
          </Field>

          <Field label="Leverage">
            <input value={orderDraft.leverage} onChange={(event) => onFieldChange("leverage", event.target.value)} className={styles.field} />
          </Field>

          <Field label="Entry">
            <input value={orderDraft.entry} onChange={(event) => onFieldChange("entry", event.target.value)} className={styles.field} />
          </Field>

          <Field label="Risk Amount">
            <input value={orderDraft.riskAmount} onChange={(event) => onFieldChange("riskAmount", event.target.value)} className={styles.field} />
          </Field>

          <Field label="Stop Loss">
            <input value={orderDraft.stopLoss} onChange={(event) => onFieldChange("stopLoss", event.target.value)} className={styles.field} />
          </Field>

          <Field label="Take Profit">
            <input value={orderDraft.takeProfit} onChange={(event) => onFieldChange("takeProfit", event.target.value)} className={styles.field} />
          </Field>
        </div>

        <div className={styles.validationBlock}>
          <h3>Validation States</h3>
          {validation.items.map((item) => (
            <div key={item.label} className={cx(styles.validationItem, item.ok ? styles.validationOk : styles.validationWarn)}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </div>
          ))}
          {validation.warnings?.map((item) => (
            <div key={item} className={cx(styles.validationItem, styles.validationWarn)}>
              <strong>Warning</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className={styles.executionSummary}>
          <h3>Execution Summary</h3>
          <div className={styles.summaryGrid}>
            <SummaryCell label="Notional" value={formatCurrency(validation.metrics.notional)} />
            <SummaryCell label="Margin" value={formatCurrency(validation.metrics.margin)} />
            <SummaryCell label="Max Loss" value={formatCurrency(validation.metrics.maxLoss)} tone="warning" />
            <SummaryCell label="R:R" value={`${validation.metrics.rrRatio.toFixed(2)}R`} tone={validation.metrics.rrRatio >= 2 ? "positive" : "warning"} />
            <SummaryCell label="Symbol Exposure" value={formatCurrency(validation.metrics.symbolExposure)} />
            <SummaryCell label="Loss Budget Left" value={formatCurrency(validation.metrics.remainingLossBudget)} tone={validation.metrics.remainingLossBudget > 0 ? "positive" : "warning"} />
          </div>
        </div>

        <label className={styles.liveConfirm}>
          <input
            type="checkbox"
            checked={liveConfirmed}
            onChange={(event) => onLiveConfirmedChange(event.target.checked)}
            disabled={isPaper}
          />
          <span>I understand preview mode is visible for future broker integration, but locked in this paper-only build.</span>
        </label>

        <button
          type="submit"
          disabled={!validation.items.every((item) => item.ok) || validation.hardBlocks.length > 0 || !isPaper}
          className={cx(styles.submitButton, (!validation.items.every((item) => item.ok) || validation.hardBlocks.length > 0 || !isPaper) && styles.submitButtonDisabled)}
        >
          {isPaper ? "Stage Paper Order" : "Preview Locked"}
        </button>

        <div className={styles.tradeConfirmation}>
          <h3>Trade Confirmation Zone</h3>
          <p>{notice || "No order has been routed yet. The confirmation stream will appear here."}</p>
          {validation.hardBlocks?.length ? (
            <div className={styles.guardrailStack}>
              {validation.hardBlocks.map((item) => (
                <div key={item} className={cx(styles.validationItem, styles.validationWarn)}>
                  <strong>Hard Block</strong>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </form>
    </aside>
  );
}
