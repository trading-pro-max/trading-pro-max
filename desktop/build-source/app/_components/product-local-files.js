"use client";

export function downloadJson(filename, payload) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function sanitizeFilename(value, fallback) {
  const sanitized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return sanitized || fallback;
}

export function buildContinuityInsightExportPayload(report) {
  return {
    product: "Trading Pro Max",
    kind: "continuity-insight-report",
    version: "local-continuity-insight-v2",
    exportedAt: new Date().toISOString(),
    report
  };
}

export function exportContinuityInsightReport(report) {
  if (!report) return false;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(
    `trading-pro-max-continuity-insight-${sanitizeFilename(report.name, "insight-report")}-${stamp}.json`,
    buildContinuityInsightExportPayload(report)
  );
  return true;
}
