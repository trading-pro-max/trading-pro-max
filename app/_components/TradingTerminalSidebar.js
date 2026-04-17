import styles from "./TradingTerminal.module.css";
import { cx } from "./trading-terminal-utils";

export function TradingTerminalSidebar({ brand, sections, activeSection, releaseGate, runtimeHealth, onSectionSelect }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <div className={styles.brandMark}>{brand.mark}</div>
        <div className={styles.brandText}>
          <span className={styles.brandEyebrow}>{brand.name}</span>
          <strong>{brand.desk}</strong>
        </div>
      </div>

      <nav className={styles.sidebarNav} aria-label="Terminal sections">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionSelect(section.id)}
            className={cx(styles.sidebarButton, activeSection === section.id && styles.sidebarButtonActive)}
          >
            <span className={styles.sidebarShort}>{section.short}</span>
            <span className={styles.sidebarLabelGroup}>
              <span className={styles.sidebarLabel}>{section.id}</span>
              <span className={styles.sidebarDetail}>{section.detail}</span>
            </span>
            <span className={styles.sidebarBadge}>{section.badge}</span>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFoot}>
        <div className={styles.sidebarMetric}>
          <span>Release Gate</span>
          <strong>{releaseGate}</strong>
        </div>
        <div className={styles.sidebarMetric}>
          <span>Runtime Health</span>
          <strong>{runtimeHealth}</strong>
        </div>
        <div className={styles.sidebarHints}>
          <span>Hotkeys</span>
          <small>`/` search, arrows cycle markets, `1-6` timeframe, `F` favorite</small>
        </div>
      </div>
    </aside>
  );
}
