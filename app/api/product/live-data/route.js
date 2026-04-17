import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLiveTimeframe, resolveProviderMapping } from "../../../_components/product-live-market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const DEFAULT_TIMEOUT_MS = 6500;
const QUOTE_TIMEOUT_MS = 4200;
const CHART_TIMEOUT_MS = 5200;
const DEFAULT_CACHE_TTL_MS = 15000;
const MAX_QUOTE_SYMBOLS = 4;
const ENV_FILE_PATH = join(process.cwd(), ".env.local");

const runtimeCache = new Map();
let parsedEnvCache = null;

function json(payload) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

function parseNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasUsableApiKey(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  return !["your_twelve_data_api_key", "replace_me", "changeme", "placeholder"].includes(
    normalized.toLowerCase()
  );
}

function readLocalEnv() {
  if (parsedEnvCache) return parsedEnvCache;

  const env = {};

  try {
    if (existsSync(ENV_FILE_PATH)) {
      const raw = readFileSync(ENV_FILE_PATH, "utf8").replace(/^\uFEFF/, "");
      for (const line of raw.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [keyPart, ...valueParts] = trimmed.split("=");
        const key = keyPart.trim();
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        if (key) env[key] = value;
      }
    }
  } catch {}

  parsedEnvCache = env;
  return env;
}

function getRuntimeConfig() {
  const localEnv = readLocalEnv();

  return {
    apiKey: process.env.TWELVE_DATA_API_KEY || localEnv.TWELVE_DATA_API_KEY || "",
    baseUrl: process.env.TWELVE_DATA_BASE_URL || localEnv.TWELVE_DATA_BASE_URL || DEFAULT_TWELVE_DATA_BASE_URL
  };
}

function inferPrecision(symbol, value) {
  const raw = String(value ?? "");
  if (raw.includes(".")) return raw.split(".")[1].length;
  if (symbol.includes("/") || symbol.includes("XAU")) return 4;
  return 2;
}

function formatPrice(value, precision) {
  if (!Number.isFinite(value)) return "--";
  return precision > 0 ? value.toFixed(precision) : String(Math.round(value));
}

function formatPercent(value) {
  const sign = value < 0 ? "-" : "+";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatVolume(value) {
  const numeric = parseNumber(value);
  if (!numeric) return "--";
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(2)}m`;
  if (numeric >= 1000) return `${Math.round(numeric / 1000)}k`;
  return String(Math.round(numeric));
}

function uniqueSymbols(symbols = [], selectedSymbol) {
  const ordered = [selectedSymbol, ...symbols]
    .map((item) => resolveProviderMapping(item).symbol)
    .filter(Boolean);
  const seen = new Set();

  return ordered.filter((symbol) => {
    const key = symbol.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candleFreshnessThresholds(timeframeKey) {
  if (timeframeKey === "1m") return { freshMs: 3 * 60 * 1000, warmMs: 8 * 60 * 1000, delayedMs: 20 * 60 * 1000 };
  if (timeframeKey === "5m") return { freshMs: 12 * 60 * 1000, warmMs: 26 * 60 * 1000, delayedMs: 50 * 60 * 1000 };
  if (timeframeKey === "1h") return { freshMs: 2.5 * 60 * 60 * 1000, warmMs: 5.5 * 60 * 60 * 1000, delayedMs: 12 * 60 * 60 * 1000 };
  if (timeframeKey === "4h") return { freshMs: 8 * 60 * 60 * 1000, warmMs: 15 * 60 * 60 * 1000, delayedMs: 30 * 60 * 60 * 1000 };
  if (timeframeKey === "1D") return { freshMs: 36 * 60 * 60 * 1000, warmMs: 72 * 60 * 60 * 1000, delayedMs: 6 * 24 * 60 * 60 * 1000 };
  return { freshMs: 35 * 60 * 1000, warmMs: 75 * 60 * 1000, delayedMs: 150 * 60 * 1000 };
}

function classifyFreshness(ageSeconds) {
  if (ageSeconds <= 5) return "Fresh";
  if (ageSeconds <= 20) return "Warm";
  return "Stale";
}

function classifyChartFreshness(lastTimestamp, timeframeKey) {
  if (!lastTimestamp) return "Stale";
  const thresholds = candleFreshnessThresholds(timeframeKey);
  const ageMs = Math.max(0, Date.now() - Date.parse(lastTimestamp));
  if (ageMs <= thresholds.freshMs) return "Fresh";
  if (ageMs <= thresholds.warmMs) return "Warm";
  return "Stale";
}

function isWeekendSession(assetClass = "Forex") {
  if (assetClass === "Crypto") return false;
  const day = new Date().getUTCDay();
  return day === 0 || day === 6;
}

function isDateOnlyTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function quoteFreshnessThresholds(assetClass = "Forex") {
  if (assetClass === "Crypto") return { fresh: 2 * 60, warm: 12 * 60, delayed: 90 * 60, sessionClosed: 0 };
  if (assetClass === "Equity" || assetClass === "Equity ETF" || assetClass === "Index Proxy") {
    return { fresh: 20 * 60, warm: 3 * 60 * 60, delayed: 30 * 60 * 60, sessionClosed: 72 * 60 * 60 };
  }
  return { fresh: 5 * 60, warm: 45 * 60, delayed: 12 * 60 * 60, sessionClosed: 60 * 60 * 60 };
}

function classifyQuoteRuntime(mapping, ageSeconds, datetime) {
  const thresholds = quoteFreshnessThresholds(mapping.assetClass);
  const sessionClosed =
    (thresholds.sessionClosed > 0 &&
      isWeekendSession(mapping.assetClass) &&
      ageSeconds <= thresholds.sessionClosed) ||
    (mapping.assetClass !== "Crypto" &&
      isDateOnlyTimestamp(datetime) &&
      ageSeconds <= thresholds.sessionClosed);

  if (sessionClosed) {
    return {
      freshness: "Session Closed",
      feedHealth: "Session Closed",
      degradedReason: null
    };
  }

  if (ageSeconds <= thresholds.fresh) {
    return {
      freshness: "Fresh",
      feedHealth: "Healthy",
      degradedReason: null
    };
  }

  if (ageSeconds <= thresholds.warm) {
    return {
      freshness: "Warm",
      feedHealth: "Stable",
      degradedReason: null
    };
  }

  if (ageSeconds <= thresholds.delayed) {
    return {
      freshness: "Delayed",
      feedHealth: "Delayed",
      degradedReason: `${mapping.providerSymbol} quote updates are delayed for the active runtime window.`
    };
  }

  return {
    freshness: "Stale",
    feedHealth: "Degraded",
    degradedReason: `${mapping.providerSymbol} quote updates are older than the expected runtime window.`
  };
}

function classifyChartRuntime(mapping, lastTimestamp, timeframeKey) {
  if (!lastTimestamp) {
    return {
      readinessState: "Degraded",
      freshness: "Pending",
      degradedReason: "No live candles were returned for the active timeframe."
    };
  }

  const thresholds = candleFreshnessThresholds(timeframeKey);
  const ageMs = Math.max(0, Date.now() - Date.parse(lastTimestamp));
  const sessionClosedWindowMs =
    mapping.assetClass === "Crypto" ? 0 : Math.max(thresholds.delayedMs, 72 * 60 * 60 * 1000);

  if (ageMs <= thresholds.freshMs) {
    return {
      readinessState: "Ready",
      freshness: "Fresh",
      degradedReason: null
    };
  }

  if (ageMs <= thresholds.warmMs) {
    return {
      readinessState: "Ready",
      freshness: "Warm",
      degradedReason: null
    };
  }

  if (sessionClosedWindowMs && isWeekendSession(mapping.assetClass) && ageMs <= sessionClosedWindowMs) {
    return {
      readinessState: "Ready",
      freshness: "Session Closed",
      degradedReason: null
    };
  }

  if (ageMs <= thresholds.delayedMs) {
    return {
      readinessState: "Ready",
      freshness: "Delayed",
      degradedReason: `Live candles for ${mapping.providerSymbol} are delayed on the ${timeframeKey} lane.`
    };
  }

  return {
    readinessState: "Degraded",
    freshness: "Stale",
    degradedReason: `Live candles for ${mapping.providerSymbol} are outside the expected ${timeframeKey} freshness window.`
  };
}

function computeAgeSeconds(timestamp, datetime) {
  const now = Date.now();
  const candidate =
    timestamp && Number.isFinite(Number(timestamp))
      ? Number(timestamp) > 1000000000000
        ? Number(timestamp)
        : Number(timestamp) * 1000
      : datetime
        ? Date.parse(datetime)
        : NaN;

  if (!Number.isFinite(candidate)) return 999;
  return Math.max(0, Math.round((now - candidate) / 1000));
}

function buildFallbackProvider(state, blockedReason, degradedReason, validationState = "Missing API Key") {
  const now = new Date();
  return {
    key: "twelve-data",
    label: "Twelve Data",
    state,
    tone: state === "Streaming" ? "success" : state === "Fallback to Demo" ? "warning" : "danger",
    mode: "Read-only live polling with demo fallback",
    connectorState:
      state === "Streaming"
        ? "Connected"
        : state === "Awaiting API Key"
          ? "Missing API Key"
          : "Fallback Active",
    providerState: state,
    readinessState: state === "Streaming" ? "Ready" : "Blocked",
    lastUpdate: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    freshness: state === "Streaming" ? "Fresh" : "Stale",
    latency: "--",
    feedHealth: state === "Streaming" ? "Healthy" : "Fallback",
    signalState: "Monitoring",
    runtimeHealth: state === "Streaming" ? "93%" : "71%",
    validationState,
    configPath: ".env.local",
    blockedReason,
    degradedReason,
    adapterSupported: true,
    fallbackActive: state !== "Streaming",
    readOnly: true
  };
}

function serializeError(error, fallback = "Unknown Twelve Data runtime failure.") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

async function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Trading-Pro-Max/1.0 (local runtime)"
      }
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Timed out reaching Twelve Data after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildQuoteRecord(symbol, mapping, quoteData, durationMs) {
  const last = parseNumber(
    quoteData.close ??
      quoteData.price ??
      quoteData.last ??
      quoteData.value ??
      quoteData.previous_close
  );
  const previousClose = parseNumber(quoteData.previous_close, last);
  const changeValue = Number.isFinite(parseNumber(quoteData.percent_change, Number.NaN))
    ? parseNumber(quoteData.percent_change, 0)
    : previousClose
      ? ((last - previousClose) / previousClose) * 100
      : parseNumber(quoteData.change, 0);
  const precision = inferPrecision(symbol, last || quoteData.close || quoteData.price);
  const spreadBasis = symbol.includes("/") || symbol.includes("XAU") ? 0.00018 : 0.00045;
  const spreadValue = Math.max(last * spreadBasis, precision > 0 ? 10 ** -precision : 0.02);
  const bid = parseNumber(quoteData.bid, last - spreadValue / 2);
  const ask = parseNumber(quoteData.ask, last + spreadValue / 2);
  const ageSeconds = computeAgeSeconds(quoteData.timestamp, quoteData.datetime);
  const quoteRuntime = classifyQuoteRuntime(mapping, ageSeconds, quoteData.datetime);

  return {
    symbol,
    providerSymbol: mapping.providerSymbol,
    mappingState: mapping.mappingState,
    assetClass: mapping.assetClass,
    name: quoteData.name || mapping.label || mapping.providerSymbol,
    last: formatPrice(last, precision),
    bid: formatPrice(bid, precision),
    ask: formatPrice(ask, precision),
    spread: formatPrice(Math.abs(ask - bid), Math.max(precision, 2)),
    change: formatPercent(changeValue),
    movementPct: Number(changeValue.toFixed(2)),
    volume: formatVolume(quoteData.volume),
    lastUpdate: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    datetime: quoteData.datetime || null,
    freshness: quoteRuntime.freshness,
    ageSeconds,
    latency: `${Math.max(18, Math.round(durationMs))}ms`,
    feedHealth: quoteRuntime.feedHealth,
    degradedReason: quoteRuntime.degradedReason,
    note: `Read-only Twelve Data quote for ${symbol}${mapping.providerSymbol !== symbol ? ` via ${mapping.providerSymbol}` : ""}.`
  };
}

function buildChartRecord(symbol, mapping, chartData, timeframe) {
  const rawValues = Array.isArray(chartData?.values) ? [...chartData.values].reverse() : [];
  const candles = rawValues
    .map((item, index) => ({
      id: `${symbol}-${timeframe.key}-${index}`,
      time: item.datetime,
      open: parseNumber(item.open, Number.NaN),
      high: parseNumber(item.high, Number.NaN),
      low: parseNumber(item.low, Number.NaN),
      close: parseNumber(item.close, Number.NaN),
      volume: parseNumber(item.volume, 0)
    }))
    .filter((item) => [item.open, item.high, item.low, item.close].every((value) => Number.isFinite(value)))
    .slice(-timeframe.defaultOutputsize);

  const points = candles.map((item) => item.close);
  const latest = candles[candles.length - 1] || null;
  const chartRuntime = classifyChartRuntime(mapping, latest?.time, timeframe.key);

  return {
    symbol,
    providerSymbol: mapping.providerSymbol,
    mappingState: mapping.mappingState,
    timeframe: timeframe.key,
    timeframeLabel: timeframe.label,
    sourceLabel: "Twelve Data",
    readinessState: candles.length ? chartRuntime.readinessState : "Degraded",
    lastCandleUpdate: latest?.time || null,
    freshness: candles.length ? chartRuntime.freshness : "Pending",
    degradedReason: candles.length ? chartRuntime.degradedReason : "No live candles were returned for the active timeframe.",
    candles,
    points
  };
}

function makeCacheKey(symbols, selectedSymbol, timeframeKey, outputsize) {
  return JSON.stringify({ symbols, selectedSymbol, timeframeKey, outputsize });
}

async function fetchQuoteRecord(symbol, apiKey, baseUrl, startedAt) {
  const mapping = resolveProviderMapping(symbol, "twelve-data");
  const quoteUrl = `${baseUrl}/quote?symbol=${encodeURIComponent(mapping.providerSymbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetchJson(quoteUrl, QUOTE_TIMEOUT_MS);
  if (!response.ok || response.data?.status === "error") {
    throw new Error(response.data?.message || `Quote request failed for ${symbol}.`);
  }

  return buildQuoteRecord(mapping.symbol, mapping, response.data, Date.now() - startedAt);
}

async function fetchChartRecord(selectedSymbol, apiKey, baseUrl, timeframe, outputsize) {
  const mapping = resolveProviderMapping(selectedSymbol, "twelve-data");
  const chartUrl = `${baseUrl}/time_series?symbol=${encodeURIComponent(mapping.providerSymbol)}&interval=${encodeURIComponent(timeframe.providerInterval)}&outputsize=${encodeURIComponent(outputsize)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const chartResponse = await fetchJson(chartUrl, CHART_TIMEOUT_MS);
    if (!chartResponse.ok || chartResponse.data?.status === "error") return null;
    return buildChartRecord(mapping.symbol, mapping, chartResponse.data, timeframe);
  } catch {
    return null;
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const symbols = (url.searchParams.get("symbols") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedSymbol = resolveProviderMapping(
    url.searchParams.get("selectedSymbol") || symbols[0] || "EUR/USD",
    "twelve-data"
  ).symbol;
  const timeframe = resolveLiveTimeframe(url.searchParams.get("timeframe") || url.searchParams.get("interval") || "15m");
  const outputsize = Math.max(16, Math.min(72, parseNumber(url.searchParams.get("outputsize"), timeframe.defaultOutputsize)));
  const targets = uniqueSymbols(symbols, selectedSymbol).slice(0, MAX_QUOTE_SYMBOLS);
  const cacheKey = makeCacheKey(targets, selectedSymbol, timeframe.key, outputsize);
  const cached = runtimeCache.get(cacheKey);

  if (cached && Date.now() - cached.at < DEFAULT_CACHE_TTL_MS) {
    return json(cached.payload);
  }

  const { apiKey, baseUrl } = getRuntimeConfig();

  if (!hasUsableApiKey(apiKey)) {
    return json({
      ok: false,
      fallback: true,
      provider: buildFallbackProvider(
        "Awaiting API Key",
        "Set TWELVE_DATA_API_KEY in .env.local to enable the Twelve Data live adapter.",
        "No Twelve Data API key is configured in the local runtime, so Trading Pro Max stayed on the demo feed.",
        "Missing API Key"
      ),
      quotes: [],
      chart: null
    });
  }

  const startedAt = Date.now();

  try {
    const [quoteResults, chart] = await Promise.all([
      Promise.allSettled(targets.map((symbol) => fetchQuoteRecord(symbol, apiKey, baseUrl, startedAt))),
      fetchChartRecord(selectedSymbol, apiKey, baseUrl, timeframe, outputsize)
    ]);

    const quotes = quoteResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const failedQuotes = quoteResults
      .filter((result) => result.status === "rejected")
      .map((result) => serializeError(result.reason))
      .slice(0, 3);

    if (!quotes.length) {
      return json({
        ok: false,
        fallback: true,
        provider: buildFallbackProvider(
          "Fallback to Demo",
          "Twelve Data did not return a usable live quote within the app timeout window.",
          failedQuotes[0] || "Live quote polling failed, so Trading Pro Max stayed on the local demo feed.",
          "Valid"
        ),
        quotes: [],
        chart: chart && chart.points.length ? chart : null
      });
    }

    const freshest = quotes.reduce((best, current) => (current.ageSeconds < best.ageSeconds ? current : best), quotes[0]);
    const stalest = quotes.reduce((worst, current) => (current.ageSeconds > worst.ageSeconds ? current : worst), quotes[0]);
    const partialFailure = failedQuotes.length > 0;
    const chartReady = Boolean(chart?.points?.length);
    const activeMapping = resolveProviderMapping(selectedSymbol, "twelve-data");
    const activeQuote = quotes.find((item) => item.symbol === selectedSymbol) || quotes[0] || null;
    const activeFreshness = chartReady
      ? chart.freshness
      : activeQuote?.freshness || freshest.freshness;
    const activeFeedHealth = chartReady
      ? chart.freshness === "Fresh"
        ? "Healthy"
        : chart.freshness === "Warm"
          ? "Stable"
          : chart.freshness === "Delayed"
            ? "Delayed"
            : chart.freshness === "Session Closed"
              ? "Session Closed"
              : "Degraded"
      : activeQuote?.feedHealth || freshest.feedHealth;
    const readinessState = chartReady
      ? "Ready"
      : activeQuote && activeQuote.feedHealth !== "Degraded"
        ? "Quotes Only"
        : "Degraded";
    const providerState = partialFailure
      ? "Streaming With Partial Coverage"
      : chartReady
        ? "Streaming"
        : activeQuote
          ? "Streaming Quotes Only"
          : "Streaming";
    const providerTone =
      activeFeedHealth === "Healthy"
        ? "success"
        : activeFeedHealth === "Session Closed"
          ? "info"
          : activeFeedHealth === "Stable" || activeFeedHealth === "Delayed" || partialFailure || readinessState === "Quotes Only"
            ? "warning"
            : "danger";
    const degradedReason = partialFailure
      ? failedQuotes.join(" | ")
      : !chartReady && activeQuote && activeQuote.feedHealth !== "Degraded"
        ? "Live quotes are active for the selected symbol, but the chart lane is not yet ready for the current timeframe."
        : chart?.degradedReason || activeQuote?.degradedReason || null;

    const provider = {
      ...buildFallbackProvider(
        providerState,
        null,
        degradedReason,
        "Valid"
      ),
      tone: providerTone,
      connectorState: "Connected",
      readinessState,
      latency: `${Math.max(20, Date.now() - startedAt)}ms`,
      freshness: activeFreshness,
      feedHealth: activeFeedHealth,
      lastUpdate: chart?.lastCandleUpdate
        ? new Date(chart.lastCandleUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : activeQuote?.lastUpdate || freshest.lastUpdate,
      blockedReason:
        readinessState === "Degraded"
          ? "The selected symbol does not currently have a healthy live quote or chart lane."
          : null,
      degradedReason,
      fallbackActive: false,
      partialCoverage: partialFailure,
      providerSymbolInUse: chart?.providerSymbol || activeQuote?.providerSymbol || activeMapping.providerSymbol,
      mappingState: chart?.mappingState || activeQuote?.mappingState || activeMapping.mappingState,
      chartReadiness: chartReady ? chart.readinessState : "Degraded",
      lastCandleUpdate: chart?.lastCandleUpdate || null,
      chartFreshness: chart?.freshness || "Pending"
    };

    const payload = {
      ok: true,
      fallback: false,
      provider,
      quotes,
      chart,
      diagnostics: {
        providerName: provider.label,
        providerSymbol: activeMapping.providerSymbol,
        mappingState: activeMapping.mappingState,
        connectionState: provider.connectorState,
        readinessState: provider.readinessState,
        lastUpdateTime: provider.lastUpdate,
        freshness: provider.freshness,
        degradedReason: provider.degradedReason,
        strongestSymbol: freshest.symbol,
        stalestSymbol: stalest.symbol,
        requestedSymbols: targets.length,
        receivedQuotes: quotes.length,
        chartState: chartReady ? chart.readinessState : "Degraded",
        chartFreshness: chart?.freshness || "Pending",
        lastCandleUpdate: chart?.lastCandleUpdate || null,
        timeframe: timeframe.key
      }
    };

    runtimeCache.set(cacheKey, { at: Date.now(), payload });
    return json(payload);
  } catch (error) {
    return json({
      ok: false,
      fallback: true,
      provider: buildFallbackProvider(
        "Fallback to Demo",
        "Twelve Data could not be reached successfully from the local runtime.",
        serializeError(error),
        "Valid"
      ),
      quotes: [],
      chart: null
    });
  }
}
