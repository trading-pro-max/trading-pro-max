import { getInstrumentMeta } from "./market-catalog.js";
import { createDeskId, normalizeDeskState } from "./persistence.js";

function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function directionFromOrderSide(side) {
  return side === "Sell" ? -1 : 1;
}

function directionFromPositionSide(side) {
  return side === "Short" ? -1 : 1;
}

function positionSideFromOrderSide(side) {
  return side === "Sell" ? "Short" : "Long";
}

function quoteMid(quote) {
  if (!quote) return 0;
  if (Number.isFinite(quote.last)) return quote.last;
  if (Number.isFinite(quote.bid) && Number.isFinite(quote.ask)) return (quote.bid + quote.ask) / 2;
  return 0;
}

function notionalFor(meta, quantity, price) {
  return Math.abs(numeric(quantity) * numeric(price) * numeric(meta.pointValue, 1));
}

function calculatePnl(positionSide, entryPrice, exitPrice, quantity, meta) {
  const direction = directionFromPositionSide(positionSide);
  return round((numeric(exitPrice) - numeric(entryPrice)) * numeric(quantity) * direction * numeric(meta.pointValue, 1), 2);
}

function prependActivity(state, event, owner, status, detail = "") {
  state.activityLog = [
    {
      id: createDeskId("ACT"),
      time: nowIso(),
      event,
      owner,
      status,
      detail
    },
    ...(state.activityLog || [])
  ].slice(0, 180);
}

function prependAudit(state, level, message) {
  state.auditTrail = [
    {
      id: createDeskId("AUD"),
      time: nowIso(),
      level,
      message
    },
    ...(state.auditTrail || [])
  ].slice(0, 260);
}

function createFillRecord(order, fillPrice, status, realizedPnl = 0, extra = {}) {
  return {
    id: createDeskId("FIL"),
    orderId: order.id,
    positionId: extra.positionId || null,
    symbol: order.symbol,
    side: order.side,
    quantity: numeric(order.quantity, 0),
    type: order.type,
    price: round(fillPrice, 6),
    status,
    createdTime: nowIso(),
    realizedPnl: round(realizedPnl, 2),
    unrealizedPnl: 0
  };
}

function findNetPosition(state, symbol) {
  return state.positions.find((position) => position.symbol === symbol);
}

function upsertOpenPosition(state, position) {
  const existingIndex = state.positions.findIndex((item) => item.id === position.id);
  if (existingIndex >= 0) {
    state.positions[existingIndex] = position;
  } else {
    state.positions.unshift(position);
  }
}

function removePosition(state, positionId) {
  state.positions = state.positions.filter((position) => position.id !== positionId);
}

function applyFillToPositions(state, order, fillPrice) {
  const meta = getInstrumentMeta(order.symbol);
  const existing = findNetPosition(state, order.symbol);
  const orderDirection = directionFromOrderSide(order.side);
  const quantity = numeric(order.quantity, 0);
  const leverage = Math.max(1, numeric(order.leverage, 1));
  const fillTime = nowIso();

  if (!existing) {
    const position = {
      id: createDeskId("POS"),
      symbol: order.symbol,
      side: positionSideFromOrderSide(order.side),
      quantity,
      entryPrice: round(fillPrice, meta.digits),
      marketPrice: round(fillPrice, meta.digits),
      stopLoss: numeric(order.stopLoss, 0),
      takeProfit: numeric(order.takeProfit, 0),
      leverage,
      createdTime: fillTime,
      updatedTime: fillTime,
      status: "Open",
      pnl: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
      usedCapital: round(notionalFor(meta, quantity, fillPrice) / leverage, 2),
      notional: round(notionalFor(meta, quantity, fillPrice), 2)
    };
    upsertOpenPosition(state, position);
    return { positionId: position.id, realizedPnl: 0, fillStatus: "Opened" };
  }

  const existingDirection = directionFromPositionSide(existing.side);

  if (existingDirection === orderDirection) {
    const newQuantity = numeric(existing.quantity, 0) + quantity;
    const weightedEntry =
      newQuantity > 0
        ? (numeric(existing.entryPrice, 0) * numeric(existing.quantity, 0) + fillPrice * quantity) / newQuantity
        : fillPrice;

    const updated = {
      ...existing,
      quantity: round(newQuantity, 4),
      entryPrice: round(weightedEntry, meta.digits),
      stopLoss: numeric(order.stopLoss, 0) || existing.stopLoss,
      takeProfit: numeric(order.takeProfit, 0) || existing.takeProfit,
      leverage,
      marketPrice: round(fillPrice, meta.digits),
      updatedTime: fillTime
    };

    upsertOpenPosition(state, updated);
    return { positionId: updated.id, realizedPnl: 0, fillStatus: "Scaled" };
  }

  if (quantity < numeric(existing.quantity, 0)) {
    const realizedPnl = calculatePnl(existing.side, existing.entryPrice, fillPrice, quantity, meta);
    const updated = {
      ...existing,
      quantity: round(numeric(existing.quantity, 0) - quantity, 4),
      marketPrice: round(fillPrice, meta.digits),
      realizedPnl: round(numeric(existing.realizedPnl, 0) + realizedPnl, 2),
      updatedTime: fillTime
    };

    upsertOpenPosition(state, updated);
    return { positionId: updated.id, realizedPnl, fillStatus: "Reduced" };
  }

  if (quantity === numeric(existing.quantity, 0)) {
    const realizedPnl = calculatePnl(existing.side, existing.entryPrice, fillPrice, quantity, meta);
    removePosition(state, existing.id);
    return { positionId: existing.id, realizedPnl, fillStatus: "Closed" };
  }

  const realizedPnl = calculatePnl(existing.side, existing.entryPrice, fillPrice, existing.quantity, meta);
  const remainingQuantity = round(quantity - numeric(existing.quantity, 0), 4);
  removePosition(state, existing.id);

  const reversed = {
    id: createDeskId("POS"),
    symbol: order.symbol,
    side: positionSideFromOrderSide(order.side),
    quantity: remainingQuantity,
    entryPrice: round(fillPrice, meta.digits),
    marketPrice: round(fillPrice, meta.digits),
    stopLoss: numeric(order.stopLoss, 0),
    takeProfit: numeric(order.takeProfit, 0),
    leverage,
    createdTime: fillTime,
    updatedTime: fillTime,
    status: "Open",
    pnl: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
    usedCapital: round(notionalFor(meta, remainingQuantity, fillPrice) / leverage, 2),
    notional: round(notionalFor(meta, remainingQuantity, fillPrice), 2)
  };

  upsertOpenPosition(state, reversed);
  return { positionId: reversed.id, realizedPnl, fillStatus: "Reversed" };
}

function closingPriceForPosition(position, quote) {
  if (!quote) return numeric(position.marketPrice, position.entryPrice);
  if (position.side === "Long") return numeric(quote.bid, quoteMid(quote));
  return numeric(quote.ask, quoteMid(quote));
}

function closePositionInternal(state, positionId, quote, reason = "Manual Close") {
  const position = state.positions.find((item) => item.id === positionId);
  if (!position) return null;

  const meta = getInstrumentMeta(position.symbol);
  const exitPrice = closingPriceForPosition(position, quote);
  const realizedPnl = calculatePnl(position.side, position.entryPrice, exitPrice, position.quantity, meta);
  const fill = {
    id: createDeskId("FIL"),
    orderId: null,
    positionId,
    symbol: position.symbol,
    side: position.side === "Long" ? "Sell" : "Buy",
    quantity: numeric(position.quantity, 0),
    type: reason,
    price: round(exitPrice, meta.digits),
    status: "Closed",
    createdTime: nowIso(),
    realizedPnl,
    unrealizedPnl: 0
  };

  state.fills.unshift(fill);
  removePosition(state, positionId);
  prependActivity(state, `Closed ${position.symbol}`, "Execution Engine", "Closed", reason);
  prependAudit(
    state,
    realizedPnl >= 0 ? "INFO" : "WARN",
    `${position.symbol} ${position.side} position closed by ${reason} at ${round(exitPrice, meta.digits)} with ${realizedPnl >= 0 ? "gain" : "loss"} ${Math.abs(realizedPnl).toFixed(2)}.`
  );

  return fill;
}

function shouldTriggerOrder(order, quote) {
  if (!quote) return null;

  const ask = numeric(quote.ask, quote.last);
  const bid = numeric(quote.bid, quote.last);
  const entry = numeric(order.entryPrice, 0);

  if (order.type === "Market") {
    return order.side === "Buy" ? ask : bid;
  }

  if (order.type === "Limit") {
    if (order.side === "Buy" && ask <= entry) return Math.min(entry, ask);
    if (order.side === "Sell" && bid >= entry) return Math.max(entry, bid);
    return null;
  }

  if (order.type === "Stop") {
    if (order.side === "Buy" && ask >= entry) return Math.max(entry, ask);
    if (order.side === "Sell" && bid <= entry) return Math.min(entry, bid);
  }

  return null;
}

function recalculateAccount(state, quoteMap = {}) {
  const realizedPnl = (state.fills || []).reduce((sum, fill) => sum + numeric(fill.realizedPnl, 0), 0);
  let usedMargin = 0;
  let unrealizedPnl = 0;
  const exposureBySymbol = {};

  state.positions = (state.positions || []).map((position) => {
    const meta = getInstrumentMeta(position.symbol);
    const quote = quoteMap[position.symbol];
    const marketPrice = quote ? quoteMid(quote) : numeric(position.marketPrice, position.entryPrice);
    const pnl = calculatePnl(position.side, position.entryPrice, marketPrice, position.quantity, meta);
    const notional = notionalFor(meta, position.quantity, marketPrice);
    const usedCapital = notional / Math.max(1, numeric(position.leverage, 1));

    usedMargin += usedCapital;
    unrealizedPnl += pnl;
    exposureBySymbol[position.symbol] = round((exposureBySymbol[position.symbol] || 0) + notional, 2);

    return {
      ...position,
      marketPrice: round(marketPrice, meta.digits),
      pnl,
      unrealizedPnl: pnl,
      notional: round(notional, 2),
      usedCapital: round(usedCapital, 2),
      updatedTime: nowIso()
    };
  });

  const wins = (state.fills || []).filter((fill) => numeric(fill.realizedPnl, 0) > 0).length;
  const losses = (state.fills || []).filter((fill) => numeric(fill.realizedPnl, 0) < 0).length;
  const balance = round(numeric(state.account.startingBalance, 100000) + realizedPnl, 2);
  const equity = round(balance + unrealizedPnl, 2);

  state.account = {
    ...state.account,
    balance,
    equity,
    usedMargin: round(usedMargin, 2),
    freeMargin: round(equity - usedMargin, 2),
    sessionPnl: round(equity - numeric(state.account.startingBalance, 100000), 2),
    realizedPnl: round(realizedPnl, 2),
    unrealizedPnl: round(unrealizedPnl, 2),
    wins,
    losses,
    exposureBySymbol
  };

  const rejectedOrders = (state.orders || []).filter((order) => order.status === "Rejected").length;
  state.system.executionHealth =
    state.account.freeMargin < 0 ||
    rejectedOrders > 3 ||
    numeric(state.account.sessionPnl, 0) <= -numeric(state.risk.maxSessionLoss, 0)
      ? "Attention"
      : state.orders.some((order) => order.status === "Pending")
        ? "Active"
        : "Ready";
}

export function validateOrderDraft(state, orderDraft, quote) {
  const meta = getInstrumentMeta(orderDraft.symbol);
  const quantity = round(numeric(orderDraft.quantity, 0), 4);
  const entryPrice = numeric(orderDraft.entryPrice, numeric(orderDraft.entry, quoteMid(quote)));
  const stopLoss = numeric(orderDraft.stopLoss, 0);
  const takeProfit = numeric(orderDraft.takeProfit, 0);
  const leverage = Math.max(1, numeric(orderDraft.leverage, 1));
  const isBuy = orderDraft.side !== "Sell";
  const currentExposure = Object.values(state.account.exposureBySymbol || {}).reduce((sum, value) => sum + numeric(value, 0), 0);
  const symbolExposure = numeric(state.account.exposureBySymbol?.[orderDraft.symbol], 0);
  const orderNotional = notionalFor(meta, quantity, entryPrice);
  const maxLoss =
    stopLoss > 0
      ? calculatePnl(isBuy ? "Long" : "Short", entryPrice, stopLoss, quantity, meta)
      : 0;
  const stopValid = stopLoss > 0 && (isBuy ? stopLoss < entryPrice : stopLoss > entryPrice);
  const targetValid = takeProfit > 0 ? (isBuy ? takeProfit > entryPrice : takeProfit < entryPrice) : true;
  const conflictingExposure = (state.positions || []).find(
    (position) =>
      position.symbol === orderDraft.symbol &&
      ((position.side === "Long" && orderDraft.side === "Sell") || (position.side === "Short" && orderDraft.side !== "Sell"))
  );
  const duplicatePendingOrder = (state.orders || []).find((order) => {
    if (order.status !== "Pending") return false;

    return (
      order.symbol === orderDraft.symbol &&
      order.side === (orderDraft.side === "Sell" ? "Sell" : "Buy") &&
      order.type === (["Market", "Limit", "Stop"].includes(orderDraft.type) ? orderDraft.type : "Market") &&
      Math.abs(numeric(order.quantity, 0) - quantity) < 0.0001 &&
      Math.abs(numeric(order.entryPrice, 0) - entryPrice) <= Math.max(meta.tickSize, 0.0001)
    );
  });
  const conflictingPendingOrder = (state.orders || []).find(
    (order) => order.status === "Pending" && order.symbol === orderDraft.symbol && order.side !== (orderDraft.side === "Sell" ? "Sell" : "Buy")
  );
  const stopLossPolicy = state.risk.stopLossPolicy === "warn-only" ? "warn-only" : "required";
  const sessionLoss = Math.abs(Math.min(0, numeric(state.account.sessionPnl, 0)));
  const remainingLossBudget = Math.max(0, numeric(state.risk.maxSessionLoss, 0) - sessionLoss);

  const warnings = [];
  const hardBlocks = [];

  if (state.accountMode !== "Paper" && state.risk.blockPreviewExecution) {
    hardBlocks.push("Preview mode stays execution-locked in this local-safe build.");
  }

  if (quantity <= 0) {
    hardBlocks.push("Quantity must be greater than zero.");
  }

  if (stopLossPolicy === "required" && stopLoss <= 0) {
    hardBlocks.push("A stop loss is required before routing the order.");
  } else if (stopLossPolicy === "warn-only" && stopLoss <= 0) {
    warnings.push("Stop loss is missing and the desk is only warning on stop policy.");
  }

  if (stopLoss > 0 && !stopValid) {
    hardBlocks.push(isBuy ? "Stop loss must sit below entry for buy orders." : "Stop loss must sit above entry for sell orders.");
  }

  if (!targetValid) {
    hardBlocks.push(isBuy ? "Take profit must sit above entry for buy orders." : "Take profit must sit below entry for sell orders.");
  }

  if (orderNotional > numeric(state.risk.maxPaperPositionNotional, 0)) {
    hardBlocks.push("Order size exceeds the configured paper position cap.");
  } else if (orderNotional > numeric(state.risk.maxPaperPositionNotional, 0) * 0.82) {
    warnings.push("Order size is approaching the paper position cap.");
  }

  if (symbolExposure + orderNotional > numeric(state.risk.maxSymbolExposure, 0)) {
    hardBlocks.push("Routing this order would breach the per-symbol exposure limit.");
  } else if (symbolExposure + orderNotional > numeric(state.risk.maxSymbolExposure, 0) * 0.85) {
    warnings.push("Per-symbol exposure would move close to the configured ceiling.");
  }

  if (currentExposure + orderNotional > numeric(state.risk.maxSessionExposure, 0)) {
    hardBlocks.push("Routing this order would breach the session exposure limit.");
  } else if (currentExposure + orderNotional > numeric(state.risk.maxSessionExposure, 0) * 0.88) {
    warnings.push("Session exposure would move close to the configured ceiling.");
  }

  if (sessionLoss >= numeric(state.risk.maxSessionLoss, 0)) {
    hardBlocks.push("Session loss threshold has already been reached.");
  } else if (stopLoss > 0 && Math.abs(maxLoss) > remainingLossBudget) {
    hardBlocks.push("Projected stop-loss risk would breach the session loss limit.");
  } else if (remainingLossBudget > 0 && remainingLossBudget <= numeric(state.risk.maxSessionLoss, 0) * 0.2) {
    warnings.push("Remaining session loss budget is tight.");
  }

  if (duplicatePendingOrder && state.risk.preventDuplicateOrders) {
    hardBlocks.push("An equivalent pending order already exists for this symbol.");
  }

  if (conflictingPendingOrder && state.risk.preventConflictingOrders) {
    hardBlocks.push("A conflicting pending order already exists on this symbol.");
  }

  if (conflictingExposure && state.risk.warnOnConflictingExposure) {
    warnings.push(`Conflicting ${conflictingExposure.side.toLowerCase()} exposure already exists on ${conflictingExposure.symbol}.`);
  }

  if (takeProfit <= 0) {
    warnings.push("Take profit is not set; the position will rely on manual management or stop-only protection.");
  }

  return {
    ok: hardBlocks.length === 0,
    warnings,
    hardBlocks,
    metrics: {
      entryPrice: round(entryPrice, meta.digits),
      stopLoss: round(stopLoss, meta.digits),
      takeProfit: round(takeProfit, meta.digits),
      quantity,
      leverage,
      notional: round(orderNotional, 2),
      margin: round(orderNotional / leverage, 2),
      maxLoss: round(Math.abs(maxLoss), 2),
      symbolExposure: round(symbolExposure, 2),
      remainingLossBudget: round(remainingLossBudget, 2),
      rewardRisk:
        stopLoss > 0 && takeProfit > 0
          ? round(Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss), 2)
          : 0
    }
  };
}

function markOrderAsRejected(state, order, validation) {
  const rejected = {
    ...order,
    status: "Rejected",
    rejectionReason: validation.hardBlocks.join(" | "),
    warningFlags: validation.warnings
  };

  state.orders.unshift(rejected);
  prependActivity(state, `Rejected ${order.symbol} ${order.type}`, "Guardrail Engine", "Rejected", rejected.rejectionReason);
  prependAudit(state, "WARN", `${order.symbol} ${order.type} order rejected: ${rejected.rejectionReason}`);
}

function recordFilledOrder(state, order, fillPrice, fillResult) {
  const filledOrder = {
    ...order,
    entryPrice: round(fillPrice, getInstrumentMeta(order.symbol).digits),
    filledTime: nowIso(),
    status: "Filled",
    realizedPnl: round(fillResult.realizedPnl, 2),
    warningFlags: order.warningFlags || []
  };
  const fill = createFillRecord(filledOrder, fillPrice, fillResult.fillStatus, fillResult.realizedPnl, {
    positionId: fillResult.positionId
  });

  state.orders.unshift(filledOrder);
  state.fills.unshift(fill);
  prependActivity(
    state,
    `${fillResult.fillStatus} ${filledOrder.symbol} ${filledOrder.side}`,
    "Paper Engine",
    "Filled",
    `${filledOrder.type} @ ${filledOrder.entryPrice}`
  );
  prependAudit(
    state,
    fillResult.realizedPnl >= 0 ? "INFO" : "WARN",
    `${filledOrder.symbol} ${filledOrder.side} ${filledOrder.type} filled at ${filledOrder.entryPrice}.`
  );
}

export function submitPaperOrder(currentState, orderDraft, quoteMap = {}) {
  const state = normalizeDeskState(structuredClone(currentState));
  const quote = quoteMap[orderDraft.symbol];
  const validation = validateOrderDraft(state, orderDraft, quote);
  const meta = getInstrumentMeta(orderDraft.symbol);
  const order = {
    id: createDeskId("ORD"),
    symbol: orderDraft.symbol,
    side: orderDraft.side === "Sell" ? "Sell" : "Buy",
    quantity: round(numeric(orderDraft.quantity, 0), 4),
    type: ["Market", "Limit", "Stop"].includes(orderDraft.type) ? orderDraft.type : "Market",
    entryPrice: round(numeric(orderDraft.entryPrice ?? orderDraft.entry, quoteMid(quote)), meta.digits),
    stopLoss: round(numeric(orderDraft.stopLoss, 0), meta.digits),
    takeProfit: round(numeric(orderDraft.takeProfit, 0), meta.digits),
    leverage: Math.max(1, numeric(orderDraft.leverage, 1)),
    createdTime: nowIso(),
    filledTime: null,
    status: "Pending",
    pnl: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
    notional: round(notionalFor(meta, orderDraft.quantity, numeric(orderDraft.entryPrice ?? orderDraft.entry, quoteMid(quote))), 2),
    riskAmount: validation.metrics.maxLoss,
    rejectionReason: null,
    warningFlags: validation.warnings
  };

  if (!validation.ok) {
    markOrderAsRejected(state, order, validation);
    recalculateAccount(state, quoteMap);
    state.system.lastExecutionSyncAt = nowIso();
    return {
      state,
      validation,
      result: {
        ok: false,
        notice: validation.hardBlocks[0] || "Order blocked by paper guardrails."
      }
    };
  }

  const immediateFillPrice = shouldTriggerOrder(order, quote);

  if (order.type === "Market" && immediateFillPrice) {
    const fillResult = applyFillToPositions(state, order, immediateFillPrice);
    recordFilledOrder(state, order, immediateFillPrice, fillResult);
  } else if (order.type !== "Market" && immediateFillPrice) {
    const fillResult = applyFillToPositions(state, order, immediateFillPrice);
    recordFilledOrder(state, order, immediateFillPrice, fillResult);
  } else {
    state.orders.unshift(order);
    prependActivity(state, `Queued ${order.symbol} ${order.type}`, "Paper Engine", "Pending", `${order.side} ${order.quantity}`);
    prependAudit(state, "INFO", `${order.symbol} ${order.side} ${order.type} staged in the working order book.`);
  }

  recalculateAccount(state, quoteMap);
  state.system.lastExecutionSyncAt = nowIso();

  return {
    state,
    validation,
    result: {
      ok: true,
      notice:
        order.type === "Market" || immediateFillPrice
          ? `${order.symbol} ${order.side} filled into the paper engine.`
          : `${order.symbol} ${order.type} staged in the paper working book.`
    }
  };
}

export function cancelPaperOrder(currentState, orderId, quoteMap = {}) {
  const state = normalizeDeskState(structuredClone(currentState));
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status !== "Pending") return { state, ok: false };

  order.status = "Cancelled";
  prependActivity(state, `Cancelled ${order.symbol} ${order.type}`, "Paper Engine", "Cancelled", order.id);
  prependAudit(state, "WARN", `${order.symbol} ${order.type} order cancelled by the operator.`);
  recalculateAccount(state, quoteMap);
  state.system.lastExecutionSyncAt = nowIso();
  return { state, ok: true };
}

export function closePaperPosition(currentState, positionId, quoteMap = {}, reason = "Manual Close") {
  const state = normalizeDeskState(structuredClone(currentState));
  const position = state.positions.find((item) => item.id === positionId);
  if (!position) return { state, ok: false };

  closePositionInternal(state, positionId, quoteMap[position.symbol], reason);
  recalculateAccount(state, quoteMap);
  state.system.lastExecutionSyncAt = nowIso();
  return { state, ok: true };
}

export function synchronizePaperState(currentState, quoteMap = {}) {
  const state = normalizeDeskState(structuredClone(currentState));

  for (const order of state.orders) {
    if (order.status !== "Pending") continue;
    const fillPrice = shouldTriggerOrder(order, quoteMap[order.symbol]);
    if (!fillPrice) continue;

    order.status = "Triggered";
    const fillResult = applyFillToPositions(state, order, fillPrice);
    order.status = "Filled";
    order.filledTime = nowIso();
    order.entryPrice = round(fillPrice, getInstrumentMeta(order.symbol).digits);
    order.realizedPnl = round(fillResult.realizedPnl, 2);
    state.fills.unshift(
      createFillRecord(order, fillPrice, fillResult.fillStatus, fillResult.realizedPnl, {
        positionId: fillResult.positionId
      })
    );
    prependActivity(state, `Triggered ${order.symbol} ${order.type}`, "Paper Engine", "Filled", `${order.side} @ ${order.entryPrice}`);
    prependAudit(state, "INFO", `${order.symbol} ${order.type} order triggered into a paper fill.`);
  }

  const positionsToClose = [];

  for (const position of state.positions) {
    const quote = quoteMap[position.symbol];
    if (!quote) continue;

    const mark = quoteMid(quote);
    if (position.side === "Long") {
      if (position.stopLoss > 0 && mark <= position.stopLoss) positionsToClose.push({ id: position.id, reason: "Stop Loss" });
      else if (position.takeProfit > 0 && mark >= position.takeProfit) positionsToClose.push({ id: position.id, reason: "Take Profit" });
    } else {
      if (position.stopLoss > 0 && mark >= position.stopLoss) positionsToClose.push({ id: position.id, reason: "Stop Loss" });
      else if (position.takeProfit > 0 && mark <= position.takeProfit) positionsToClose.push({ id: position.id, reason: "Take Profit" });
    }
  }

  for (const item of positionsToClose) {
    closePositionInternal(state, item.id, quoteMap[state.positions.find((position) => position.id === item.id)?.symbol], item.reason);
  }

  recalculateAccount(state, quoteMap);
  state.system.lastExecutionSyncAt = nowIso();
  return state;
}
