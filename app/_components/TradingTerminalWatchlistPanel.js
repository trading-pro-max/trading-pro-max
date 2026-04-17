import styles from "./TradingTerminal.module.css";
import { buildSparkArea, buildSparkPath, cx } from "./trading-terminal-utils";

export function TradingTerminalWatchlistPanel({ markets, selectedSymbol, favorites, heatCards, provider, onMarketSelect, onToggleFavorite }) {
  return (
    <section className={cx(styles.panel, styles.watchlistPanel)}>
      <div className={styles.panelHeaderCompact}>
        <div>
          <div className={styles.panelEyebrow}>Watchlist / Market Overview</div>
          <h3>Lead Symbols</h3>
        </div>
        <span className={styles.inlineBadge}>{provider.label}</span>
      </div>

      <div className={styles.heatGrid}>
        {heatCards.map((card) => (
          <div key={card.label} className={cx(styles.heatCard, styles[`${card.tone}Tone`])}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.state}</small>
          </div>
        ))}
      </div>

      <div className={styles.watchlistTable}>
        {markets.map((market) => (
          <div
            key={market.symbol}
            onClick={() => onMarketSelect(market.symbol)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onMarketSelect(market.symbol);
              }
            }}
            role="button"
            tabIndex={0}
            className={cx(styles.watchlistRow, selectedSymbol === market.symbol && styles.watchlistRowActive)}
          >
            <div className={styles.watchlistIdentity}>
              <div className={styles.watchlistTitle}>
                <strong>{market.symbol}</strong>
                <button
                  type="button"
                  className={cx(styles.favoriteButton, favorites[market.symbol] && styles.favoriteButtonActive)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(market.symbol);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                  aria-label={`Toggle favorite for ${market.symbol}`}
                  aria-pressed={favorites[market.symbol]}
                >
                  *
                </button>
              </div>
              <span>{market.route}</span>
            </div>
            <div className={styles.watchlistMeta}>
              <span>{market.watchlist.last}</span>
              <span className={market.watchlist.rawChange >= 0 ? styles.positiveTone : styles.negativeTone}>{market.watchlist.change}</span>
              <small>{market.freshness} | {market.freshnessDetail}</small>
            </div>
            <svg viewBox="0 0 140 44" className={styles.sparkSvg} aria-hidden="true">
              <path d={buildSparkArea(market.watchlist.spark)} className={market.watchlist.rawChange >= 0 ? styles.sparkAreaPositive : styles.sparkAreaNegative} />
              <path d={buildSparkPath(market.watchlist.spark)} className={market.watchlist.rawChange >= 0 ? styles.sparkLinePositive : styles.sparkLineNegative} />
            </svg>
          </div>
        ))}
      </div>
    </section>
  );
}
