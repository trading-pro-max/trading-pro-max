export function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function round(value, digits = 2) {
  return Number.parseFloat(Number(value).toFixed(digits));
}

export function formatCurrency(value, digits) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits ?? (Math.abs(value) > 1000 ? 0 : 2)
  }).format(value);
}

export function formatSigned(value, digits = 2, suffix = "") {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(digits)}${suffix}`;
}

export function formatPrice(value, digits = 2) {
  return Number(value).toFixed(digits);
}

export function formatTimestamp(value = new Date()) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function toneClassName(tone, styles) {
  if (tone === "positive" || tone === "up") return styles.positiveTone;
  if (tone === "negative" || tone === "down" || tone === "danger") return styles.negativeTone;
  if (tone === "warning") return styles.warningTone;
  return styles.neutralTone;
}

export function buildSparkPath(points, width = 140, height = 44, padding = 4) {
  if (!points?.length) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((point - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildSparkArea(points, width = 140, height = 44, padding = 4) {
  if (!points?.length) return "";
  const line = buildSparkPath(points, width, height, padding);
  return `${line} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cumulative(values, smoothing = 1) {
  const result = [];
  let running = values[0] || 0;

  for (let index = 0; index < values.length; index += 1) {
    running = running + ((values[index] || 0) - running) * smoothing;
    result.push(running);
  }

  return result;
}

export function buildLinePath(values, min, max, width, height, padding) {
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = padding.left + (index / Math.max(values.length - 1, 1)) * (width - padding.left - padding.right);
      const y =
        padding.top +
        (height - padding.top - padding.bottom) -
        ((value - min) / range) * (height - padding.top - padding.bottom);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildChartModel(candles, indicators = {}) {
  if (!candles?.length) {
    return {
      width: 940,
      height: 430,
      wickLines: [],
      candleBars: [],
      volumeBars: [],
      gridLines: [],
      indicatorPaths: [],
      currentPrice: "0.00",
      currentPriceY: 0,
      timeLabels: []
    };
  }

  const width = 940;
  const height = 430;
  const volumeHeight = 82;
  const padding = { top: 28, right: 72, bottom: 30, left: 14 };
  const plotHeight = height - padding.top - padding.bottom - volumeHeight;
  const minPrice = Math.min(...candles.map((item) => item.low));
  const maxPrice = Math.max(...candles.map((item) => item.high));
  const digits = maxPrice >= 1000 ? 0 : maxPrice >= 10 ? 2 : 4;
  const priceRange = maxPrice - minPrice || 1;
  const innerWidth = width - padding.left - padding.right;
  const step = innerWidth / candles.length;
  const candleWidth = Math.max(8, step * 0.56);
  const maxVolume = Math.max(...candles.map((item) => item.volume), 1);

  const priceY = (price) => padding.top + plotHeight - ((price - minPrice) / priceRange) * plotHeight;
  const volumeY = (volume) => height - padding.bottom - (volume / maxVolume) * (volumeHeight - 10);

  const closes = candles.map((item) => item.close);
  const volumes = candles.map((item) => item.volume);
  const ema20 = cumulative(closes, 2 / (20 + 1));
  const ema50 = cumulative(closes, 2 / (50 + 1));
  const vwap = candles.map((_, index) => average(closes.slice(0, index + 1)));
  const volumeAvg = candles.map((_, index) => average(volumes.slice(Math.max(0, index - 7), index + 1)));

  const indicatorPaths = [];

  if (indicators["VWAP"]) {
    indicatorPaths.push({
      key: "VWAP",
      className: "indicatorVwap",
      path: buildLinePath(vwap, minPrice, maxPrice, width, height - volumeHeight, padding)
    });
  }

  if (indicators["EMA 20"]) {
    indicatorPaths.push({
      key: "EMA 20",
      className: "indicatorEmaFast",
      path: buildLinePath(ema20, minPrice, maxPrice, width, height - volumeHeight, padding)
    });
  }

  if (indicators["EMA 50"]) {
    indicatorPaths.push({
      key: "EMA 50",
      className: "indicatorEmaSlow",
      path: buildLinePath(ema50, minPrice, maxPrice, width, height - volumeHeight, padding)
    });
  }

  if (indicators.Volume) {
    indicatorPaths.push({
      key: "Volume Average",
      className: "indicatorVolumeAvg",
      path: buildLinePath(volumeAvg, 0, maxVolume, width, height, {
        top: height - volumeHeight + 8,
        right: padding.right,
        bottom: padding.bottom,
        left: padding.left
      })
    });
  }

  return {
    width,
    height,
    wickLines: candles.map((candle, index) => {
      const x = padding.left + index * step + step * 0.5;
      return {
        x,
        y1: priceY(candle.high),
        y2: priceY(candle.low),
        up: candle.close >= candle.open
      };
    }),
    candleBars: candles.map((candle, index) => {
      const x = padding.left + index * step + step * 0.5 - candleWidth * 0.5;
      const y = Math.min(priceY(candle.open), priceY(candle.close));
      const bodyHeight = Math.max(3, Math.abs(priceY(candle.open) - priceY(candle.close)));
      return {
        x,
        y,
        width: candleWidth,
        height: bodyHeight,
        up: candle.close >= candle.open
      };
    }),
    volumeBars: candles.map((candle, index) => {
      const x = padding.left + index * step + step * 0.5 - candleWidth * 0.5;
      const y = volumeY(candle.volume);
      return {
        x,
        y,
        width: candleWidth,
        height: height - padding.bottom - y,
        up: candle.close >= candle.open
      };
    }),
    gridLines: Array.from({ length: 5 }, (_, index) => {
      const y = padding.top + (plotHeight / 4) * index;
      return {
        y,
        label: (maxPrice - (priceRange / 4) * index).toFixed(digits)
      };
    }),
    indicatorPaths,
    currentPrice: candles[candles.length - 1].close.toFixed(digits),
    currentPriceY: priceY(candles[candles.length - 1].close),
    timeLabels: Array.from({ length: 5 }, (_, index) => {
      const labelIndex = Math.round((candles.length - 1) * (index / 4));
      return {
        x: 142 + index * 156,
        label: candles[labelIndex]?.label || `${index + 8}:00`
      };
    })
  };
}
