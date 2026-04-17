"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";

const activityTabs = {
  positions: "Open Positions",
  orders: "Working Orders",
  fills: "Fills",
  journal: "Decision Journal",
  activity: "Activity Log",
  audit: "Audit Trail"
};

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initialUiState(seed) {
  return {
    activeSection: "Execution",
    selectedPanelTab: seed.chart.panelTabs[0],
    activeTool: seed.chart.tools[0],
    selectedActivityTab: "positions",
    searchQuery: "",
    searchOpen: false,
    liveConfirmed: false,
    accountMode: seed.initialOverview.desk.accountMode,
    pendingControlAction: "",
    indicators: Object.fromEntries(seed.chart.indicators.map((item, index) => [item, index < 4])),
    orderDraft: { ...seed.initialOverview.orderTemplate },
    riskDraft: { ...seed.initialOverview.desk.risk }
  };
}

function mergeOrderDraft(template, current) {
  return {
    side: current.side || template.side,
    type: current.type || template.type,
    tif: current.tif || template.tif,
    quantity: current.quantity || template.quantity,
    entry: template.entry,
    stopLoss: template.stopLoss,
    takeProfit: template.takeProfit,
    leverage: current.leverage || template.leverage,
    riskAmount: template.riskAmount
  };
}

function shallowObjectEqual(left = {}, right = {}, keys = []) {
  return keys.every((key) => left?.[key] === right?.[key]);
}

function orderDraftEqual(left = {}, right = {}) {
  return shallowObjectEqual(left, right, ["side", "type", "tif", "quantity", "entry", "stopLoss", "takeProfit", "leverage", "riskAmount"]);
}

function riskDraftEqual(left = {}, right = {}) {
  return shallowObjectEqual(left, right, [
    "maxPaperPositionNotional",
    "maxSymbolExposure",
    "maxSessionExposure",
    "maxSessionLoss",
    "stopLossPolicy",
    "preventDuplicateOrders",
    "preventConflictingOrders",
    "blockPreviewExecution"
  ]);
}

function providerEqual(left = {}, right = {}) {
  return shallowObjectEqual(left, right, [
    "key",
    "label",
    "requestedKey",
    "requestedLabel",
    "state",
    "feedHealth",
    "freshness",
    "fallbackActive",
    "partialCoverage",
    "blockedReason",
    "lastUpdate",
    "latencyMs",
    "connectionState",
    "sequence"
  ]);
}

function chartEqual(left = {}, right = {}) {
  if (!shallowObjectEqual(left, right, ["key", "label", "symbol", "rawLast", "rawChange", "last", "change", "freshness", "updatedAt", "sourceLabel", "readinessState", "atr", "volume", "imbalance", "syncState"])) {
    return false;
  }

  if ((left.statsStrip || []).length !== (right.statsStrip || []).length) return false;

  return (left.statsStrip || []).every((item, index) => {
    const next = right.statsStrip?.[index];
    return item?.label === next?.label && item?.value === next?.value;
  });
}

function overviewEqual(left = {}, right = {}) {
  return Boolean(left?.overviewSignature) && left.overviewSignature === right?.overviewSignature;
}

function statusEqual(left = {}, right = {}) {
  return shallowObjectEqual(left, right, [
    "loading",
    "chartLoading",
    "actionLoading",
    "error",
    "chartError",
    "providerError",
    "notice",
    "lastUpdatedAt",
    "lastChartUpdateAt"
  ]);
}

function mergeOverviewSnapshot(current, next) {
  if (!current) return next;
  return overviewEqual(current, next) ? current : next;
}

function mergeChartSnapshot(current, next = {}) {
  if (!current) return current;

  const nextProvider = next.provider || current.provider;
  const providerChanged = !providerEqual(current.provider, nextProvider);
  const chartChanged = !chartEqual(current.chart, next.chart);

  if (!providerChanged && !chartChanged) {
    return current;
  }

  return {
    ...current,
    provider: providerChanged ? nextProvider : current.provider,
    chart: chartChanged ? next.chart : current.chart
  };
}

function mergeProviderSnapshot(current, provider) {
  if (!current || providerEqual(current.provider, provider)) {
    return current;
  }

  return {
    ...current,
    provider
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_SECTION":
      return state.activeSection === action.value ? state : { ...state, activeSection: action.value };
    case "SET_PANEL_TAB":
      return state.selectedPanelTab === action.value ? state : { ...state, selectedPanelTab: action.value };
    case "SET_TOOL":
      return state.activeTool === action.value ? state : { ...state, activeTool: action.value };
    case "SET_ACTIVITY_TAB":
      return state.selectedActivityTab === action.value ? state : { ...state, selectedActivityTab: action.value };
    case "SET_SEARCH_QUERY":
      return state.searchQuery === action.value && state.searchOpen ? state : { ...state, searchQuery: action.value, searchOpen: true };
    case "SET_SEARCH_OPEN":
      return state.searchOpen === action.value ? state : { ...state, searchOpen: action.value };
    case "SET_ACCOUNT_MODE":
      if (state.accountMode === action.value && (action.value !== "Paper" || state.liveConfirmed === false)) {
        return state;
      }
      return {
        ...state,
        accountMode: action.value,
        liveConfirmed: action.value === "Paper" ? false : state.liveConfirmed
      };
    case "SET_LIVE_CONFIRMED":
      return state.liveConfirmed === action.value ? state : { ...state, liveConfirmed: action.value };
    case "SET_ORDER_FIELD":
      return state.orderDraft[action.field] === action.value
        ? state
        : { ...state, orderDraft: { ...state.orderDraft, [action.field]: action.value } };
    case "SET_SIDE":
      return state.orderDraft.side === action.value
        ? state
        : { ...state, orderDraft: { ...state.orderDraft, side: action.value } };
    case "TOGGLE_INDICATOR":
      return {
        ...state,
        indicators: { ...state.indicators, [action.value]: !state.indicators[action.value] }
      };
    case "SYNC_TEMPLATE": {
      const nextOrderDraft = mergeOrderDraft(action.value, state.orderDraft);
      const orderDraftChanged = !orderDraftEqual(nextOrderDraft, state.orderDraft);
      const accountModeChanged = Boolean(action.accountMode) && action.accountMode !== state.accountMode;

      if (!orderDraftChanged && !accountModeChanged) return state;

      return {
        ...state,
        orderDraft: orderDraftChanged ? nextOrderDraft : state.orderDraft,
        accountMode: accountModeChanged ? action.accountMode : state.accountMode
      };
    }
    case "SET_RISK_FIELD":
      return state.riskDraft[action.field] === action.value
        ? state
        : { ...state, riskDraft: { ...state.riskDraft, [action.field]: action.value } };
    case "SYNC_RISK":
      return riskDraftEqual(state.riskDraft, action.value) ? state : { ...state, riskDraft: { ...action.value } };
    case "SET_PENDING_CONTROL":
      return state.pendingControlAction === action.value ? state : { ...state, pendingControlAction: action.value };
    default:
      return state;
  }
}

async function safeJson(url, options) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export function useTradingTerminalLiveState(seed) {
  const [ui, dispatch] = useReducer(reducer, seed, initialUiState);
  const [snapshot, setSnapshot] = useState(seed.initialOverview);
  const [status, setStatus] = useState({
    loading: false,
    chartLoading: false,
    actionLoading: false,
    error: "",
    chartError: "",
    providerError: "",
    notice: "",
    lastUpdatedAt: seed.initialOverview.generatedAt,
    lastChartUpdateAt: seed.initialOverview.chart.updatedAt
  });
  const searchInputRef = useRef(null);
  const mountedRef = useRef(true);
  const snapshotRef = useRef(seed.initialOverview);
  const requestRegistryRef = useRef({
    overview: { key: "", seq: 0, promise: null },
    chart: { key: "", seq: 0, promise: null },
    provider: { key: "", seq: 0, promise: null }
  });
  const selectedSymbol = snapshot?.desk.selectedSymbol || seed.initialOverview.desk.selectedSymbol;
  const selectedTimeframe = snapshot?.desk.selectedTimeframe || seed.initialOverview.desk.selectedTimeframe;
  const providerKey = snapshot?.desk.providerKey || seed.initialOverview.desk.providerKey;
  const refreshPolicyKey =
    snapshot?.desk.controls?.refreshPolicyKey ||
    seed.initialOverview?.desk.controls?.refreshPolicyKey ||
    "Balanced";
  const refreshPolicy = snapshot.controlCenter?.refreshPolicy || seed.initialOverview.controlCenter.refreshPolicy;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setStatusIfChanged = useEffectEvent((updater) => {
    setStatus((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return statusEqual(current, next) ? current : next;
    });
  });

  const applySnapshot = useEffectEvent((nextSnapshot) => {
    const merged = mergeOverviewSnapshot(snapshotRef.current, nextSnapshot);
    if (merged === snapshotRef.current) {
      return false;
    }

    snapshotRef.current = merged;
    setSnapshot(merged);
    return true;
  });

  const applyChartUpdate = useEffectEvent((nextChartPayload) => {
    const merged = mergeChartSnapshot(snapshotRef.current, nextChartPayload);
    if (merged === snapshotRef.current) {
      return false;
    }

    snapshotRef.current = merged;
    setSnapshot(merged);
    return true;
  });

  const applyProviderUpdate = useEffectEvent((nextProvider) => {
    const merged = mergeProviderSnapshot(snapshotRef.current, nextProvider);
    if (merged === snapshotRef.current) {
      return false;
    }

    snapshotRef.current = merged;
    setSnapshot(merged);
    return true;
  });

  const invalidatePollingRequests = useEffectEvent(() => {
    Object.values(requestRegistryRef.current).forEach((entry) => {
      entry.seq += 1;
      entry.key = "";
      entry.promise = null;
    });
  });

  const runDedupedRequest = useEffectEvent(async (channel, key, handler) => {
    const registry = requestRegistryRef.current[channel];

    if (registry.promise && registry.key === key) {
      return registry.promise;
    }

    const seq = registry.seq + 1;
    registry.seq = seq;
    registry.key = key;

    const promise = (async () => {
      try {
        return await handler(() => mountedRef.current && requestRegistryRef.current[channel].seq === seq);
      } finally {
        const latest = requestRegistryRef.current[channel];
        if (latest.seq === seq) {
          latest.promise = null;
          latest.key = "";
        }
      }
    })();

    registry.promise = promise;
    return promise;
  });

  useEffect(() => {
    dispatch({
      type: "SYNC_TEMPLATE",
      value: snapshot.orderTemplate,
      accountMode: snapshot.desk.accountMode
    });
  }, [snapshot.orderTemplate, snapshot.desk.accountMode, snapshot.desk.selectedSymbol, snapshot.desk.selectedTimeframe]);

  useEffect(() => {
    dispatch({
      type: "SYNC_RISK",
      value: snapshot.desk.risk
    });
  }, [
    snapshot.desk.risk.maxPaperPositionNotional,
    snapshot.desk.risk.maxSymbolExposure,
    snapshot.desk.risk.maxSessionExposure,
    snapshot.desk.risk.maxSessionLoss,
    snapshot.desk.risk.stopLossPolicy,
    snapshot.desk.risk.preventDuplicateOrders,
    snapshot.desk.risk.preventConflictingOrders,
    snapshot.desk.risk.blockPreviewExecution
  ]);

  const refreshOverview = useEffectEvent(async ({ showLoading = false, symbol = selectedSymbol, timeframe = selectedTimeframe } = {}) => {
    if (showLoading) {
      setStatusIfChanged((current) => (current.loading && !current.error ? current : { ...current, loading: true, error: "" }));
    }

    const requestKey = `${symbol}|${timeframe}`;

    await runDedupedRequest("overview", requestKey, async (isCurrent) => {
      try {
        const next = await safeJson(`/api/terminal/overview?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
        if (!isCurrent()) return;

        const snapshotChanged = applySnapshot(next);
        setStatusIfChanged((current) => ({
          ...current,
          loading: false,
          error: "",
          providerError: "",
          lastUpdatedAt: snapshotChanged ? next.generatedAt : current.lastUpdatedAt
        }));
      } catch (error) {
        if (!isCurrent()) return;

        setStatusIfChanged((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Overview refresh failed."
        }));
      }
    });
  });

  const refreshChart = useEffectEvent(async ({ showLoading = false, symbol = selectedSymbol, timeframe = selectedTimeframe } = {}) => {
    if (showLoading) {
      setStatusIfChanged((current) =>
        current.chartLoading && !current.chartError ? current : { ...current, chartLoading: true, chartError: "" }
      );
    }

    const requestKey = `${symbol}|${timeframe}`;

    await runDedupedRequest("chart", requestKey, async (isCurrent) => {
      try {
        const next = await safeJson(`/api/terminal/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
        if (!isCurrent()) return;

        const snapshotChanged = applyChartUpdate(next);
        setStatusIfChanged((current) => ({
          ...current,
          chartLoading: false,
          chartError: "",
          lastChartUpdateAt: snapshotChanged ? next.chart.updatedAt || current.lastChartUpdateAt : current.lastChartUpdateAt
        }));
      } catch (error) {
        if (!isCurrent()) return;

        setStatusIfChanged((current) => ({
          ...current,
          chartLoading: false,
          chartError: error instanceof Error ? error.message : "Chart refresh failed."
        }));
      }
    });
  });

  const refreshProvider = useEffectEvent(async ({ key = providerKey } = {}) => {
    await runDedupedRequest("provider", key || "provider", async (isCurrent) => {
      try {
        const provider = await safeJson("/api/terminal/provider");
        if (!isCurrent()) return;

        applyProviderUpdate(provider);
        setStatusIfChanged((current) => (current.providerError ? { ...current, providerError: "" } : current));
      } catch (error) {
        if (!isCurrent()) return;

        setStatusIfChanged((current) => ({
          ...current,
          providerError: error instanceof Error ? error.message : "Provider status failed."
        }));
      }
    });
  });

  const syncDesk = useEffectEvent(async (payload) => {
    const next = await safeJson("/api/terminal/desk", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    invalidatePollingRequests();
    const snapshotChanged = applySnapshot(next);
    setStatusIfChanged((current) => ({
      ...current,
      lastUpdatedAt: snapshotChanged ? next.generatedAt : current.lastUpdatedAt,
      notice: payload.notice || current.notice
    }));
    return next;
  });

  const runControlAction = useEffectEvent(async (action, extra = {}) => {
    setStatusIfChanged((current) => (current.actionLoading ? current : { ...current, actionLoading: true }));

    try {
      const response = await safeJson("/api/terminal/control", {
        method: "POST",
        body: JSON.stringify({ action, ...extra })
      });

      if (response.overview) {
        invalidatePollingRequests();
        applySnapshot(response.overview);
      }

      dispatch({ type: "SET_PENDING_CONTROL", value: "" });
      setStatusIfChanged((current) => ({
        ...current,
        actionLoading: false,
        notice: response.notice || ""
      }));
    } catch (error) {
      setStatusIfChanged((current) => ({
        ...current,
        actionLoading: false,
        notice: error instanceof Error ? error.message : "Control action failed."
      }));
    }
  });

  useEffect(() => {
    refreshOverview({ showLoading: true, symbol: selectedSymbol, timeframe: selectedTimeframe });
    refreshChart({ showLoading: true, symbol: selectedSymbol, timeframe: selectedTimeframe });
    refreshProvider({ key: providerKey });

    const overviewInterval = window.setInterval(() => {
      refreshOverview({ symbol: selectedSymbol, timeframe: selectedTimeframe });
    }, refreshPolicy.overviewMs);
    const chartInterval = window.setInterval(() => {
      refreshChart({ symbol: selectedSymbol, timeframe: selectedTimeframe });
    }, refreshPolicy.chartMs);
    const providerInterval = window.setInterval(() => {
      refreshProvider({ key: providerKey });
    }, refreshPolicy.providerMs);

    return () => {
      window.clearInterval(overviewInterval);
      window.clearInterval(chartInterval);
      window.clearInterval(providerInterval);
    };
  }, [providerKey, refreshPolicyKey, refreshPolicy.chartMs, refreshPolicy.overviewMs, refreshPolicy.providerMs, selectedSymbol, selectedTimeframe]);

  const handleKeyboard = useEffectEvent((event) => {
    const target = event.target;
    const tagName = target?.tagName?.toLowerCase();
    const isFormField = tagName === "input" || tagName === "textarea" || tagName === "select";
    const watchlist = snapshot.watchlist || [];
    const currentIndex = watchlist.findIndex((market) => market.symbol === selectedSymbol);

    if (event.key === "/" && !isFormField) {
      event.preventDefault();
      searchInputRef.current?.focus();
      dispatch({ type: "SET_SEARCH_OPEN", value: true });
      return;
    }

    if (event.key === "Escape") {
      dispatch({ type: "SET_SEARCH_OPEN", value: false });
      dispatch({ type: "SET_PENDING_CONTROL", value: "" });
      target?.blur?.();
      return;
    }

    if (isFormField) return;

    if (event.key === "ArrowDown" && watchlist.length) {
      event.preventDefault();
      const nextSymbol = watchlist[(currentIndex + 1 + watchlist.length) % watchlist.length].symbol;
      startTransition(() => {
        syncDesk({ selectedSymbol: nextSymbol });
      });
      return;
    }

    if (event.key === "ArrowUp" && watchlist.length) {
      event.preventDefault();
      const nextSymbol = watchlist[(currentIndex - 1 + watchlist.length) % watchlist.length].symbol;
      startTransition(() => {
        syncDesk({ selectedSymbol: nextSymbol });
      });
      return;
    }

    if (/^[1-6]$/.test(event.key)) {
      const nextTimeframe = seed.chart.timeframes[Number(event.key) - 1];
      if (nextTimeframe) {
        startTransition(() => {
          syncDesk({ selectedTimeframe: nextTimeframe });
        });
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const filteredMarkets = useMemo(() => {
    const query = ui.searchQuery.trim().toLowerCase();
    if (!query) return snapshot.watchlist || [];

    return (snapshot.watchlist || []).filter((market) =>
      `${market.symbol} ${market.name} ${market.category}`.toLowerCase().includes(query)
    );
  }, [snapshot.watchlist, ui.searchQuery]);

  const validation = useMemo(() => {
    const currentMarket = snapshot.selectedMarket;
    const entry = toNumber(ui.orderDraft.entry, snapshot.chart.rawLast);
    const stop = toNumber(ui.orderDraft.stopLoss, 0);
    const target = toNumber(ui.orderDraft.takeProfit, 0);
    const quantity = toNumber(ui.orderDraft.quantity, 0);
    const leverage = Math.max(1, toNumber(ui.orderDraft.leverage, 1));
    const isBuy = ui.orderDraft.side !== "Sell";
    const notional = entry * quantity * currentMarket.pointValue;
    const margin = notional / leverage;
    const maxLoss = stop > 0 ? Math.abs(entry - stop) * quantity * currentMarket.pointValue : 0;
    const rewardRisk = stop > 0 && target > 0 ? Math.abs(target - entry) / Math.abs(entry - stop) : 0;
    const exposureUsed = snapshot.diagnostics.rawExposure || 0;
    const symbolExposure = toNumber(snapshot.account.exposureBySymbol?.[currentMarket.symbol], 0);
    const conflicting = (snapshot.positions || []).find((position) => position.symbol === currentMarket.symbol && position.side !== ui.orderDraft.side);
    const duplicatePending = (snapshot.pendingOrders || []).find(
      (order) =>
        order.symbol === currentMarket.symbol &&
        order.side === ui.orderDraft.side &&
        order.type === ui.orderDraft.type &&
        Math.abs(toNumber(order.quantity, 0) - quantity) < 0.0001 &&
        Math.abs(toNumber(order.rawEntry, 0) - entry) <= Math.max(currentMarket.tickSize, 0.0001)
    );
    const conflictingPending = (snapshot.pendingOrders || []).find(
      (order) => order.symbol === currentMarket.symbol && order.side !== ui.orderDraft.side
    );
    const sessionLoss = Math.abs(Math.min(0, snapshot.account.sessionPnl || 0));
    const remainingLossBudget = Math.max(0, snapshot.desk.risk.maxSessionLoss - sessionLoss);
    const warnings = [];
    const hardBlocks = [];

    if (quantity <= 0) hardBlocks.push("Quantity must be greater than zero.");
    if (snapshot.desk.risk.stopLossPolicy === "required" && stop <= 0) hardBlocks.push("Stop loss is required in the paper desk.");
    if (snapshot.desk.risk.stopLossPolicy === "warn-only" && stop <= 0) warnings.push("Stop loss is missing and policy is warning-only.");
    if (stop > 0 && (isBuy ? stop >= entry : stop <= entry)) hardBlocks.push(isBuy ? "Buy stop must sit below entry." : "Sell stop must sit above entry.");
    if (target > 0 && (isBuy ? target <= entry : target >= entry)) hardBlocks.push(isBuy ? "Buy take profit must sit above entry." : "Sell take profit must sit below entry.");
    if (notional > snapshot.desk.risk.maxPaperPositionNotional) hardBlocks.push("Order size exceeds the paper position cap.");
    if (symbolExposure + notional > snapshot.desk.risk.maxSymbolExposure) hardBlocks.push("Order breaches the symbol exposure guardrail.");
    if (exposureUsed + notional > snapshot.desk.risk.maxSessionExposure) hardBlocks.push("Order breaches the session exposure guardrail.");
    if (snapshot.account.sessionPnl <= -snapshot.desk.risk.maxSessionLoss) hardBlocks.push("Session loss threshold has already been reached.");
    if (stop > 0 && maxLoss > remainingLossBudget) hardBlocks.push("Stop-loss risk would breach the session loss limit.");
    if (ui.accountMode !== "Paper") hardBlocks.push("Preview mode remains execution-locked.");
    if (snapshot.desk.risk.preventDuplicateOrders && duplicatePending) hardBlocks.push("A duplicate pending order already exists.");
    if (snapshot.desk.risk.preventConflictingOrders && conflictingPending) hardBlocks.push("A conflicting pending order already exists.");
    if (conflicting) warnings.push(`Conflicting ${conflicting.side.toLowerCase()} exposure is already open on ${conflicting.symbol}.`);
    if (notional > snapshot.desk.risk.maxPaperPositionNotional * 0.82) warnings.push("Order size is approaching the configured cap.");
    if (symbolExposure + notional > snapshot.desk.risk.maxSymbolExposure * 0.85) warnings.push("Per-symbol exposure is close to the configured ceiling.");
    if (remainingLossBudget <= snapshot.desk.risk.maxSessionLoss * 0.2) warnings.push("Remaining session loss budget is tight.");
    if (stop <= 0 && snapshot.desk.risk.stopLossPolicy === "warn-only") warnings.push("Missing stop-loss policy is being tolerated, not approved.");

    return {
      items: [
        {
          label: "Size",
          ok: quantity > 0,
          description: quantity > 0 ? "Order size is valid." : "Quantity must be greater than zero."
        },
        {
          label: "Stops",
          ok: stop > 0 ? (isBuy ? stop < entry : stop > entry) : snapshot.desk.risk.stopLossPolicy === "warn-only",
          description: snapshot.desk.risk.stopLossPolicy === "required" ? "Stop policy is hard-required." : "Stop policy is warning-only."
        },
        {
          label: "Exposure",
          ok: exposureUsed + notional <= snapshot.desk.risk.maxSessionExposure,
          description: "Session exposure remains inside local governance."
        },
        {
          label: "Symbol Cap",
          ok: symbolExposure + notional <= snapshot.desk.risk.maxSymbolExposure,
          description: "Per-symbol exposure remains inside the active guardrail."
        },
        {
          label: "Loss Budget",
          ok: snapshot.account.sessionPnl > -snapshot.desk.risk.maxSessionLoss && (stop <= 0 || maxLoss <= remainingLossBudget),
          description: "Projected stop risk stays inside the session loss threshold."
        }
      ],
      warnings,
      hardBlocks,
      metrics: {
        entry,
        stop,
        target,
        quantity,
        leverage,
        notional,
        margin,
        maxLoss,
        rrRatio: rewardRisk,
        symbolExposure,
        remainingLossBudget
      }
    };
  }, [ui.orderDraft, ui.accountMode, snapshot]);

  const submitOrder = useEffectEvent(async (event) => {
    event.preventDefault();

    if (validation.hardBlocks.length) {
      setStatusIfChanged((current) => ({ ...current, notice: validation.hardBlocks[0] }));
      return;
    }

    try {
      const response = await safeJson("/api/terminal/orders", {
        method: "POST",
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: ui.orderDraft.side,
          quantity: ui.orderDraft.quantity,
          type: ui.orderDraft.type,
          entry: ui.orderDraft.entry,
          stopLoss: ui.orderDraft.stopLoss,
          takeProfit: ui.orderDraft.takeProfit,
          leverage: ui.orderDraft.leverage
        })
      });

      if (response.overview) {
        invalidatePollingRequests();
        applySnapshot(response.overview);
      }
      setStatusIfChanged((current) => ({ ...current, notice: response.notice || "" }));
    } catch (error) {
      setStatusIfChanged((current) => ({
        ...current,
        notice: error instanceof Error ? error.message : "Order submission failed."
      }));
    }
  });

  const cancelPendingOrder = useEffectEvent(async (order) => {
    const response = await safeJson("/api/terminal/orders", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", orderId: order.id })
    });

    if (response.overview) {
      invalidatePollingRequests();
      applySnapshot(response.overview);
    }
    setStatusIfChanged((current) => ({ ...current, notice: `${order.symbol} order cancelled.` }));
  });

  const closePosition = useEffectEvent(async (position) => {
    const response = await safeJson("/api/terminal/positions", {
      method: "POST",
      body: JSON.stringify({ positionId: position.id })
    });

    if (response.overview) {
      invalidatePollingRequests();
      applySnapshot(response.overview);
    }
    setStatusIfChanged((current) => ({ ...current, notice: `${position.symbol} position closed.` }));
  });

  const currentMarket = snapshot.selectedMarket;
  const currentView = snapshot.chart;
  const diagnostics = snapshot.diagnostics;
  const intelligence = snapshot.selectedMarket.intelligence;
  const state = {
    activeSection: ui.activeSection,
    selectedSymbol,
    selectedTimeframe,
    selectedPanelTab: ui.selectedPanelTab,
    activeTool: ui.activeTool,
    selectedActivityTab: ui.selectedActivityTab,
    searchQuery: ui.searchQuery,
    searchOpen: ui.searchOpen,
    accountMode: ui.accountMode,
    liveConfirmed: ui.liveConfirmed,
    tradeNotice: status.notice,
    orderDraft: ui.orderDraft,
    indicators: ui.indicators,
    favorites: snapshot.desk.favorites,
    pendingControlAction: ui.pendingControlAction,
    riskDraft: ui.riskDraft,
    telemetry: {
      latencyMs: snapshot.provider.latencyMs,
      sequence: snapshot.provider.sequence,
      feedHealth: snapshot.provider.feedHealth,
      runtimeHealth: snapshot.diagnostics.runtimeHealth
    },
    notifications: snapshot.session.notifications,
    pendingOrders: snapshot.pendingOrders,
    fills: snapshot.fills,
    activityLog: snapshot.activityLog,
    auditTrail: snapshot.auditTrail,
    decisionJournal: snapshot.decisionJournal,
    recommendationHistory: snapshot.recommendationHistory,
    controlCenter: snapshot.controlCenter,
    connectorReadiness: snapshot.connectorReadiness
  };

  return {
    state,
    seed,
    snapshot,
    currentMarket,
    currentView,
    diagnostics,
    intelligence,
    operatorAssistant: snapshot.operatorAssistant,
    controlCenter: snapshot.controlCenter,
    connectorReadiness: snapshot.connectorReadiness,
    status,
    validation,
    positions: snapshot.positions,
    filteredMarkets,
    searchInputRef,
    activityTabs,
    actions: {
      setSection: (value) => dispatch({ type: "SET_SECTION", value }),
      setSymbol: (symbol) => syncDesk({ selectedSymbol: symbol }),
      setTimeframe: (value) => syncDesk({ selectedTimeframe: value }),
      setPanelTab: (value) => dispatch({ type: "SET_PANEL_TAB", value }),
      setTool: (value) => dispatch({ type: "SET_TOOL", value }),
      setActivityTab: (value) => dispatch({ type: "SET_ACTIVITY_TAB", value }),
      setSearchQuery: (value) => dispatch({ type: "SET_SEARCH_QUERY", value }),
      setSearchOpen: (value) => dispatch({ type: "SET_SEARCH_OPEN", value }),
      setAccountMode: (value) => {
        dispatch({ type: "SET_ACCOUNT_MODE", value });
        syncDesk({ accountMode: value });
      },
      setProviderKey: (value) => syncDesk({ providerKey: value }),
      setRefreshPolicy: (value) => syncDesk({ refreshPolicyKey: value }),
      setLiveConfirmed: (value) => dispatch({ type: "SET_LIVE_CONFIRMED", value }),
      setOrderField: (field, value) => dispatch({ type: "SET_ORDER_FIELD", field, value }),
      setSide: (value) => dispatch({ type: "SET_SIDE", value }),
      toggleIndicator: (value) => dispatch({ type: "TOGGLE_INDICATOR", value }),
      toggleFavorite: (symbol) =>
        syncDesk({
          favorites: {
            ...snapshot.desk.favorites,
            [symbol]: !snapshot.desk.favorites[symbol]
          }
        }),
      setRiskField: (field, value) => dispatch({ type: "SET_RISK_FIELD", field, value }),
      saveRiskSettings: () =>
        syncDesk({
          risk: {
            ...ui.riskDraft,
            maxPaperPositionNotional: toNumber(ui.riskDraft.maxPaperPositionNotional, snapshot.desk.risk.maxPaperPositionNotional),
            maxSymbolExposure: toNumber(ui.riskDraft.maxSymbolExposure, snapshot.desk.risk.maxSymbolExposure),
            maxSessionExposure: toNumber(ui.riskDraft.maxSessionExposure, snapshot.desk.risk.maxSessionExposure),
            maxSessionLoss: toNumber(ui.riskDraft.maxSessionLoss, snapshot.desk.risk.maxSessionLoss)
          }
        }).then(() => setStatus((current) => ({ ...current, notice: "Risk policy updated." }))),
      armControlAction: (value) => dispatch({ type: "SET_PENDING_CONTROL", value }),
      clearControlAction: () => dispatch({ type: "SET_PENDING_CONTROL", value: "" }),
      executeControlAction: (action) => runControlAction(action),
      submitOrder,
      cancelPendingOrder,
      closePosition,
      fillPendingOrder: () =>
        setStatusIfChanged((current) => ({
          ...current,
          notice: "Pending orders continue to trigger automatically from live market prices."
        })),
      refreshOverview: (showLoading = false) => refreshOverview({ showLoading }),
      refreshChart: (showLoading = false) => refreshChart({ showLoading }),
      refreshProvider
    }
  };
}
