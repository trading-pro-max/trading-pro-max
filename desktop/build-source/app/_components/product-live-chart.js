"use client";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function parsePrice(value, fallback = Number.NaN) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function zoneTone(state) {
  if (state === "Protected" || state === "Blocked") return "danger";
  if (state === "Watch" || state === "Ready") return "warning";
  return "info";
}

function eventTone(status) {
  if (status === "Rejected" || status === "Canceled") return "danger";
  if (status === "Working" || status === "Partially Filled") return "warning";
  if (status === "Filled" || status === "Closed") return "success";
  return "info";
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 100) return value.toFixed(2);
  if (Math.abs(value) >= 10) return value.toFixed(3);
  return value.toFixed(4);
}

function buildRange(values = [], fallback = 100) {
  const numeric = values.filter((value) => Number.isFinite(value));
  const minimum = numeric.length ? Math.min(...numeric) : fallback * 0.995;
  const maximum = numeric.length ? Math.max(...numeric) : fallback * 1.005;
  const span = Math.max(maximum - minimum, Math.max(fallback * 0.004, 1));

  return {
    minimum: minimum - span * 0.06,
    maximum: maximum + span * 0.06
  };
}

function positionForPrice(price, range, chartHeight) {
  if (!Number.isFinite(price)) return chartHeight / 2;
  const normalized = clamp((price - range.minimum) / Math.max(range.maximum - range.minimum, 1), 0, 1);
  return chartHeight - normalized * chartHeight;
}

export function buildLiveChartOverlayModel({
  chart,
  activeWatch,
  primaryRoute,
  orderTicket,
  openPositions = [],
  recentOrders = [],
  executionEvents = [],
  protectionState,
  riskSummary
}) {
  const lastClose = chart?.candles?.length
    ? chart.candles[chart.candles.length - 1]?.close
    : parsePrice(activeWatch?.last, 100);
  const entry = parsePrice(orderTicket?.entry, lastClose);
  const targetFallback = Number.isFinite(entry) ? entry * (primaryRoute?.state === "Protected" ? 0.997 : 1.0045) : lastClose;
  const stopFallback = Number.isFinite(entry) ? entry * (primaryRoute?.state === "Protected" ? 1.0025 : 0.9975) : lastClose;
  const target = parsePrice(orderTicket?.target, targetFallback);
  const stop = parsePrice(orderTicket?.stop, stopFallback);
  const routeBand = Math.max(Math.abs(entry || lastClose) * 0.0018, 0.02);
  const protectionBand = Math.max(Math.abs(stop || entry || lastClose) * 0.0012, 0.02);
  const visibleValues = [
    ...(chart?.candles || []).flatMap((candle) => [candle.low, candle.high, candle.close]),
    entry,
    target,
    stop,
    ...openPositions
      .filter((position) => position.symbol === activeWatch?.symbol)
      .flatMap((position) => [parsePrice(position.entry), parsePrice(position.mark)])
  ];

  const routeZones = [
    {
      id: "route-zone",
      label: "Route Zone",
      tone: zoneTone(primaryRoute?.state),
      lower: (entry || lastClose) - routeBand,
      upper: (entry || lastClose) + routeBand,
      summary: `${formatPrice((entry || lastClose) - routeBand)} - ${formatPrice((entry || lastClose) + routeBand)}`
    },
    {
      id: "target-zone",
      label: "Target Zone",
      tone: "success",
      lower: Math.min(entry || lastClose, target),
      upper: Math.max(entry || lastClose, target),
      summary: `${formatPrice(Math.min(entry || lastClose, target))} - ${formatPrice(Math.max(entry || lastClose, target))}`
    }
  ];

  const protectionOverlays = [
    {
      id: "protection-overlay",
      label: protectionState === "Locked" ? "Protection Lock" : "Protection Band",
      tone: protectionState === "Locked" ? "danger" : "warning",
      lower: stop - protectionBand,
      upper: stop + protectionBand,
      summary:
        protectionState === "Locked"
          ? `${formatPrice(stop)} hard lock`
          : `${formatPrice(stop - protectionBand)} - ${formatPrice(stop + protectionBand)}`
    }
  ];

  const executionMarkers = recentOrders
    .filter((item) => item.symbol === activeWatch?.symbol)
    .slice(0, 4)
    .map((item, index) => ({
      id: item.id,
      label: item.status,
      price: parsePrice(item.entry, entry || lastClose),
      tone: eventTone(item.status),
      time: item.time,
      side: item.side,
      orderIndex: index
    }));

  const recoveryMarkers = executionEvents
    .filter((item) => item.symbol === activeWatch?.symbol && item.status !== "Logged")
    .slice(0, 2)
    .map((item, index) => ({
      id: item.id,
      label: item.status,
      price: parsePrice(orderTicket?.entry, entry || lastClose),
      tone: eventTone(item.status),
      time: item.time,
      side: item.event,
      orderIndex: executionMarkers.length + index
    }));

  const markers = [...executionMarkers, ...recoveryMarkers].slice(0, 6);
  const range = buildRange(visibleValues, lastClose || 100);

  return {
    routeZones,
    protectionOverlays,
    executionMarkers: markers,
    emphasisLabel: activeWatch?.symbol || chart?.symbol || "--",
    providerLabel: chart?.providerSymbol || activeWatch?.providerSymbol || "--",
    range,
    summaries: [
      {
        label: "Route Zone",
        value: routeZones[0]?.summary || "--",
        tone: routeZones[0]?.tone || "info"
      },
      {
        label: "Protection",
        value: protectionOverlays[0]?.summary || "--",
        tone: protectionOverlays[0]?.tone || "warning"
      },
      {
        label: "Execution Markers",
        value: markers.length ? `${markers.length} active` : "No marks",
        tone: markers.length ? "success" : "info"
      },
      {
        label: "Open Risk",
        value: riskSummary?.openRisk || "--",
        tone: protectionState === "Locked" ? "danger" : "warning"
      }
    ]
  };
}

export function projectChartPrice(price, overlayModel, chartHeight) {
  return positionForPrice(price, overlayModel?.range || { minimum: 0, maximum: 1 }, chartHeight);
}

