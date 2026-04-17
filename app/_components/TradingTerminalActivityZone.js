import styles from "./TradingTerminal.module.css";
import { cx, formatCurrency, toneClassName } from "./trading-terminal-utils";

function SummaryPill({ label, value, tone = "neutral" }) {
  return (
    <div className={styles.summaryPill}>
      <span>{label}</span>
      <strong className={toneClassName(tone, styles)}>{value}</strong>
    </div>
  );
}

function RowAction({ label, tone = "neutral", onClick }) {
  return (
    <button type="button" onClick={onClick} className={cx(styles.rowAction, styles[`${tone}Action`])}>
      {label}
    </button>
  );
}

export function TradingTerminalActivityZone({
  selectedTab,
  tabs,
  positions,
  pendingOrders,
  fills,
  decisionJournal,
  activityLog,
  auditTrail,
  summary,
  onTabChange,
  onFillPending,
  onCancelPending,
  onClosePosition
}) {
  const renderRows = () => {
    if (selectedTab === "positions") {
      return positions.map((position) => (
        <tr key={position.id}>
          <td>{position.symbol}</td>
          <td>{position.side}</td>
          <td>{position.route}</td>
          <td>{position.quantity}</td>
          <td>{position.entry}</td>
          <td>{position.mark}</td>
          <td>{position.stopLoss}</td>
          <td>{position.takeProfit}</td>
          <td className={position.pnl >= 0 ? styles.positiveTone : styles.negativeTone}>{formatCurrency(position.pnl)}</td>
          <td>{position.status}</td>
          <td>{position.openedAt}</td>
          <td>
            <RowAction label="Close" tone="warning" onClick={() => onClosePosition(position)} />
          </td>
        </tr>
      ));
    }

    if (selectedTab === "orders") {
      return pendingOrders.map((order) => (
        <tr key={order.id}>
          <td>{order.id}</td>
          <td>{order.symbol}</td>
          <td>{order.side}</td>
          <td>{order.type}</td>
          <td>{order.quantity}</td>
          <td>{order.entry}</td>
          <td>{order.stopLoss}</td>
          <td>{order.takeProfit}</td>
          <td>{order.status}</td>
          <td>{order.timestamp}</td>
          <td>
            <RowAction label="Cancel" tone="danger" onClick={() => onCancelPending(order)} />
          </td>
        </tr>
      ));
    }

    if (selectedTab === "fills") {
      return fills.map((fill) => (
        <tr key={fill.id}>
          <td>{fill.id}</td>
          <td>{fill.symbol}</td>
          <td>{fill.side}</td>
          <td>{fill.type}</td>
          <td>{fill.quantity}</td>
          <td>{fill.entry}</td>
          <td>{fill.status}</td>
          <td>{fill.timestamp}</td>
          <td className={fill.realizedPnl >= 0 ? styles.positiveTone : styles.negativeTone}>{formatCurrency(fill.realizedPnl || 0)}</td>
          <td>{fill.accountMode}</td>
        </tr>
      ));
    }

    if (selectedTab === "journal") {
      return decisionJournal.map((item) => (
        <tr key={item.id}>
          <td>{item.timeText}</td>
          <td>{item.symbol}</td>
          <td>{item.timeframe}</td>
          <td>{item.bias}</td>
          <td>{item.confidence}%</td>
          <td>{item.opportunityScore}</td>
          <td>{item.riskScore}</td>
          <td>{item.structureState}</td>
        </tr>
      ));
    }

    if (selectedTab === "activity") {
      return activityLog.map((item) => (
        <tr key={item.id}>
          <td>{item.time}</td>
          <td>{item.event}</td>
          <td>{item.owner}</td>
          <td>{item.status}</td>
        </tr>
      ));
    }

    return auditTrail.map((item) => (
      <tr key={item.id}>
        <td>{item.time}</td>
        <td className={item.level === "WARN" ? styles.warningTone : styles.neutralTone}>{item.level}</td>
        <td>{item.message}</td>
      </tr>
    ));
  };

  const columns =
    selectedTab === "positions"
      ? ["Symbol", "Side", "Route", "Size", "Entry", "Mark", "Stop", "Target", "PnL", "Status", "Timestamp", "Actions"]
      : selectedTab === "orders"
        ? ["Order ID", "Symbol", "Side", "Type", "Qty", "Entry", "Stop", "Target", "Status", "Timestamp", "Actions"]
      : selectedTab === "fills"
          ? ["Fill ID", "Symbol", "Side", "Type", "Qty", "Entry", "Status", "Timestamp", "Realized", "Mode"]
          : selectedTab === "journal"
            ? ["Time", "Symbol", "TF", "Bias", "Confidence", "Opportunity", "Risk", "Structure"]
          : selectedTab === "activity"
            ? ["Time", "Event", "Owner", "Status"]
            : ["Time", "Level", "Message"];

  return (
    <section className={cx(styles.panel, styles.activityPanel)}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelEyebrow}>Bottom Trading Activity Zone</div>
          <h2>Positions, Orders, Fills, Audit Trail</h2>
          <p>Simulated orders, fills, and operational logs are all connected to the same desk state.</p>
        </div>
        <div className={styles.activitySummary}>
          {summary.map((item) => (
            <SummaryPill key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </div>
      </div>

      <div className={styles.activityTabs}>
        {Object.entries(tabs).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={cx(styles.activityTab, selectedTab === key && styles.activityTabActive)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.activityTableWrap}>
        <table className={styles.activityTable}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
    </section>
  );
}
