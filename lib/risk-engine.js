import { getState, applyProtection } from "./state.js";
import { readDb } from "./core-db.js";

function n(x) {
  return Number(x || 0);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function compute() {
  const state = getState();
  const db = readDb();

  const protection = state.protection || {};
  const positions = Array.isArray(db.portfolio?.positions) ? db.portfolio.positions : [];
  const ledger = Array.isArray(db.ledger) ? db.ledger : [];
  const paperTrades = Array.isArray(state.paperTrades) ? state.paperTrades : [];

  const enriched = positions.map((p) => {
    const qty = n(p.qty);
    const avgPrice = n(p.avgPrice);
    const currentPrice = n(p.currentPrice || p.avgPrice);
    const marketValue = Number((qty * currentPrice).toFixed(2));
    const cost = Number((qty * avgPrice).toFixed(2));
    const pnl = Number((marketValue - cost).toFixed(2));
    return {
      ...p,
      qty,
      avgPrice,
      currentPrice,
      marketValue,
      pnl
    };
  });

  const totalExposure = Number(enriched.reduce((s, x) => s + n(x.marketValue), 0).toFixed(2));
  const cash = n(db.portfolio?.cash);
  const totalCapitalBase = Number((cash + totalExposure).toFixed(2));

  const bySymbol = {};
  enriched.forEach((p) => {
    bySymbol[p.symbol] = Number((n(bySymbol[p.symbol]) + n(p.marketValue)).toFixed(2));
  });

  const concentrationRows = Object.entries(bySymbol)
    .map(([symbol, value]) => ({
      symbol,
      value: Number(value.toFixed(2)),
      share: totalExposure > 0 ? Number(((value / totalExposure) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => b.share - a.share);

  const topConcentration = concentrationRows[0] || { symbol: "--", value: 0, share: 0 };

  const today = todayIso();

  const todayRealizedLoss = Math.abs(
    ledger
      .filter((x) => x.type === "ORDER_CLOSE" && String(x.createdAt || "").slice(0, 10) === today && n(x.pnl) < 0)
      .reduce((s, x) => s + n(x.pnl), 0)
  );

  const todayPaperLoss = Math.abs(
    paperTrades
      .filter((x) => String(x.createdAt || "").slice(0, 10) === today && n(x.pnl) < 0)
      .reduce((s, x) => s + n(x.pnl), 0)
  );

  const todayLossCombined = Number((todayRealizedLoss + todayPaperLoss).toFixed(2));
  const openPositions = enriched.length;
  const maxOpenPositions = n(protection.maxOpenPositions || 0);
  const maxDailyLoss = n(protection.maxDailyLoss || 0);

  const breaches = [];

  if (maxOpenPositions > 0 && openPositions > maxOpenPositions) {
    breaches.push({
      key: "MAX_OPEN_POSITIONS",
      severity: "critical",
      title: "Open positions exceed guardian limit",
      detail: openPositions + " > " + maxOpenPositions
    });
  }

  if (maxDailyLoss > 0 && todayLossCombined > maxDailyLoss) {
    breaches.push({
      key: "MAX_DAILY_LOSS",
      severity: "critical",
      title: "Daily loss exceeds guardian threshold",
      detail: todayLossCombined + " > " + maxDailyLoss
    });
  }

  if (topConcentration.share > 55) {
    breaches.push({
      key: "CONCENTRATION",
      severity: topConcentration.share > 70 ? "critical" : "warning",
      title: "Symbol concentration too high",
      detail: topConcentration.symbol + " at " + topConcentration.share + "%"
    });
  }

  if (state.riskMode === "AGGRESSIVE" && protection.sessionMode === "PROTECTED") {
    breaches.push({
      key: "RISK_MODE_CONFLICT",
      severity: "warning",
      title: "Aggressive mode conflicts with protected session",
      detail: "AGGRESSIVE vs PROTECTED"
    });
  }

  if (protection.liveTradingEnabled && protection.guardianStatus !== "ARMED") {
    breaches.push({
      key: "LIVE_GUARDIAN_MISMATCH",
      severity: "critical",
      title: "Live trading enabled without armed guardian posture",
      detail: "guardian=" + protection.guardianStatus
    });
  }

  const riskScoreBase =
    (breaches.filter(x => x.severity === "critical").length * 28) +
    (breaches.filter(x => x.severity === "warning").length * 14) +
    (topConcentration.share > 40 ? 10 : 0) +
    (openPositions > 0 ? Math.min(20, openPositions * 3) : 0);

  const riskScore = Math.max(0, Math.min(100, Number(riskScoreBase.toFixed(2))));

  const recommendations = [];

  if (breaches.some(x => x.key === "MAX_DAILY_LOSS")) {
    recommendations.push({ action: "KILL_SWITCH_ON", priority: "critical", reason: "capital protection threshold breached" });
  }
  if (breaches.some(x => x.key === "MAX_OPEN_POSITIONS")) {
    recommendations.push({ action: "LOCK_RISK", priority: "critical", reason: "too many concurrent positions" });
  }
  if (breaches.some(x => x.key === "CONCENTRATION")) {
    recommendations.push({ action: "REDUCE_CONCENTRATION", priority: "high", reason: "single-symbol exposure is elevated" });
  }
  if (state.riskMode === "AGGRESSIVE" && protection.sessionMode === "PROTECTED") {
    recommendations.push({ action: "RISK_SAFE", priority: "high", reason: "align operating mode with protected session" });
  }
  if (protection.liveTradingEnabled) {
    recommendations.push({ action: "LIVE_DISABLE", priority: "medium", reason: "keep live execution gated until full production hardening" });
  }
  if (recommendations.length === 0) {
    recommendations.push({ action: "SYSTEM_OK", priority: "low", reason: "risk posture stable" });
  }

  return {
    core: {
      status: state.status,
      riskMode: state.riskMode,
      autoMode: state.autoMode,
      aiEnabled: state.aiEnabled
    },
    protection,
    totals: {
      cash,
      totalExposure,
      totalCapitalBase,
      openPositions,
      maxOpenPositions,
      maxDailyLoss
    },
    concentration: {
      top: topConcentration,
      rows: concentrationRows
    },
    pnl: {
      todayRealizedLoss: Number(todayRealizedLoss.toFixed(2)),
      todayPaperLoss: Number(todayPaperLoss.toFixed(2)),
      todayLossCombined
    },
    breaches,
    recommendations,
    riskScore,
    updatedAt: new Date().toISOString()
  };
}

function enforceAction(action) {
  if (action === "KILL_SWITCH_ON") return applyProtection("KILL_SWITCH_ON");
  if (action === "KILL_SWITCH_OFF") return applyProtection("KILL_SWITCH_OFF");
  if (action === "LOCK_RISK") return applyProtection("LOCK_RISK");
  if (action === "UNLOCK_RISK") return applyProtection("UNLOCK_RISK");
  if (action === "LIVE_DISABLE") return applyProtection("LIVE_DISABLE");
  if (action === "LIVE_ENABLE") return applyProtection("LIVE_ENABLE");
  return getState();
}

export function getRiskOverview() {
  return compute();
}

export function runRiskScan() {
  return compute();
}

export function enforceRisk(action = "AUTO_ENFORCE") {
  const before = compute();

  if (action === "AUTO_ENFORCE") {
    if (before.breaches.some(x => x.key === "MAX_DAILY_LOSS")) {
      enforceAction("KILL_SWITCH_ON");
      enforceAction("LIVE_DISABLE");
    } else if (before.breaches.some(x => x.key === "MAX_OPEN_POSITIONS")) {
      enforceAction("LOCK_RISK");
    } else if (before.protection.liveTradingEnabled) {
      enforceAction("LIVE_DISABLE");
    }
  } else {
    enforceAction(action);
  }

  return compute();
}
