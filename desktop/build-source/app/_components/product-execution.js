"use client";

const executionProviderCatalog = [
  {
    key: "paper",
    label: "Paper Execution",
    mode: "Paper",
    state: "Connected",
    tone: "success",
    description: "Local paper execution engine handling ticket staging, amendments, fills, and closes inside Trading Pro Max."
  },
  {
    key: "broker-ready",
    label: "Broker Adapter Ready",
    mode: "Live-ready",
    state: "Not configured",
    tone: "warning",
    description: "Reserved execution slot for a future compliant broker connector. No live brokerage orders are sent from this build."
  }
];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function parseSize(value) {
  const parsed = Number.parseFloat(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSize(value) {
  return parseSize(value).toFixed(2);
}

function normalizeStatusValue(status) {
  if (status === "Partial Fill") return "Partially Filled";
  return status === "Filled" ? "Filled" : status;
}

function upsertPosition(openPositions, nextPosition, helpers) {
  const nextKey = helpers.createPositionKey(nextPosition);
  return [
    nextPosition,
    ...openPositions.filter((position) => helpers.createPositionKey(position) !== nextKey)
  ];
}

function updateOrder(recentOrders, orderId, updater) {
  return recentOrders.map((order) => (order.id === orderId ? updater(order) : order));
}

function pushExecutionEvent(currentEvents = [], helpers, payload) {
  return [helpers.createExecutionEvent(payload), ...currentEvents];
}

function buildExecutionDetail(order, event, extraDetail = "") {
  const base = `${order.symbol} ${order.side} ${order.type} ${event.toLowerCase()}`;
  return extraDetail ? `${base}. ${extraDetail}` : `${base}.`;
}

function runPaperExecution(action, current, payload, helpers) {
  switch (action) {
    case "stageOrder": {
      const side = payload.side || current.orderTicket?.side || "Buy";
      const stagedOrder = helpers.createOrderRecord(current, side, "Staged", {
        filledSize: "0.00",
        remainingSize: formatSize(current.orderTicket?.size || 0),
        ackState: "Staged"
      });

      return {
        recentOrders: [stagedOrder, ...current.recentOrders],
        recentActions: helpers.pushAction(
          current.recentActions,
          "Order staged",
          `${current.selectedSymbol} ${side} ${current.orderTicket?.size || "--"} staged in the paper execution lane.`,
          "Staged"
        ),
        executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
          orderId: stagedOrder.id,
          symbol: stagedOrder.symbol,
          route: stagedOrder.route,
          event: "Staged",
          status: "Staged",
          detail: buildExecutionDetail(stagedOrder, "staged"),
          provider: "Paper Execution"
        })
      };
    }

    case "placeOrder": {
      const side = payload.side || current.orderTicket?.side || "Buy";
      const existingOrder = payload.orderId
        ? current.recentOrders.find((order) => order.id === payload.orderId)
        : null;

      if (existingOrder && !["Staged", "Working", "Partially Filled"].includes(existingOrder.status)) {
        return {};
      }

      const nextStatus =
        current.orderTicket?.type === "Market" && !existingOrder ? "Filled" : "Working";
      const recentOrders = existingOrder
        ? updateOrder(current.recentOrders, payload.orderId, (order) =>
            helpers.normalizeOrder({
              ...order,
              side,
              status: order.status === "Staged" ? "Working" : order.status,
              ackState: order.status === "Staged" ? "Accepted" : order.ackState || "Accepted",
              ackTime: helpers.getTimeLabel(),
              time: helpers.getTimeLabel(),
              route: current.selectedRoute?.name || order.route
            })
          )
        : [
            helpers.createOrderRecord(current, side, nextStatus, {
              ackState: nextStatus === "Filled" ? "Immediate Fill" : "Accepted",
              ackTime: helpers.getTimeLabel(),
              filledSize: nextStatus === "Filled" ? formatSize(current.orderTicket?.size || 0) : "0.00",
              remainingSize:
                nextStatus === "Filled" ? "0.00" : formatSize(current.orderTicket?.size || 0)
            }),
            ...current.recentOrders
          ];
      const activeOrder =
        recentOrders.find((order) => order.id === payload.orderId) || recentOrders[0];
      const nextState = {
        recentOrders,
        openPositions: current.openPositions,
        sessionNotes: current.sessionNotes,
        recentActions: helpers.pushAction(
          current.recentActions,
          activeOrder?.status === "Filled" ? `${side} order filled` : "Order acknowledged",
          activeOrder?.status === "Filled"
            ? `${current.selectedSymbol} ${side} ${current.orderTicket?.size || "--"} filled in paper execution.`
            : `${current.selectedSymbol} ${side} ${current.orderTicket?.size || "--"} accepted into the working queue.`,
          activeOrder?.status || nextStatus
        ),
        executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
          orderId: activeOrder.id,
          symbol: activeOrder.symbol,
          route: activeOrder.route,
          event: activeOrder.status === "Filled" ? "Filled" : "Accepted",
          status: activeOrder.status || nextStatus,
          detail:
            activeOrder.status === "Filled"
              ? buildExecutionDetail(activeOrder, "filled")
              : buildExecutionDetail(activeOrder, "accepted", "Working queue is now active."),
          provider: "Paper Execution"
        })
      };

      if (activeOrder?.status === "Filled") {
        nextState.openPositions = upsertPosition(
          current.openPositions,
          helpers.createPositionRecord(current, {
            ...activeOrder,
            lifecycle: "Filled",
            status: current.protectionState === "Locked" ? "Protected" : "In plan"
          }),
          helpers
        );
        nextState.sessionNotes = [
          {
            id: helpers.createId("NOTE"),
            symbol: activeOrder.symbol,
            route: activeOrder.route,
            text: `${side} paper order filled at ${activeOrder.entry} with ${activeOrder.size} size.`
          },
          ...current.sessionNotes
        ];
      }

      return nextState;
    }

    case "amendOrder": {
      const target = current.recentOrders.find((order) => order.id === payload.orderId);
      if (!target || !["Staged", "Working", "Partially Filled"].includes(target.status)) {
        return {};
      }

      const patch = payload.patch || {};
      const recentOrders = updateOrder(current.recentOrders, payload.orderId, (order) =>
        helpers.normalizeOrder({
          ...order,
          size: patch.size || current.orderTicket?.size || order.size,
          entry: patch.entry || current.orderTicket?.entry || order.entry,
          stop: patch.stop || current.orderTicket?.stop || order.stop,
          target: patch.target || current.orderTicket?.target || order.target,
          type: patch.type || current.orderTicket?.type || order.type,
          ackState: "Amend Ack",
          ackTime: helpers.getTimeLabel(),
          time: helpers.getTimeLabel()
        })
      );

      return {
        recentOrders,
        recentActions: helpers.pushAction(
          current.recentActions,
          "Amend acknowledged",
          `${target.symbol} ${target.side} ${target.type} order amendment was acknowledged by paper execution.`,
          target.status
        ),
        executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
          orderId: target.id,
          symbol: target.symbol,
          route: target.route,
          event: "Amend Ack",
          status: target.status,
          detail: buildExecutionDetail(target, "amended", "Ticket amendments are active."),
          provider: "Paper Execution"
        })
      };
    }

    case "updateStatus": {
      const target = current.recentOrders.find((order) => order.id === payload.orderId);
      const nextStatus = normalizeStatusValue(payload.status);
      if (!target || target.status === nextStatus) {
        return {};
      }

      const nextState = {
        recentOrders: current.recentOrders,
        recentActions: current.recentActions,
        openPositions: current.openPositions,
        sessionNotes: current.sessionNotes,
        executionEvents: current.executionEvents || []
      };

      if (nextStatus === "Partially Filled") {
        const totalSize = parseSize(target.size);
        const currentFilled = parseSize(target.filledSize);
        const remainingBefore = Math.max(totalSize - currentFilled, 0);
        const defaultFillSize = remainingBefore > 0 ? Math.max(remainingBefore / 2, 0.25) : Math.max(totalSize / 2, 0.25);
        const fillSize = clamp(
          payload.fillSize ? parseSize(payload.fillSize) : defaultFillSize,
          0,
          remainingBefore || totalSize || defaultFillSize
        );
        const nextFilled = totalSize ? clamp(currentFilled + fillSize, 0, totalSize) : fillSize;
        const remainingSize = Math.max(totalSize - nextFilled, 0);
        const updatedOrder = helpers.normalizeOrder({
          ...target,
          status: remainingSize > 0 ? "Partially Filled" : "Filled",
          filledSize: formatSize(nextFilled),
          remainingSize: formatSize(remainingSize),
          avgFillPrice: payload.fillPrice || target.avgFillPrice || target.entry,
          ackState: "Partial Fill",
          ackTime: helpers.getTimeLabel(),
          time: helpers.getTimeLabel()
        });

        nextState.recentOrders = updateOrder(current.recentOrders, payload.orderId, () => updatedOrder);
        nextState.openPositions = upsertPosition(
          current.openPositions,
          helpers.createPositionRecord(current, {
            ...updatedOrder,
            size: formatSize(nextFilled),
            entry: updatedOrder.avgFillPrice || updatedOrder.entry,
            mark: updatedOrder.avgFillPrice || updatedOrder.entry,
            lifecycle: updatedOrder.status,
            status: remainingSize > 0 ? "Scaling" : "In plan"
          }),
          helpers
        );
        nextState.sessionNotes = [
          {
            id: helpers.createId("NOTE"),
            symbol: updatedOrder.symbol,
            route: updatedOrder.route,
            text: `${updatedOrder.symbol} ${updatedOrder.side} partially filled ${formatSize(nextFilled)} of ${updatedOrder.size} in paper execution.`
          },
          ...current.sessionNotes
        ];
        nextState.recentActions = helpers.pushAction(
          current.recentActions,
          "Partial fill",
          `${updatedOrder.symbol} ${updatedOrder.side} now has ${updatedOrder.filledSize} filled and ${updatedOrder.remainingSize} remaining.`,
          updatedOrder.status
        );
        nextState.executionEvents = pushExecutionEvent(current.executionEvents, helpers, {
          orderId: updatedOrder.id,
          symbol: updatedOrder.symbol,
          route: updatedOrder.route,
          event: "Partial Fill",
          status: updatedOrder.status,
          detail: `${updatedOrder.symbol} ${updatedOrder.side} filled ${updatedOrder.filledSize} with ${updatedOrder.remainingSize} remaining.`,
          provider: "Paper Execution"
        });
        return nextState;
      }

      if (nextStatus === "Rejected") {
        const updatedOrder = helpers.normalizeOrder({
          ...target,
          status: "Rejected",
          rejectionReason: payload.reason || "Route validation failed inside the paper execution engine.",
          ackState: "Rejected",
          ackTime: helpers.getTimeLabel(),
          time: helpers.getTimeLabel()
        });

        return {
          recentOrders: updateOrder(current.recentOrders, payload.orderId, () => updatedOrder),
          recentActions: helpers.pushAction(
            current.recentActions,
            "Order rejected",
            `${updatedOrder.symbol} ${updatedOrder.side} ${updatedOrder.type} was rejected by paper execution.`,
            "Rejected"
          ),
          openPositions: current.openPositions,
          sessionNotes: current.sessionNotes,
          executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
            orderId: updatedOrder.id,
            symbol: updatedOrder.symbol,
            route: updatedOrder.route,
            event: "Rejected",
            status: "Rejected",
            detail: updatedOrder.rejectionReason,
            provider: "Paper Execution"
          })
        };
      }

      const updatedOrder = helpers.normalizeOrder({
        ...target,
        status: nextStatus,
        filledSize: nextStatus === "Filled" ? formatSize(target.size || 0) : target.filledSize,
        remainingSize: nextStatus === "Filled" ? "0.00" : target.remainingSize,
        avgFillPrice: payload.fillPrice || target.avgFillPrice || target.entry,
        ackState: nextStatus === "Filled" ? "Filled" : target.ackState,
        ackTime: helpers.getTimeLabel(),
        time: helpers.getTimeLabel()
      });

      nextState.recentOrders = updateOrder(current.recentOrders, payload.orderId, () => updatedOrder);
      nextState.recentActions = helpers.pushAction(
        current.recentActions,
        `Execution ${nextStatus.toLowerCase()}`,
        `${updatedOrder.symbol} ${updatedOrder.side} ${updatedOrder.type} is now ${nextStatus.toLowerCase()}.`,
        nextStatus
      );
      nextState.executionEvents = pushExecutionEvent(current.executionEvents, helpers, {
        orderId: updatedOrder.id,
        symbol: updatedOrder.symbol,
        route: updatedOrder.route,
        event: nextStatus,
        status: nextStatus,
        detail: buildExecutionDetail(updatedOrder, nextStatus),
        provider: "Paper Execution"
      });

      if (nextStatus === "Filled") {
        nextState.openPositions = upsertPosition(
          current.openPositions,
          helpers.createPositionRecord(current, {
            ...updatedOrder,
            size: updatedOrder.filledSize || updatedOrder.size,
            entry: updatedOrder.avgFillPrice || updatedOrder.entry,
            mark: updatedOrder.avgFillPrice || updatedOrder.entry,
            lifecycle: "Filled",
            status: current.protectionState === "Locked" ? "Protected" : "In plan"
          }),
          helpers
        );
        nextState.sessionNotes = [
          {
            id: helpers.createId("NOTE"),
            symbol: updatedOrder.symbol,
            route: updatedOrder.route,
            text: `${updatedOrder.side} execution confirmed in paper mode at ${updatedOrder.avgFillPrice || updatedOrder.entry}.`
          },
          ...current.sessionNotes
        ];
      }

      return nextState;
    }

    case "cancelOrder": {
      const target = current.recentOrders.find((order) => order.id === payload.orderId);
      if (!target || !["Working", "Staged", "Partially Filled"].includes(target.status)) {
        return {};
      }

      return {
        recentOrders: updateOrder(current.recentOrders, payload.orderId, (order) =>
          helpers.normalizeOrder({
            ...order,
            status: "Canceled",
            ackState: "Canceled",
            ackTime: helpers.getTimeLabel(),
            time: helpers.getTimeLabel()
          })
        ),
        recentActions: helpers.pushAction(
          current.recentActions,
          "Order canceled",
          `${target.symbol} ${target.side} ${target.type} order was canceled in paper execution.`,
          "Canceled"
        ),
        executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
          orderId: target.id,
          symbol: target.symbol,
          route: target.route,
          event: "Canceled",
          status: "Canceled",
          detail: buildExecutionDetail(target, "canceled"),
          provider: "Paper Execution"
        })
      };
    }

    case "closePosition": {
      const target = current.openPositions.find(
        (position) => helpers.createPositionKey(position) === payload.positionKey
      );
      if (!target) {
        return {};
      }

      const exitSide = target.side === "Long" ? "Sell" : "Buy";
      const closeOrder = helpers.createOrderRecord(current, exitSide, "Closed", {
        symbol: target.symbol,
        route: target.route || current.selectedRoute?.name || "Connected Route",
        type: "Market Exit",
        size: target.size,
        entry: target.mark || target.entry,
        ackState: "Closed",
        ackTime: helpers.getTimeLabel()
      });

      return {
        openPositions: current.openPositions.filter(
          (position) => helpers.createPositionKey(position) !== payload.positionKey
        ),
        recentOrders: [closeOrder, ...current.recentOrders],
        sessionNotes: [
          {
            id: helpers.createId("NOTE"),
            symbol: target.symbol,
            route: target.route || current.selectedRoute?.name || "Connected Route",
            text: `${target.symbol} ${target.side} position closed through the paper execution engine.`
          },
          ...current.sessionNotes
        ],
        recentActions: helpers.pushAction(
          current.recentActions,
          "Position closed",
          `${target.symbol} ${target.side} position was closed from the execution desk.`,
          "Closed"
        ),
        executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
          orderId: closeOrder.id,
          symbol: closeOrder.symbol,
          route: closeOrder.route,
          event: "Closed",
          status: "Closed",
          detail: buildExecutionDetail(closeOrder, "closed"),
          provider: "Paper Execution"
        })
      };
    }

    default:
      return {};
  }
}

export function getDefaultExecutionProvider() {
  return "paper";
}

export function getExecutionProviderCatalog() {
  return executionProviderCatalog;
}

export function buildExecutionStatus({
  providerKey = getDefaultExecutionProvider(),
  recentOrders = [],
  openPositions = [],
  recentActions = [],
  executionEvents = []
}) {
  const provider =
    executionProviderCatalog.find((item) => item.key === providerKey) ||
    executionProviderCatalog[0];
  const stagedCount = recentOrders.filter((order) => order.status === "Staged").length;
  const workingCount = recentOrders.filter((order) => order.status === "Working").length;
  const partialCount = recentOrders.filter((order) => order.status === "Partially Filled").length;
  const filledCount = recentOrders.filter((order) => order.status === "Filled").length;
  const rejectedCount = recentOrders.filter((order) => order.status === "Rejected").length;
  const amendAckCount = recentOrders.filter((order) => order.ackState === "Amend Ack").length;
  const latestEvent = executionEvents[0];
  const tone =
    provider.key !== "paper"
      ? "warning"
      : rejectedCount > 0
        ? "danger"
        : partialCount > 0 || stagedCount + workingCount > 0
          ? "warning"
          : "success";
  const state =
    provider.key !== "paper"
      ? provider.state
      : rejectedCount > 0
        ? "Attention"
        : partialCount > 0
          ? "Partial fills active"
          : stagedCount + workingCount > 0
            ? "Queue active"
            : "Clear";

  return {
    key: provider.key,
    label: provider.label,
    mode: provider.mode,
    state,
    tone,
    note: provider.description,
    pendingOrders: stagedCount + workingCount + partialCount,
    openPositions: openPositions.length,
    filledOrders: filledCount,
    partialFills: partialCount,
    rejectedOrders: rejectedCount,
    amendAcks: amendAckCount,
    eventCount: executionEvents.length,
    lastEvent: latestEvent?.event || recentActions[0]?.title || "Session idle",
    lastEventDetail: latestEvent?.detail || recentActions[0]?.detail || provider.description,
    lastUpdate:
      latestEvent?.time ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}

export function runExecutionAction({
  providerKey = getDefaultExecutionProvider(),
  action,
  current,
  payload,
  helpers
}) {
  if (providerKey !== "paper") {
    return {
      recentActions: helpers.pushAction(
        current.recentActions,
        "Broker adapter not configured",
        "The live broker adapter is reserved for a future compliant connector. Paper execution remains active.",
        "Watch"
      ),
      executionEvents: pushExecutionEvent(current.executionEvents, helpers, {
        event: "Broker adapter unavailable",
        status: "Watch",
        detail:
          "The broker-ready adapter is not configured in this build. Paper execution remains active.",
        provider: "Broker Adapter Ready"
      })
    };
  }

  return runPaperExecution(action, current, payload, helpers);
}
