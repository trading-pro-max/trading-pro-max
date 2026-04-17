"use client";

import { startTransition, useEffect, useEffectEvent, useReducer, useRef } from "react";
import { formatCurrency, formatPrice, formatSigned, formatTimestamp, round, toNumber } from "./trading-terminal-utils";

const activityTabs = {
  positions: "Open Positions",
  orders: "Pending Orders",
  fills: "Fills",
  activity: "Activity Log",
  audit: "Audit Trail"
};

function createOrderDraft(seed, market, timeframe, side, currentDraft = {}) {
  const view = market.timeframes[timeframe] || market.timeframes[market.defaultTimeframe];
  const last = view.rawLast;
  const stopDistance =
    market.category === "FX Major"
      ? 0.0016
      : market.category === "Equity Index"
        ? 42
        : market.category === "Digital Asset"
          ? last * 0.012
          : last * 0.0064;
  const targetDistance = stopDistance * 2.35;

  return {
    side,
    type: currentDraft.type || seed.execution.defaults.type,
    tif: currentDraft.tif || seed.execution.defaults.tif,
    quantity: currentDraft.quantity || seed.execution.defaults.quantity,
    entry: view.last,
    stopLoss: formatPrice(side === "Buy" ? last - stopDistance : last + stopDistance, market.digits),
    takeProfit: formatPrice(side === "Buy" ? last + targetDistance : last - targetDistance, market.digits),
    leverage: currentDraft.leverage || seed.execution.defaults.leverage,
    riskAmount: currentDraft.riskAmount || seed.execution.defaults.riskAmount
  };
}

function buildInitialState(seed) {
  const defaultMarket = seed.markets.find((item) => item.symbol === seed.defaultSymbol) || seed.markets[0];
  const defaultSide = seed.execution.defaults.side;

  return {
    activeSection: "Execution",
    selectedSymbol: defaultMarket.symbol,
    selectedTimeframe: seed.chart.defaultTimeframe,
    selectedPanelTab: seed.chart.panelTabs[0],
    activeTool: seed.chart.tools[0],
    selectedActivityTab: "positions",
    searchQuery: "",
    searchOpen: false,
    accountMode: seed.topbar.accountModes[0],
    liveConfirmed: false,
    tradeNotice: "",
    orderDraft: createOrderDraft(seed, defaultMarket, seed.chart.defaultTimeframe, defaultSide, {
      type: seed.execution.defaults.type,
      tif: seed.execution.defaults.tif,
      quantity: seed.execution.defaults.quantity,
      leverage: seed.execution.defaults.leverage,
      riskAmount: seed.execution.defaults.riskAmount
    }),
    indicators: Object.fromEntries(seed.chart.indicators.map((item, index) => [item, index < 4])),
    favorites: Object.fromEntries(seed.markets.map((market) => [market.symbol, Boolean(market.favorite)])),
    telemetry: {
      latencyMs: seed.topbar.connection.latencyMs,
      sequence: seed.topbar.connection.sequence,
      feedHealth: seed.diagnostics.feedHealth,
      runtimeHealth: seed.diagnostics.runtimeHealth
    },
    notifications: seed.topbar.notifications,
    positions: seed.initialState.positions,
    pendingOrders: seed.initialState.pendingOrders,
    fills: seed.initialState.fills,
    activityLog: seed.initialState.activityLog,
    auditTrail: seed.initialState.auditTrail,
    realizedPnl: 0
  };
}

function appendAudit(state, level, message) {
  return [
    {
      id: `AUD-${Date.now()}`,
      time: formatTimestamp(),
      level,
      message
    },
    ...state.auditTrail
  ].slice(0, 24);
}

function appendActivity(state, event, owner, status) {
  return [
    {
      id: `ACT-${Date.now()}`,
      time: formatTimestamp(),
      event,
      owner,
      status
    },
    ...state.activityLog
  ].slice(0, 24);
}

function createOrderPayload(state, market, view) {
  return {
    id: `SIM-${Date.now()}`,
    symbol: market.symbol,
    side: state.orderDraft.side,
    type: state.orderDraft.type,
    tif: state.orderDraft.tif,
    quantity: toNumber(state.orderDraft.quantity, 0),
    entry: toNumber(state.orderDraft.entry, view.rawLast),
    stopLoss: toNumber(state.orderDraft.stopLoss, 0),
    takeProfit: toNumber(state.orderDraft.takeProfit, 0),
    leverage: toNumber(state.orderDraft.leverage, 1),
    riskAmount: toNumber(state.orderDraft.riskAmount, 0),
    accountMode: state.accountMode,
    timestamp: formatTimestamp()
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_SECTION":
      return {
        ...state,
        activeSection: action.section,
        selectedActivityTab:
          action.section === "Positions"
            ? "positions"
            : action.section === "Orders"
              ? "orders"
              : action.section === "Journal"
                ? "audit"
                : state.selectedActivityTab
      };
    case "SET_SYMBOL":
      return {
        ...state,
        selectedSymbol: action.symbol,
        searchOpen: false,
        searchQuery: "",
        tradeNotice: ""
      };
    case "SET_TIMEFRAME":
      return {
        ...state,
        selectedTimeframe: action.timeframe
      };
    case "SET_PANEL_TAB":
      return {
        ...state,
        selectedPanelTab: action.tab
      };
    case "SET_TOOL":
      return {
        ...state,
        activeTool: action.tool
      };
    case "SET_ACTIVITY_TAB":
      return {
        ...state,
        selectedActivityTab: action.tab
      };
    case "SET_SEARCH_QUERY":
      return {
        ...state,
        searchQuery: action.value,
        searchOpen: true
      };
    case "SET_SEARCH_OPEN":
      return {
        ...state,
        searchOpen: action.value
      };
    case "SET_ACCOUNT_MODE":
      return {
        ...state,
        accountMode: action.mode,
        liveConfirmed: action.mode === "Paper" ? false : state.liveConfirmed
      };
    case "SET_LIVE_CONFIRMED":
      return {
        ...state,
        liveConfirmed: action.value
      };
    case "SET_ORDER_FIELD":
      return {
        ...state,
        orderDraft: {
          ...state.orderDraft,
          [action.field]: action.value
        }
      };
    case "SET_SIDE":
      return {
        ...state,
        orderDraft: {
          ...state.orderDraft,
          side: action.side
        }
      };
    case "SYNC_DRAFT":
      return {
        ...state,
        orderDraft: createOrderDraft(action.seed, action.market, action.timeframe, state.orderDraft.side, state.orderDraft)
      };
    case "TOGGLE_INDICATOR":
      return {
        ...state,
        indicators: {
          ...state.indicators,
          [action.indicator]: !state.indicators[action.indicator]
        }
      };
    case "TOGGLE_FAVORITE":
      return {
        ...state,
        favorites: {
          ...state.favorites,
          [action.symbol]: !state.favorites[action.symbol]
        }
      };
    case "SET_NOTICE":
      return {
        ...state,
        tradeNotice: action.notice
      };
    case "TICK_TELEMETRY":
      return {
        ...state,
        telemetry: action.telemetry
      };
    case "ROTATE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.length > 1 ? [...state.notifications.slice(1), state.notifications[0]] : state.notifications
      };
    case "SUBMIT_ORDER": {
      const nextAudit = appendAudit(state, "INFO", action.auditMessage);
      const nextActivity = appendActivity(state, action.activityMessage, "Execution Ticket", action.order.status);

      if (action.order.type === "Market") {
        return {
          ...state,
          positions: [action.position, ...state.positions],
          fills: [action.fill, ...state.fills],
          activityLog: nextActivity,
          auditTrail: nextAudit,
          tradeNotice: action.notice,
          selectedActivityTab: "fills",
          liveConfirmed: state.accountMode === "Live" ? false : state.liveConfirmed
        };
      }

      return {
        ...state,
        pendingOrders: [action.order, ...state.pendingOrders],
        activityLog: nextActivity,
        auditTrail: nextAudit,
        tradeNotice: action.notice,
        selectedActivityTab: "orders",
        liveConfirmed: state.accountMode === "Live" ? false : state.liveConfirmed
      };
    }
    case "FILL_PENDING": {
      const nextPending = state.pendingOrders.filter((order) => order.id !== action.order.id);
      return {
        ...state,
        pendingOrders: nextPending,
        positions: [action.position, ...state.positions],
        fills: [action.fill, ...state.fills],
        activityLog: appendActivity(state, `Filled ${action.order.symbol} ${action.order.side}`, "Execution Engine", "Filled"),
        auditTrail: appendAudit(state, "INFO", `Simulated fill executed for ${action.order.symbol} ${action.order.side}.`),
        selectedActivityTab: "fills",
        tradeNotice: `${action.order.symbol} ${action.order.side} order filled into an open position.`
      };
    }
    case "CANCEL_PENDING":
      return {
        ...state,
        pendingOrders: state.pendingOrders.filter((order) => order.id !== action.order.id),
        activityLog: appendActivity(state, `Canceled ${action.order.symbol} ${action.order.side}`, "Execution Engine", "Canceled"),
        auditTrail: appendAudit(state, "WARN", `Pending order ${action.order.id} canceled by operator.`),
        tradeNotice: `${action.order.symbol} ${action.order.side} order canceled.`
      };
    case "CLOSE_POSITION":
      return {
        ...state,
        positions: state.positions.filter((position) => position.id !== action.position.id),
        fills: [action.fill, ...state.fills],
        realizedPnl: round(state.realizedPnl + action.realizedPnl, 2),
        activityLog: appendActivity(state, `Closed ${action.position.symbol} ${action.position.side}`, "Execution Engine", "Closed"),
        auditTrail: appendAudit(state, action.realizedPnl >= 0 ? "INFO" : "WARN", `Position ${action.position.id} closed with ${formatCurrency(action.realizedPnl)} realized.`),
        selectedActivityTab: "positions",
        tradeNotice: `${action.position.symbol} ${action.position.side} position closed at market.`
      };
    default:
      return state;
  }
}

function getSelectedMarket(seed, state) {
  return seed.markets.find((market) => market.symbol === state.selectedSymbol) || seed.markets[0];
}

function getMarketView(market, timeframe) {
  return market.timeframes[timeframe] || market.timeframes[market.defaultTimeframe];
}

function getMarkPrice(seed, symbol, currentSymbol, currentTimeframe) {
  const market = seed.markets.find((item) => item.symbol === symbol);
  if (!market) return 0;
  const timeframe = symbol === currentSymbol ? currentTimeframe : market.defaultTimeframe;
  return getMarketView(market, timeframe).rawLast;
}

function derivePosition(position, markPrice, digits) {
  const direction = position.side === "Buy" || position.side === "Long" ? 1 : -1;
  const pnl = round((markPrice - position.entry) * position.quantity * direction * 100, 2);
  return {
    ...position,
    mark: formatPrice(markPrice, digits),
    pnl,
    pnlText: formatSigned(pnl, 2, ""),
    status: position.status || "Open"
  };
}

export function useTradingTerminalState(seed) {
  const [state, dispatch] = useReducer(reducer, seed, buildInitialState);
  const searchInputRef = useRef(null);
  const markets = seed.markets;
  const currentMarket = getSelectedMarket(seed, state);
  const currentView = getMarketView(currentMarket, state.selectedTimeframe);

  useEffect(() => {
    dispatch({
      type: "SYNC_DRAFT",
      seed,
      market: currentMarket,
      timeframe: state.selectedTimeframe
    });
  }, [seed, currentMarket, state.selectedSymbol, state.selectedTimeframe, state.orderDraft.side]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextLatency = Math.max(12, Math.min(34, state.telemetry.latencyMs + ((Date.now() / 1000) % 2 > 1 ? 1 : -1)));
      dispatch({
        type: "TICK_TELEMETRY",
        telemetry: {
          latencyMs: nextLatency,
          sequence: state.telemetry.sequence === "SYNC-884.19" ? "SYNC-884.20" : "SYNC-884.19",
          feedHealth: round(nextLatency > 28 ? seed.diagnostics.feedHealth - 0.18 : seed.diagnostics.feedHealth, 2),
          runtimeHealth: round(nextLatency > 28 ? seed.diagnostics.runtimeHealth - 1.6 : seed.diagnostics.runtimeHealth, 1)
        }
      });
      dispatch({ type: "ROTATE_NOTIFICATION" });
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [seed.diagnostics.feedHealth, seed.diagnostics.runtimeHealth, state.telemetry.latencyMs, state.telemetry.sequence]);

  const handleKeyboard = useEffectEvent((event) => {
    const target = event.target;
    const tagName = target?.tagName?.toLowerCase();
    const isFormField = tagName === "input" || tagName === "textarea" || tagName === "select";

    if (event.key === "/" && !isFormField) {
      event.preventDefault();
      searchInputRef.current?.focus();
      dispatch({ type: "SET_SEARCH_OPEN", value: true });
      return;
    }

    if (event.key === "Escape") {
      dispatch({ type: "SET_SEARCH_OPEN", value: false });
      target?.blur?.();
      return;
    }

    if (isFormField) return;

    const currentIndex = markets.findIndex((market) => market.symbol === state.selectedSymbol);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      startTransition(() => {
        dispatch({ type: "SET_SYMBOL", symbol: markets[(currentIndex + 1) % markets.length].symbol });
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      startTransition(() => {
        dispatch({ type: "SET_SYMBOL", symbol: markets[(currentIndex - 1 + markets.length) % markets.length].symbol });
      });
      return;
    }

    if (event.key.toLowerCase() === "f") {
      dispatch({ type: "TOGGLE_FAVORITE", symbol: state.selectedSymbol });
      return;
    }

    if (/^[1-6]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      if (seed.chart.timeframes[index]) {
        dispatch({ type: "SET_TIMEFRAME", timeframe: seed.chart.timeframes[index] });
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  const filteredMarkets = markets.filter((market) => {
    if (!state.searchQuery) return true;
    const haystack = `${market.symbol} ${market.name} ${market.category}`.toLowerCase();
    return haystack.includes(state.searchQuery.toLowerCase());
  });

  const positions = state.positions.map((position) =>
    derivePosition(position, getMarkPrice(seed, position.symbol, state.selectedSymbol, state.selectedTimeframe), markets.find((item) => item.symbol === position.symbol)?.digits ?? 2)
  );

  const openPnl = positions.reduce((sum, position) => sum + position.pnl, 0);
  const openExposure = positions.reduce((sum, position) => sum + Math.abs(position.quantity * position.entry * (markets.find((item) => item.symbol === position.symbol)?.pointValue || 1)), 0);
  const pendingExposure = state.pendingOrders.reduce((sum, order) => sum + Math.abs(order.quantity * order.entry * (markets.find((item) => item.symbol === order.symbol)?.pointValue || 1)), 0);
  const sessionRiskValue = positions.reduce((sum, position) => sum + Math.abs(position.entry - position.stopLoss) * position.quantity, 0) +
    state.pendingOrders.reduce((sum, order) => sum + order.riskAmount, 0) / 1000;
  const sessionPerformance = state.realizedPnl + openPnl;
  const drawdownValue = Math.max(seed.diagnostics.baseDrawdown, sessionPerformance < 0 ? seed.diagnostics.baseDrawdown + Math.abs(sessionPerformance) / 5000 : seed.diagnostics.baseDrawdown * 0.72);
  const guardrailState = sessionRiskValue > 4 || openExposure + pendingExposure > seed.diagnostics.baseExposure * 0.92 ? "Elevated" : state.accountMode === "Live" ? "Armed / Live" : "Armed";

  const diagnostics = {
    exposure: formatCurrency(openExposure + pendingExposure, 0),
    drawdown: `${drawdownValue.toFixed(2)}%`,
    sessionRisk: `${sessionRiskValue.toFixed(2)}R`,
    feedHealth: `${state.telemetry.feedHealth.toFixed(2)}%`,
    runtimeHealth: `${state.telemetry.runtimeHealth.toFixed(1)}%`,
    pnl: formatCurrency(sessionPerformance),
    guardrail: guardrailState,
    alerts: [
      openExposure + pendingExposure > seed.diagnostics.baseExposure * 0.85
        ? "Exposure is approaching the configured session limit."
        : "Exposure remains inside the operator guardrail envelope.",
      state.accountMode === "Live"
        ? "Live routing is enabled. Hard-stop validation remains mandatory."
        : "Paper routing is active. Live escalation remains locked behind confirmation.",
      state.telemetry.latencyMs > 28
        ? "Latency is elevated. Execution quality may degrade."
        : "Connectivity remains inside target execution quality."
    ]
  };

  const selectedPositionCount = positions.filter((position) => position.symbol === state.selectedSymbol).length;
  const selectedPendingCount = state.pendingOrders.filter((order) => order.symbol === state.selectedSymbol).length;
  const intelligence = {
    ...currentMarket.intelligence,
    confidence: currentMarket.intelligence.confidence,
    headline:
      selectedPositionCount > 0
        ? `${currentMarket.symbol} has active risk on the book. AI is now managing execution quality as much as entry logic.`
        : selectedPendingCount > 0
          ? `${currentMarket.symbol} has pending inventory staged. AI focus is on fill quality and invalidation risk.`
          : `${currentMarket.symbol} remains a monitored opportunity with ${currentView.label.toLowerCase()} structure in focus.`,
    warnings: [
      ...currentMarket.intelligence.warnings,
      state.telemetry.latencyMs > 28 ? "Execution latency is elevated for this symbol." : "Feed quality remains supportive for execution."
    ].slice(0, 4),
    whatChanged: [
      ...currentMarket.intelligence.whatChanged,
      state.selectedTimeframe !== currentMarket.defaultTimeframe
        ? `Operator focus shifted to the ${currentView.label.toLowerCase()} context.`
        : "Primary execution context remains anchored to the core intraday timeframe."
    ].slice(0, 4),
    operatorRecommendations: [
      ...currentMarket.intelligence.operatorRecommendations,
      selectedPositionCount > 0 ? "Favor management quality over fresh entry until open risk improves." : "No active risk is attached to this symbol yet."
    ].slice(0, 4)
  };

  const validation = (() => {
    const entry = toNumber(state.orderDraft.entry, currentView.rawLast);
    const stop = toNumber(state.orderDraft.stopLoss, 0);
    const target = toNumber(state.orderDraft.takeProfit, 0);
    const quantity = toNumber(state.orderDraft.quantity, 0);
    const leverage = Math.max(1, toNumber(state.orderDraft.leverage, 1));
    const riskAmount = toNumber(state.orderDraft.riskAmount, 0);
    const isBuy = state.orderDraft.side === "Buy";
    const stopDistance = Math.abs(entry - stop);
    const rewardDistance = Math.abs(target - entry);
    const notional = entry * quantity * currentMarket.pointValue;
    const margin = notional / leverage;
    const maxLoss = stopDistance * quantity * currentMarket.pointValue;
    const rrRatio = stopDistance > 0 ? rewardDistance / stopDistance : 0;

    return {
      items: [
        { label: "Size", ok: quantity > 0, description: quantity > 0 ? "Order size is valid." : "Quantity must be greater than zero." },
        { label: "Stops", ok: stop > 0 && (isBuy ? stop < entry : stop > entry), description: isBuy ? "Stop must sit below entry for buys." : "Stop must sit above entry for sells." },
        { label: "Targets", ok: target > 0 && (isBuy ? target > entry : target < entry), description: isBuy ? "Target remains above entry." : "Target remains below entry." },
        { label: "Risk", ok: riskAmount > 0 && riskAmount <= 5000, description: riskAmount > 0 ? "Risk amount is inside prototype bounds." : "Risk amount must be positive." },
        { label: "Mode", ok: state.accountMode === "Paper" || state.liveConfirmed, description: state.accountMode === "Paper" ? "Paper route is ready." : "Live route requires explicit confirmation." }
      ],
      metrics: {
        entry,
        stop,
        target,
        quantity,
        leverage,
        riskAmount,
        notional,
        margin,
        maxLoss,
        rrRatio
      }
    };
  })();

  function submitOrder(event) {
    event.preventDefault();

    if (!validation.items.every((item) => item.ok)) {
      dispatch({ type: "SET_NOTICE", notice: "Resolve validation items before routing the order." });
      dispatch({
        type: "SET_ACTIVITY_TAB",
        tab: "orders"
      });
      return;
    }

    const payload = createOrderPayload(state, currentMarket, currentView);
    const isImmediateFill = payload.type === "Market";

    if (isImmediateFill) {
      const position = {
        id: `POS-${Date.now()}`,
        symbol: payload.symbol,
        side: payload.side,
        route: currentMarket.route,
        quantity: payload.quantity,
        entry: payload.entry,
        stopLoss: payload.stopLoss,
        takeProfit: payload.takeProfit,
        riskAmount: payload.riskAmount,
        status: "Open",
        accountMode: payload.accountMode,
        openedAt: payload.timestamp
      };

      const fill = {
        id: `FIL-${Date.now()}`,
        symbol: payload.symbol,
        side: payload.side,
        type: payload.type,
        quantity: payload.quantity,
        entry: payload.entry,
        status: "Filled",
        timestamp: payload.timestamp,
        accountMode: payload.accountMode
      };

      dispatch({
        type: "SUBMIT_ORDER",
        order: { ...payload, status: "Filled" },
        position,
        fill,
        notice: `${payload.accountMode.toUpperCase()} ${payload.side} ${payload.symbol} filled immediately at ${formatPrice(payload.entry, currentMarket.digits)}.`,
        auditMessage: `${payload.accountMode} ${payload.type} order for ${payload.symbol} filled immediately.`,
        activityMessage: `Executed ${payload.side} ${payload.symbol}`
      });
      return;
    }

    dispatch({
      type: "SUBMIT_ORDER",
      order: { ...payload, status: "Pending" },
      position: null,
      fill: null,
      notice: `${payload.accountMode.toUpperCase()} ${payload.side} ${payload.symbol} ${payload.type} queued as pending.`,
      auditMessage: `${payload.accountMode} ${payload.type} order for ${payload.symbol} staged in the pending book.`,
      activityMessage: `Staged ${payload.type} ${payload.symbol}`
    });
  }

  function fillPendingOrder(order) {
    const position = {
      id: `POS-${Date.now()}`,
      symbol: order.symbol,
      side: order.side,
      route: markets.find((item) => item.symbol === order.symbol)?.route || "Manual Desk",
      quantity: order.quantity,
      entry: order.entry,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      riskAmount: order.riskAmount,
      status: "Open",
      accountMode: order.accountMode,
      openedAt: formatTimestamp()
    };
    const fill = {
      id: `FIL-${Date.now()}`,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      entry: order.entry,
      status: "Filled",
      timestamp: formatTimestamp(),
      accountMode: order.accountMode
    };
    dispatch({ type: "FILL_PENDING", order, position, fill });
  }

  function cancelPendingOrder(order) {
    dispatch({ type: "CANCEL_PENDING", order });
  }

  function closePosition(position) {
    const markPrice = getMarkPrice(seed, position.symbol, state.selectedSymbol, state.selectedTimeframe);
    const direction = position.side === "Buy" || position.side === "Long" ? 1 : -1;
    const realizedPnl = round((markPrice - position.entry) * position.quantity * direction * 100, 2);
    const fill = {
      id: `FIL-${Date.now()}`,
      symbol: position.symbol,
      side: position.side === "Buy" ? "Sell" : "Buy",
      type: "Close",
      quantity: position.quantity,
      entry: markPrice,
      status: "Closed",
      timestamp: formatTimestamp(),
      accountMode: position.accountMode
    };

    dispatch({ type: "CLOSE_POSITION", position, fill, realizedPnl });
  }

  return {
    state,
    seed,
    currentMarket,
    currentView,
    diagnostics,
    intelligence,
    validation,
    positions,
    filteredMarkets,
    searchInputRef,
    activityTabs,
    actions: {
      setSection: (section) => dispatch({ type: "SET_SECTION", section }),
      setSymbol: (symbol) => dispatch({ type: "SET_SYMBOL", symbol }),
      setTimeframe: (timeframe) => dispatch({ type: "SET_TIMEFRAME", timeframe }),
      setPanelTab: (tab) => dispatch({ type: "SET_PANEL_TAB", tab }),
      setTool: (tool) => dispatch({ type: "SET_TOOL", tool }),
      setActivityTab: (tab) => dispatch({ type: "SET_ACTIVITY_TAB", tab }),
      setSearchQuery: (value) => dispatch({ type: "SET_SEARCH_QUERY", value }),
      setSearchOpen: (value) => dispatch({ type: "SET_SEARCH_OPEN", value }),
      setAccountMode: (mode) => dispatch({ type: "SET_ACCOUNT_MODE", mode }),
      setLiveConfirmed: (value) => dispatch({ type: "SET_LIVE_CONFIRMED", value }),
      setOrderField: (field, value) => dispatch({ type: "SET_ORDER_FIELD", field, value }),
      setSide: (side) => dispatch({ type: "SET_SIDE", side }),
      toggleIndicator: (indicator) => dispatch({ type: "TOGGLE_INDICATOR", indicator }),
      toggleFavorite: (symbol) => dispatch({ type: "TOGGLE_FAVORITE", symbol }),
      submitOrder,
      fillPendingOrder,
      cancelPendingOrder,
      closePosition
    }
  };
}
