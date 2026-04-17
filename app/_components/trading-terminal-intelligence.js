export const marketIntelligenceLibrary = {
  "EUR/USD": {
    bias: "Bullish continuation",
    confidence: 84,
    regime: "Trend continuation",
    volatilityState: "Balanced expansion",
    warnings: [
      "ECB headlines can widen spreads abruptly for 20-40 seconds.",
      "Do not chase entries into London/NY overlap extremes.",
      "Correlation to DXY remains strong enough to invalidate weak countertrend setups."
    ],
    whyTrade: [
      "Buyer initiative is holding above session VWAP with positive delta progression.",
      "Macro tape is aligned with softer dollar flows and cleaner FX relative strength.",
      "The route remains qualified on structure, liquidity, and slippage quality."
    ],
    whyNot: [
      "The pair is close to session extension and may need a pullback before efficient continuation.",
      "Momentum fades quickly if DXY reclaims intraday value.",
      "Event risk remains non-trivial through the next macro speaker window."
    ],
    whatChanged: [
      "Dollar weakness broadened across the major basket.",
      "Buy-side imbalance expanded during the last five 5m candles.",
      "Execution quality improved as spread normalized back under one pip."
    ],
    operatorRecommendations: [
      "Prioritize pullback entries over breakout chasing while the pair is extended.",
      "Keep stops outside the opening range low and size within session guardrails.",
      "Escalate to live mode only if latency remains under 20 ms."
    ]
  },
  NASDAQ: {
    bias: "Momentum rotation",
    confidence: 79,
    regime: "Index trend day",
    volatilityState: "Firm intraday range",
    warnings: [
      "Opening auction imbalance can reverse quickly through the first cash session rotation.",
      "Crowded long exposure across tech beta raises gap risk.",
      "Slippage expands materially when latency exceeds 25 ms."
    ],
    whyTrade: [
      "Breadth remains constructive and index leadership is still concentrated in high-quality momentum names.",
      "Pullback demand is holding above composite VWAP with strong participation.",
      "Route quality is highest when the index remains above the prior balance high."
    ],
    whyNot: [
      "Index is vulnerable to mean reversion if semis stop leading.",
      "Volatility clustering near the open can invalidate tight stops.",
      "Correlation to rates and dollar strength can flip the tape quickly."
    ],
    whatChanged: [
      "Cash open bids lifted the index back above overnight value.",
      "Semiconductor leadership improved relative to defensive sectors.",
      "Aggressive seller flow faded after the first distribution attempt."
    ],
    operatorRecommendations: [
      "Favor add-on entries only after the first intraday rebalance completes.",
      "Reduce size if breadth deteriorates while price remains flat.",
      "Keep live mode gated behind stable feed quality during the open."
    ]
  },
  "BTC/USD": {
    bias: "Compression breakout",
    confidence: 76,
    regime: "Expansion compression",
    volatilityState: "Elevated",
    warnings: [
      "Crypto headline flow can invalidate structure without warning.",
      "Weekend-style liquidity pockets remain possible even during active sessions.",
      "Do not overleverage when slippage and spread both widen together."
    ],
    whyTrade: [
      "Compression is building above support with improving spot participation.",
      "ETF-related flow remains supportive and underpins dip demand.",
      "Momentum expansion probability improves when the pair retakes intraday value."
    ],
    whyNot: [
      "Breakouts can fail violently if ETF flow slows.",
      "Volatility is high enough to punish late entries and tight stops.",
      "Cross-asset risk-off shifts can drag crypto beta lower quickly."
    ],
    whatChanged: [
      "Spot-led demand returned after the previous rejection zone cleared.",
      "Short-term volatility compressed while order-book support improved.",
      "Model confidence rose after correlation with equities stabilized."
    ],
    operatorRecommendations: [
      "Treat BTC as tactical risk, not core book exposure, while volatility stays elevated.",
      "Avoid stacking correlated longs across BTC and NASDAQ simultaneously.",
      "Require wider stops and smaller size if routing to live."
    ]
  },
  "XAU/USD": {
    bias: "Protected mean reversion",
    confidence: 68,
    regime: "Countertrend reversion",
    volatilityState: "Balanced defensive",
    warnings: [
      "Gold loses clean structure quickly when real yields rise intraday.",
      "Reversion setups underperform when dollar momentum accelerates.",
      "Do not add size while the metal remains below macro resistance."
    ],
    whyTrade: [
      "Gold is stabilizing near a defensively relevant support pocket.",
      "The metal offers useful diversification when tech beta is extended.",
      "Risk-adjusted reversion setups improve as volatility compresses."
    ],
    whyNot: [
      "This is not the highest-conviction route on the desk today.",
      "Trend quality is weaker than FX and index flows.",
      "Defensive metals can lag sharply in broad risk-on tape."
    ],
    whatChanged: [
      "Momentum selling cooled as yields stopped rising.",
      "Relative weakness versus FX narrowed during the last rotation.",
      "Risk model downgraded gold from primary to tactical."
    ],
    operatorRecommendations: [
      "Use gold as hedge inventory rather than lead risk.",
      "Keep targets conservative and exits disciplined.",
      "Avoid adding if dollar strength resumes."
    ]
  },
  "ETH/USD": {
    bias: "Constructive beta follow-through",
    confidence: 73,
    regime: "Crypto continuation",
    volatilityState: "Elevated but orderly",
    warnings: [
      "ETH still inherits headline risk from BTC and broader crypto sentiment.",
      "Liquidity is thinner than BTC, so slippage can spike faster.",
      "Do not let correlated crypto positions dominate session exposure."
    ],
    whyTrade: [
      "ETH structure is cleaner than BTC after the latest retest.",
      "Relative strength versus the crypto basket improved intraday.",
      "Continuation setups remain valid while dip demand holds above value."
    ],
    whyNot: [
      "ETH frequently underperforms when BTC dominance surges.",
      "Volatility remains too high for oversized live execution.",
      "The route weakens if ETF-related sentiment fades."
    ],
    whatChanged: [
      "Breakout retest held with improving participation.",
      "Volatility compressed slightly relative to BTC.",
      "AI route scoring upgraded ETH back into the active watch set."
    ],
    operatorRecommendations: [
      "Use smaller size than BTC and demand better entry quality.",
      "Avoid doubling crypto exposure when NASDAQ is also extended.",
      "Only graduate to live after risk diagnostics remain inside guardrails."
    ]
  },
  NVDA: {
    bias: "Single-name continuation",
    confidence: 72,
    regime: "Leader continuation",
    volatilityState: "Firm but liquid",
    warnings: [
      "Single-name gap risk is materially higher than index exposure.",
      "Momentum can unwind quickly on any negative AI complex headline.",
      "Guardrail thresholds tighten faster on single-stock leverage."
    ],
    whyTrade: [
      "The stock remains a high-quality leadership proxy inside the tech tape.",
      "Relative strength stays intact against both the index and peer group.",
      "Liquidity quality is strong enough for controlled execution."
    ],
    whyNot: [
      "Name-specific event risk is much higher than index futures.",
      "Crowded leadership positioning raises reversal probability.",
      "Intraday extension can punish late continuation entries."
    ],
    whatChanged: [
      "Semiconductor breadth improved after the last intraday rotation.",
      "Buy programs reappeared above short-term value.",
      "Execution model kept NVDA in the secondary priority lane."
    ],
    operatorRecommendations: [
      "Trade NVDA only if index structure remains supportive.",
      "Prefer scaling through partial entries rather than full notional deployment.",
      "Use hard stops; do not rely on mental exits in live mode."
    ]
  },
  DXY: {
    bias: "Softening dollar",
    confidence: 67,
    regime: "Macro hedge drift",
    volatilityState: "Contained",
    warnings: [
      "Macro reversals can cascade quickly through correlated markets.",
      "DXY is best treated as context and hedge, not lead risk.",
      "Unexpected central bank headlines can reset structure instantly."
    ],
    whyTrade: [
      "Dollar softness validates long risk elsewhere on the desk.",
      "Macro context is coherent with stronger FX and equity beta.",
      "DXY gives a clean hedge read for correlated trade books."
    ],
    whyNot: [
      "Standalone directional setups are lower quality than primary routes.",
      "Liquidity is broad but tactical follow-through is often modest.",
      "A macro reversal would be better traded through core correlated assets."
    ],
    whatChanged: [
      "Dollar pressure eased during the latest macro rotation.",
      "Yield momentum stopped accelerating intraday.",
      "Correlation risk fell slightly across the active book."
    ],
    operatorRecommendations: [
      "Use DXY primarily as validation and hedge context.",
      "Do not oversize direct DXY trades relative to the main book.",
      "Watch for fast correlation breaks around speaker risk."
    ]
  },
  BRENT: {
    bias: "Firm inflation bid",
    confidence: 66,
    regime: "Commodity trend hold",
    volatilityState: "Moderately elevated",
    warnings: [
      "Energy headlines can gap the tape outside normal structure.",
      "Inflation-sensitive correlation can amplify portfolio-wide risk.",
      "Execution quality can degrade fast outside peak futures liquidity."
    ],
    whyTrade: [
      "Brent remains bid enough to support the inflation-sensitive complex.",
      "Trend quality is intact while higher lows keep printing.",
      "The contract adds useful macro diversification to the book."
    ],
    whyNot: [
      "Headline risk is materially higher than FX majors.",
      "Trend conviction is still below the best equity and FX routes.",
      "Commodity execution can feel thin during off-peak windows."
    ],
    whatChanged: [
      "Energy rebounded after the latest intraday inventory narrative faded.",
      "Risk model upgraded Brent from passive context to tactical opportunity.",
      "Cross-asset inflation read strengthened slightly."
    ],
    operatorRecommendations: [
      "Keep Brent tactical and sized beneath core desk exposure.",
      "Avoid adding if inflation-sensitive assets all move into crowded risk.",
      "Require wider stops and explicit live confirmation."
    ]
  }
};
