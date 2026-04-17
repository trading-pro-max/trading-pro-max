import styles from "./TradingTerminal.module.css";
import { cx, toneClassName } from "./trading-terminal-utils";

function StatusTile({ label, value, detail, tone = "neutral" }) {
  return (
    <div className={styles.statusTile}>
      <span>{label}</span>
      <strong className={toneClassName(tone, styles)}>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function TradingTerminalTopbar({
  section,
  market,
  marketView,
  accountMode,
  accountModes,
  notifications,
  connection,
  sessionState,
  sessionBias,
  runtimeAlert,
  statusTiles = [],
  searchQuery,
  filteredMarkets,
  searchOpen,
  searchInputRef,
  onSearchQueryChange,
  onSearchOpen,
  onMarketSelect,
  onAccountModeChange
}) {
  const activeNotification = notifications[0];

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLead}>
        <div className={styles.topbarEyebrow}>{section.id}</div>
        <div className={styles.topbarMarket}>
          <h1>{market.symbol}</h1>
          <div className={styles.marketSubtitle}>
            <span>{market.name}</span>
            <span className={styles.inlineBadge}>{marketView.last}</span>
            <span className={cx(styles.inlineBadge, styles.positiveBadge)}>{connection.state}</span>
            <span className={styles.inlineBadge}>{market.venue}</span>
            <span className={styles.inlineBadge}>{sessionState}</span>
            <span className={styles.inlineBadge}>{sessionBias}</span>
          </div>
        </div>
        <p>{section.detail}</p>
      </div>

      <div className={styles.topbarStatusRail}>
        {statusTiles.map((tile) => (
          <StatusTile key={tile.label} label={tile.label} value={tile.value} detail={tile.detail} tone={tile.tone} />
        ))}
      </div>

      <div className={styles.topbarActions}>
        <div className={styles.accountToggle}>
          {accountModes.map((mode) => (
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

        <div className={styles.searchBox}>
          <label className={styles.searchLabel} htmlFor="symbol-search">
            Search / Symbol Switcher
          </label>
          <input
            ref={searchInputRef}
            id="symbol-search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onFocus={() => onSearchOpen(true)}
            placeholder="Search EUR/USD, BTC/USD, NASDAQ..."
            className={styles.searchInput}
          />

          {searchOpen && filteredMarkets.length ? (
            <div className={styles.searchResults}>
              {filteredMarkets.slice(0, 6).map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => onMarketSelect(item.symbol)}
                  className={cx(styles.searchResult, market.symbol === item.symbol && styles.searchResultActive)}
                >
                  <div>
                    <strong>{item.symbol}</strong>
                    <span>{item.name}</span>
                  </div>
                  <span className={cx(styles.searchChange, item.watchlist.rawChange >= 0 ? styles.positiveTone : styles.negativeTone)}>
                    {item.watchlist.change}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.notificationStrip}>
          <span className={styles.notificationCount}>{notifications.length}</span>
          <div>
            <strong>{activeNotification?.title || "Notifications"}</strong>
            <p>{activeNotification?.detail || activeNotification?.title || "Desk state is nominal."}</p>
            <p className={styles.topbarAlertLine}>{runtimeAlert}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
