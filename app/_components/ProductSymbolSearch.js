"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ProductPill } from "./ProductShell";
import { bodyTextStyle, moduleInsetStyle, sectionLabelStyle } from "./product-module-style";
import { createButton, deskTheme } from "./product-theme";
import {
  getLiveFreshnessTone,
  getLiveHealthTone,
  searchRuntimeSymbols
} from "./product-live-data";
import { describeProviderCoverage } from "./product-live-market";
import { useProductTradingStore } from "./product-trading-store";

function fieldStyle() {
  return {
    width: "100%",
    background: "rgba(8, 15, 29, 0.92)",
    color: deskTheme.colors.text,
    borderRadius: 14,
    border: `1px solid ${deskTheme.colors.line}`,
    padding: "12px 14px",
    fontFamily: deskTheme.fonts.ui,
    boxShadow: deskTheme.shadows.inner
  };
}

function validationTone(state) {
  if (state === "Supported") return "success";
  if (state === "Partially Supported") return "warning";
  return "danger";
}

export function ProductSymbolSearch({
  title = "Symbol Search",
  subtitle = "Search supported live-market symbols and push them into the shared workspace.",
  accent = "info",
  compact = false
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const selectedSymbol = useProductTradingStore((state) => state.selectedSymbol);
  const watchlist = useProductTradingStore((state) => state.watchlist);
  const trackedSymbols = useProductTradingStore((state) => state.trackedSymbols);
  const liveDataStatus = useProductTradingStore((state) => state.liveDataStatus);
  const liveDataDiagnostics = useProductTradingStore((state) => state.liveDataDiagnostics);
  const symbolRuntimeHealth = useProductTradingStore((state) => state.symbolRuntimeHealth);
  const selectSymbol = useProductTradingStore((state) => state.selectSymbol);

  const results = useMemo(
    () =>
      searchRuntimeSymbols(deferredQuery, {
        limit: compact ? 5 : 7,
        prioritySymbols: [
          selectedSymbol,
          ...(watchlist || []).map((item) => item.symbol),
          ...(trackedSymbols || [])
        ].filter(Boolean)
      }),
    [compact, deferredQuery, selectedSymbol, trackedSymbols, watchlist]
  );

  const topResult = results[0] || null;
  const validationTarget = topResult
    ? describeProviderCoverage(topResult.symbol)
    : deferredQuery
      ? describeProviderCoverage(deferredQuery)
      : describeProviderCoverage(selectedSymbol);
  const runtimePreview =
    symbolRuntimeHealth.find((item) => item.symbol === validationTarget.symbol) ||
    (validationTarget.symbol === selectedSymbol
      ? {
          feedHealth: liveDataDiagnostics?.feedHealth,
          freshness: liveDataDiagnostics?.freshness,
          degradedReason: liveDataDiagnostics?.degradedReason
        }
      : null);

  return (
    <div style={moduleInsetStyle(accent, compact ? 12 : 14)}>
      <div style={sectionLabelStyle()}>{title}</div>
      <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{subtitle}</div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && topResult) {
            event.preventDefault();
            selectSymbol(topResult.symbol);
          }
        }}
        placeholder="Search EUR/USD, BTC, AAPL, Nasdaq..."
        style={{ ...fieldStyle(), marginTop: 12 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <ProductPill label={selectedSymbol || "No symbol"} tone="info" />
        <ProductPill label={`${results.length} mapped`} tone="neutral" />
        {liveDataStatus?.providerSymbol ? (
          <ProductPill
            label={liveDataStatus.providerSymbol}
            tone={getLiveHealthTone(liveDataStatus.feedHealth || "Stable")}
          />
        ) : null}
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 14,
          border: `1px solid ${deskTheme.colors.line}`,
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.94) 100%)",
          padding: compact ? 12 : 14
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>{validationTarget.symbol || "Runtime Validation"}</div>
            <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>
              {validationTarget.label || "No live mapping available"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProductPill label={validationTarget.supportState} tone={validationTone(validationTarget.supportState)} />
            <ProductPill label={validationTarget.assetClass || "Unknown"} tone="neutral" />
            <ProductPill label={validationTarget.providerSymbol || "--"} tone={validationTarget.mappingState === "Mapped" ? "warning" : "info"} />
          </div>
        </div>
        <div style={{ ...bodyTextStyle(), marginTop: 10 }}>{validationTarget.capabilitySummary}</div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{validationTarget.coverageLimit}</div>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
          <div>
            <div style={sectionLabelStyle()}>Mapping</div>
            <div style={{ color: "#f8fafc", marginTop: 6, fontWeight: 800 }}>{validationTarget.mappingState}</div>
          </div>
          <div>
            <div style={sectionLabelStyle()}>Runtime Freshness</div>
            <div style={{ color: deskTheme.colors.text, marginTop: 6, fontWeight: 800 }}>
              {runtimePreview?.freshness ? (
                <span style={{ color: deskTheme.colors.text }}>{runtimePreview.freshness}</span>
              ) : (
                "Verify on selection"
              )}
            </div>
          </div>
          <div>
            <div style={sectionLabelStyle()}>Feed State</div>
            <div style={{ color: deskTheme.colors.text, marginTop: 6, fontWeight: 800 }}>
              {runtimePreview?.feedHealth || "Ready to validate"}
            </div>
          </div>
        </div>
        {runtimePreview?.degradedReason ? (
          <div style={{ color: "#fde68a", marginTop: 10, lineHeight: 1.6 }}>
            Degraded reason: {runtimePreview.degradedReason}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {results.map((item) => {
          const active = item.symbol === selectedSymbol;
          const coverage = describeProviderCoverage(item.symbol);
          const runtime = symbolRuntimeHealth.find((entry) => entry.symbol === item.symbol);

          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => selectSymbol(item.symbol)}
              style={{
                textAlign: "left",
                background: active
                  ? "linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(15, 23, 42, 0.92) 78%)"
                  : "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.94) 100%)",
                borderRadius: 14,
                border: active ? `1px solid ${deskTheme.colors.lineStrong}` : `1px solid ${deskTheme.colors.line}`,
                padding: compact ? 12 : 13,
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{item.symbol}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>{item.label}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ProductPill label={coverage.supportState} tone={validationTone(coverage.supportState)} />
                  <ProductPill label={item.assetClass} tone="neutral" />
                  <ProductPill label={item.mappingState === "Mapped" ? item.providerSymbol : "Native"} tone={item.mappingState === "Mapped" ? "warning" : "info"} />
                </div>
              </div>
              <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.55 }}>
                {coverage.capabilitySummary}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <ProductPill
                  label={runtime?.feedHealth || "Awaiting runtime"}
                  tone={runtime ? getLiveHealthTone(runtime.feedHealth || "Stable") : "neutral"}
                />
                <ProductPill
                  label={runtime?.freshness || "Pending"}
                  tone={runtime ? getLiveFreshnessTone(runtime.freshness || "Pending") : "neutral"}
                />
              </div>
            </button>
          );
        })}
      </div>
      {query && !results.length ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 14,
            border: `1px solid ${deskTheme.colors.line}`,
            background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.94) 100%)",
            padding: 14,
            color: deskTheme.colors.soft,
            lineHeight: 1.6
          }}
        >
          No supported live mapping found for this query yet. Trading Pro Max currently supports a focused catalog such as `EUR/USD`, `BTC/USD`, `AAPL`, `SPY`, and `NASDAQ`.
        </div>
      ) : null}
      {query ? (
        <button type="button" onClick={() => setQuery("")} style={{ ...createButton({ tone: "neutral" }), marginTop: 12 }}>
          Clear Search
        </button>
      ) : null}
    </div>
  );
}
