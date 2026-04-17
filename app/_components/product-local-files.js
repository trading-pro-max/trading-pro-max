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

function normalizeCollectionCheckpoint(checkpoint = {}) {
  return {
    id: String(checkpoint.id || ""),
    reportId: String(checkpoint.reportId || "").trim(),
    label: String(checkpoint.label || ""),
    note: String(checkpoint.note || ""),
    createdAt: String(checkpoint.createdAt || ""),
    updatedAt: String(checkpoint.updatedAt || "")
  };
}

function normalizeCollectionNoteHistory(history = []) {
  return (Array.isArray(history) ? history : [history])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      id: String(entry.id || ""),
      note: String(entry.note || entry.notes || ""),
      summary: String(entry.summary || ""),
      savedAt: String(entry.savedAt || entry.updatedAt || entry.createdAt || "")
    }))
    .filter((entry) => entry.note)
    .slice(0, 12);
}

function normalizeCollectionBundleSection(bundle = {}) {
  if (!bundle || typeof bundle !== "object") return null;

  return {
    mode: String(bundle.mode || "checkpoint-aware-replay-bundle"),
    summary: String(bundle.summary || ""),
    collectionNotes: String(bundle.collectionNotes || ""),
    noteHistory: normalizeCollectionNoteHistory(bundle.noteHistory || []),
    selectedCheckpointIds: Array.from(
      new Set(
        (Array.isArray(bundle.selectedCheckpointIds) ? bundle.selectedCheckpointIds : [bundle.selectedCheckpointIds])
          .map((checkpointId) => String(checkpointId || "").trim())
          .filter(Boolean)
      )
    ),
    selectedCheckpoints: (Array.isArray(bundle.selectedCheckpoints) ? bundle.selectedCheckpoints : [bundle.selectedCheckpoints])
      .filter((checkpoint) => checkpoint && typeof checkpoint === "object")
      .map((checkpoint) => normalizeCollectionCheckpoint(checkpoint))
      .filter((checkpoint) => checkpoint.reportId),
    checkpointContexts: (Array.isArray(bundle.checkpointContexts) ? bundle.checkpointContexts : [bundle.checkpointContexts])
      .filter((context) => context && typeof context === "object"),
    health: bundle.health && typeof bundle.health === "object" ? bundle.health : null
  };
}

export function buildContinuityInsightCollectionPackPayload(collection, reports = [], options = {}) {
  if (!collection) return null;

  const bundle = normalizeCollectionBundleSection(options.bundle || null);

  return {
    product: "Trading Pro Max",
    kind: "continuity-insight-collection-pack",
    version: bundle ? "local-continuity-collection-pack-v2" : "local-continuity-collection-pack-v1",
    exportedAt: new Date().toISOString(),
    collection: {
      id: String(collection.id || ""),
      name: String(collection.name || "Insight Collection"),
      summary: String(collection.summary || ""),
      reportIds: Array.isArray(collection.reportIds) ? collection.reportIds : [],
      notes: String(collection.notes || ""),
      noteHistory: normalizeCollectionNoteHistory(collection.noteHistory || []),
      checkpoints: Array.isArray(collection.checkpoints) ? collection.checkpoints : [],
      coverage: {
        symbols: Array.isArray(collection.coverage?.symbols) ? collection.coverage.symbols : [],
        routes: Array.isArray(collection.coverage?.routes) ? collection.coverage.routes : [],
        protections: Array.isArray(collection.coverage?.protections) ? collection.coverage.protections : []
      },
      createdAt: String(collection.createdAt || ""),
      updatedAt: String(collection.updatedAt || ""),
      lastOpenedAt: String(collection.lastOpenedAt || "")
    },
    reports: (Array.isArray(reports) ? reports : []).filter(Boolean),
    ...(bundle ? { bundle } : {})
  };
}

export function exportContinuityInsightCollectionPack(collection, reports = [], options = {}) {
  const payload = buildContinuityInsightCollectionPackPayload(collection, reports, options);
  if (!payload) return false;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = payload.bundle ? "trading-pro-max-continuity-replay-bundle" : "trading-pro-max-continuity-collection";
  downloadJson(
    `${prefix}-${sanitizeFilename(collection.name, "insight-collection")}-${stamp}.json`,
    payload
  );
  return true;
}

export function normalizeContinuityInsightCollectionPackPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.kind !== "continuity-insight-collection-pack") return null;

  const collection = payload.collection;
  if (!collection || typeof collection !== "object") return null;

  const reports = Array.isArray(payload.reports) ? payload.reports.filter((report) => report && typeof report === "object") : [];
  if (!reports.length) return null;

  return {
    product: String(payload.product || "Trading Pro Max"),
    kind: "continuity-insight-collection-pack",
    version: String(payload.version || "local-continuity-collection-pack-v1"),
    exportedAt: String(payload.exportedAt || ""),
    collection: {
      id: String(collection.id || ""),
      name: String(collection.name || "Insight Collection"),
      summary: String(collection.summary || ""),
      reportIds: Array.isArray(collection.reportIds) ? collection.reportIds.map((reportId) => String(reportId || "").trim()).filter(Boolean) : [],
      notes: String(collection.notes || ""),
      noteHistory: normalizeCollectionNoteHistory(collection.noteHistory || []),
      checkpoints: Array.isArray(collection.checkpoints)
        ? collection.checkpoints
            .filter((checkpoint) => checkpoint && typeof checkpoint === "object")
            .map((checkpoint) => normalizeCollectionCheckpoint(checkpoint))
            .filter((checkpoint) => checkpoint.reportId)
        : [],
      coverage: {
        symbols: Array.isArray(collection.coverage?.symbols) ? collection.coverage.symbols.map((value) => String(value || "").trim()).filter(Boolean) : [],
        routes: Array.isArray(collection.coverage?.routes) ? collection.coverage.routes.map((value) => String(value || "").trim()).filter(Boolean) : [],
        protections: Array.isArray(collection.coverage?.protections) ? collection.coverage.protections.map((value) => String(value || "").trim()).filter(Boolean) : []
      },
      createdAt: String(collection.createdAt || ""),
      updatedAt: String(collection.updatedAt || ""),
      lastOpenedAt: String(collection.lastOpenedAt || "")
    },
    reports,
    bundle: normalizeCollectionBundleSection(payload.bundle || null)
  };
}
