import fs from "node:fs";
import path from "node:path";
import {
  createInstrumentSeed,
  getInstrumentMeta,
  getTimeframeConfig,
  listSupportedInstruments
} from "./market-catalog.js";

const INTERNAL_PIPELINE_FILE = path.join(process.cwd(), "data", "internal-market-pipeline.json");
const PROVIDER_CATALOG = [
  {
    key: "demo",
    label: "Demo Feed",
    mode: "deterministic-local",
    readOnly: true,
    description: "Deterministic local quotes and candles for paper execution and UI stability."
  },
  {
    key: "local-bridge",
    label: "Internal Bridge",
    mode: "file-pipeline",
    readOnly: true,
    description: "Local JSON bridge for future internal market-data pipelines."
  }
];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function configuredProviderKey() {
  const requested = String(process.env.TPM_MARKET_PROVIDER || "demo").trim().toLowerCase();
  return PROVIDER_CATALOG.some((item) => item.key === requested) ? requested : "demo";
}

function bucketTimestamp(timeMs, intervalMs) {
  return Math.floor(timeMs / intervalMs) * intervalMs;
}

function computePriceOffset(meta, timeMs) {
  const seed = createInstrumentSeed(meta.symbol);
  const minutes = timeMs / 60000;
  const slowWave = Math.sin(minutes / 180 + seed * 0.017) * (meta.dailyVolPct * 0.34);
  const mediumWave = Math.cos(minutes / 38 + seed * 0.043) * (meta.dailyVolPct * 0.18);
  const fastWave = Math.sin(minutes / 5.6 + seed * 0.11) * (meta.dailyVolPct * 0.05);
  return slowWave + mediumWave + fastWave;
}

function computeMidPrice(meta, timeMs) {
  return meta.baseline * (1 + computePriceOffset(meta, timeMs) / 100);
}

function computeSpread(meta, timeMs) {
  const seed = createInstrumentSeed(meta.symbol);
  const pulse = 1 + Math.abs(Math.sin(timeMs / 900000 + seed * 0.031)) * 0.8;
  return Math.max(meta.baseSpread * pulse, meta.tickSize);
}

function computeQuote(meta, timeMs = Date.now()) {
  const timestamp = bucketTimestamp(timeMs, 1000);
  const last = computeMidPrice(meta, timestamp);
  const previousClose = computeMidPrice(meta, timestamp - 24 * 60 * 60 * 1000);
  const spread = computeSpread(meta, timestamp);
  const bid = last - spread / 2;
  const ask = last + spread / 2;
  const changeValue = last - previousClose;
  const changePct = previousClose ? (changeValue / previousClose) * 100 : 0;
  const volumeSeed = createInstrumentSeed(meta.symbol);
  const volume =
    (meta.category === "Digital Asset" ? 5200 : meta.category === "FX Major" ? 16800 : 9100) +
    Math.round(Math.abs(Math.sin(timestamp / 1800000 + volumeSeed * 0.07)) * 7600);

  return {
    symbol: meta.symbol,
    name: meta.name,
    venue: meta.venue,
    category: meta.category,
    last: round(last, meta.digits),
    bid: round(bid, meta.digits),
    ask: round(ask, meta.digits),
    spread: round(Math.abs(ask - bid), Math.max(meta.digits, 4)),
    changeValue: round(changeValue, meta.digits),
    changePct: round(changePct, 2),
    volume,
    timestamp: new Date(timestamp).toISOString(),
    providerKey: "demo"
  };
}

function computeCandle(meta, barTimeMs, intervalMs) {
  const open = computeMidPrice(meta, barTimeMs);
  const close = computeMidPrice(meta, barTimeMs + intervalMs * 0.82);
  const mid = computeMidPrice(meta, barTimeMs + intervalMs * 0.41);
  const spread = computeSpread(meta, barTimeMs);
  const excursion = Math.max(meta.tickSize, spread * 1.5);
  const high = Math.max(open, close, mid) + excursion * 0.75;
  const low = Math.min(open, close, mid) - excursion * 0.72;
  const seed = createInstrumentSeed(meta.symbol);
  const volume =
    (meta.category === "Digital Asset" ? 620 : meta.category === "FX Major" ? 920 : 740) +
    Math.round(Math.abs(Math.cos(barTimeMs / 1800000 + seed * 0.09)) * 520);

  return {
    time: new Date(barTimeMs).toISOString(),
    open: round(open, meta.digits),
    high: round(high, meta.digits),
    low: round(low, meta.digits),
    close: round(close, meta.digits),
    volume
  };
}

function buildDemoCandles(symbol, timeframeKey = "15m", limit = 72, timeMs = Date.now()) {
  const meta = getInstrumentMeta(symbol);
  const timeframe = getTimeframeConfig(timeframeKey);
  const safeLimit = clamp(limit, 16, 96);
  const latestBarTime = bucketTimestamp(timeMs, timeframe.intervalMs);
  const candles = [];

  for (let index = safeLimit - 1; index >= 0; index -= 1) {
    const barTime = latestBarTime - timeframe.intervalMs * index;
    candles.push(computeCandle(meta, barTime, timeframe.intervalMs));
  }

  return {
    symbol,
    timeframe: timeframe.key,
    updatedAt: candles[candles.length - 1]?.time || new Date(latestBarTime).toISOString(),
    candles,
    providerKey: "demo"
  };
}

function readInternalPipeline() {
  if (!fs.existsSync(INTERNAL_PIPELINE_FILE)) {
    return {
      ok: false,
      error: "Internal market-data bridge file is not present.",
      path: INTERNAL_PIPELINE_FILE,
      payload: null
    };
  }

  try {
    const raw = fs.readFileSync(INTERNAL_PIPELINE_FILE, "utf8");
    return {
      ok: true,
      error: null,
      path: INTERNAL_PIPELINE_FILE,
      payload: JSON.parse(raw)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Internal bridge JSON could not be parsed.",
      path: INTERNAL_PIPELINE_FILE,
      payload: null
    };
  }
}

function resolvePipelineSymbolBlock(payload, symbol) {
  const symbols = payload?.symbols || payload?.markets || {};
  if (symbols && typeof symbols === "object" && !Array.isArray(symbols)) {
    return symbols[symbol] || symbols[symbol.toUpperCase()] || symbols[symbol.toLowerCase()] || null;
  }

  const collection = asArray(symbols);
  return collection.find((item) => item?.symbol === symbol) || null;
}

function normalizeBridgeQuote(symbol, block, payload) {
  const meta = getInstrumentMeta(symbol);
  const source = block?.quote || block?.quotes || block || {};
  const last = Number(source.last ?? source.price ?? source.close);
  const bid = Number(source.bid ?? last - meta.baseSpread / 2);
  const ask = Number(source.ask ?? last + meta.baseSpread / 2);
  const previousClose = Number(source.previousClose ?? source.previous_close ?? last);
  const spread = Number.isFinite(Number(source.spread)) ? Number(source.spread) : Math.abs(ask - bid);
  const changeValue = Number.isFinite(Number(source.changeValue))
    ? Number(source.changeValue)
    : Number.isFinite(last) && Number.isFinite(previousClose)
      ? last - previousClose
      : 0;
  const changePct = Number.isFinite(Number(source.changePct))
    ? Number(source.changePct)
    : Number.isFinite(last) && Number.isFinite(previousClose) && previousClose !== 0
      ? ((last - previousClose) / previousClose) * 100
      : 0;
  const timestamp = source.timestamp || source.updatedAt || block?.updatedAt || payload?.updatedAt || new Date().toISOString();

  if (!Number.isFinite(last)) return null;

  return {
    symbol,
    name: source.name || meta.name,
    venue: source.venue || meta.venue,
    category: source.category || meta.category,
    last: round(last, meta.digits),
    bid: round(Number.isFinite(bid) ? bid : last - meta.baseSpread / 2, meta.digits),
    ask: round(Number.isFinite(ask) ? ask : last + meta.baseSpread / 2, meta.digits),
    spread: round(Number.isFinite(spread) ? spread : Math.abs(ask - bid), Math.max(meta.digits, 4)),
    changeValue: round(changeValue, meta.digits),
    changePct: round(changePct, 2),
    volume: Number(source.volume ?? 0),
    timestamp: new Date(timestamp).toISOString(),
    providerKey: "local-bridge"
  };
}

function normalizeBridgeCandle(symbol, timeframeKey, block, payload) {
  const meta = getInstrumentMeta(symbol);
  const timeframe = getTimeframeConfig(timeframeKey);
  const source =
    block?.candles?.[timeframeKey] ||
    block?.candles?.[timeframe.key] ||
    block?.candles?.[timeframe.label] ||
    block?.[timeframeKey] ||
    block?.[timeframe.key] ||
    [];
  const candles = asArray(source)
    .map((item) => ({
      time: new Date(item.time || item.timestamp || item.date || item.datetime).toISOString(),
      open: round(Number(item.open), meta.digits),
      high: round(Number(item.high), meta.digits),
      low: round(Number(item.low), meta.digits),
      close: round(Number(item.close), meta.digits),
      volume: Number(item.volume ?? 0)
    }))
    .filter((item) => Number.isFinite(item.open) && Number.isFinite(item.high) && Number.isFinite(item.low) && Number.isFinite(item.close));

  return {
    symbol,
    timeframe: timeframe.key,
    updatedAt: candles[candles.length - 1]?.time || payload?.updatedAt || new Date().toISOString(),
    candles,
    providerKey: "local-bridge"
  };
}

class DemoMarketProvider {
  key = "demo";

  label = "Demo Feed";

  async getQuotes(symbols = []) {
    return symbols.map((symbol) => computeQuote(getInstrumentMeta(symbol)));
  }

  async getCandles(symbol, timeframeKey = "15m", limit = 72) {
    return buildDemoCandles(symbol, timeframeKey, limit);
  }

  async getHealth() {
    return {
      key: this.key,
      label: this.label,
      state: "ready",
      freshness: "Fresh",
      readOnly: true,
      updatedAt: new Date().toISOString(),
      path: null,
      reason: null
    };
  }
}

class LocalBridgeMarketProvider {
  key = "local-bridge";

  label = "Internal Bridge";

  async getQuotes(symbols = []) {
    const runtime = readInternalPipeline();
    if (!runtime.ok || !runtime.payload) return [];

    return symbols
      .map((symbol) => normalizeBridgeQuote(symbol, resolvePipelineSymbolBlock(runtime.payload, symbol), runtime.payload))
      .filter(Boolean);
  }

  async getCandles(symbol, timeframeKey = "15m") {
    const runtime = readInternalPipeline();
    if (!runtime.ok || !runtime.payload) {
      return {
        symbol,
        timeframe: timeframeKey,
        updatedAt: null,
        candles: [],
        providerKey: this.key
      };
    }

    return normalizeBridgeCandle(symbol, timeframeKey, resolvePipelineSymbolBlock(runtime.payload, symbol), runtime.payload);
  }

  async getHealth() {
    const runtime = readInternalPipeline();
    if (!runtime.ok || !runtime.payload) {
      return {
        key: this.key,
        label: this.label,
        state: "unavailable",
        freshness: "Stale",
        readOnly: true,
        updatedAt: null,
        path: runtime.path,
        reason: runtime.error
      };
    }

    const updatedAt = runtime.payload.updatedAt || runtime.payload.timestamp || new Date().toISOString();
    const ageMs = Math.max(0, Date.now() - Date.parse(updatedAt));
    const freshness = ageMs <= 15000 ? "Fresh" : ageMs <= 90000 ? "Warm" : "Stale";

    return {
      key: this.key,
      label: this.label,
      state: freshness === "Stale" ? "degraded" : "ready",
      freshness,
      readOnly: true,
      updatedAt: new Date(updatedAt).toISOString(),
      path: runtime.path,
      reason: freshness === "Stale" ? "Internal bridge data is older than the expected local refresh window." : null
    };
  }
}

function providerInstance(key = configuredProviderKey()) {
  if (key === "local-bridge") return new LocalBridgeMarketProvider();
  return new DemoMarketProvider();
}

export function getMarketProviderCatalog() {
  return PROVIDER_CATALOG.slice();
}

export function getConfiguredMarketProviderKey() {
  return configuredProviderKey();
}

export async function getProviderHealth(key = configuredProviderKey()) {
  return providerInstance(key).getHealth();
}

export async function fetchProviderQuotes(key, symbols = []) {
  return providerInstance(key).getQuotes(symbols);
}

export async function fetchProviderCandles(key, symbol, timeframeKey = "15m", limit = 72) {
  return providerInstance(key).getCandles(symbol, timeframeKey, limit);
}

export async function resolveProviderRuntime({ requestedKey = configuredProviderKey() } = {}) {
  const requested = PROVIDER_CATALOG.find((item) => item.key === requestedKey) || PROVIDER_CATALOG[0];
  const requestedHealth = await getProviderHealth(requested.key);
  const fallbackActive = requested.key !== "demo" && requestedHealth.state !== "ready";
  const resolved = fallbackActive ? PROVIDER_CATALOG[0] : requested;
  const resolvedHealth = fallbackActive ? await getProviderHealth("demo") : requestedHealth;

  return {
    requested,
    resolved,
    requestedHealth,
    resolvedHealth,
    fallbackActive,
    fallbackReason: fallbackActive ? requestedHealth.reason || "Requested provider is unavailable." : null
  };
}

export function buildDemoWatch(symbols = listSupportedInstruments().map((item) => item.symbol)) {
  return symbols.map((symbol) => computeQuote(getInstrumentMeta(symbol)));
}
