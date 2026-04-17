"use client";

import { useMemo, useRef, useState } from "react";
import { ProductPill } from "./ProductShell";
import { bodyTextStyle, moduleInsetStyle, sectionLabelStyle } from "./product-module-style";
import { createButton, deskTheme } from "./product-theme";
import { useProductTradingStore } from "./product-trading-store";
import {
  exportSavedWatchlistsPayload,
  getSavedWatchlistTemplates,
  previewSavedWatchlistImport,
  summarizeWatchlistContext,
  summarizeWatchlistPreset
} from "./product-watchlists";

function inputStyle() {
  return {
    width: "100%",
    background: "rgba(8, 15, 29, 0.92)",
    color: deskTheme.colors.text,
    borderRadius: 12,
    border: `1px solid ${deskTheme.colors.line}`,
    padding: "11px 12px",
    fontFamily: deskTheme.fonts.ui,
    boxShadow: deskTheme.shadows.inner
  };
}

function textAreaStyle() {
  return {
    ...inputStyle(),
    minHeight: 88,
    resize: "vertical"
  };
}

function statusColor(tone) {
  if (tone === "success") return deskTheme.colors.green;
  if (tone === "danger") return deskTheme.colors.red;
  if (tone === "info") return deskTheme.colors.sky;
  return deskTheme.colors.soft;
}

function watchlistRowStyle(active, compact) {
  return {
    borderRadius: 14,
    border: active ? `1px solid ${deskTheme.colors.lineStrong}` : `1px solid ${deskTheme.colors.line}`,
    background: active
      ? "linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(15, 23, 42, 0.92) 82%)"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.94) 100%)",
    padding: compact ? 12 : 13
  };
}

function previewTone(action) {
  if (action === "add") return "success";
  if (action === "merge") return "warning";
  return "neutral";
}

export function ProductWatchlistManager({
  title = "Saved Watchlists",
  subtitle = "Persist market focus sets locally and move the shared runtime between them.",
  accent = "info",
  compact = false
}) {
  const savedWatchlists = useProductTradingStore((state) => state.savedWatchlists);
  const activeWatchlistId = useProductTradingStore((state) => state.activeWatchlistId);
  const activeWatchlist = useProductTradingStore((state) => state.activeWatchlist);
  const watchlist = useProductTradingStore((state) => state.watchlist);
  const createSavedWatchlist = useProductTradingStore((state) => state.createSavedWatchlist);
  const createSavedWatchlistFromTemplate = useProductTradingStore((state) => state.createSavedWatchlistFromTemplate);
  const startupTemplateKey = useProductTradingStore((state) => state.startupTemplateKey);
  const activateSavedWatchlist = useProductTradingStore((state) => state.activateSavedWatchlist);
  const renameSavedWatchlist = useProductTradingStore((state) => state.renameSavedWatchlist);
  const pinSavedWatchlist = useProductTradingStore((state) => state.pinSavedWatchlist);
  const removeSavedWatchlist = useProductTradingStore((state) => state.removeSavedWatchlist);
  const captureSavedWatchlistPreset = useProductTradingStore((state) => state.captureSavedWatchlistPreset);
  const updateSavedWatchlistContext = useProductTradingStore((state) => state.updateSavedWatchlistContext);
  const importSavedWatchlists = useProductTradingStore((state) => state.importSavedWatchlists);
  const setStartupTemplate = useProductTradingStore((state) => state.setStartupTemplate);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [contextEditingId, setContextEditingId] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftIntent, setDraftIntent] = useState("");
  const [ioMessage, setIoMessage] = useState("");
  const [ioTone, setIoTone] = useState("neutral");
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);

  const fallbackSymbols = useMemo(() => watchlist.map((item) => item.symbol), [watchlist]);
  const activePresetSummary = useMemo(
    () => summarizeWatchlistPreset(activeWatchlist).filter(Boolean),
    [activeWatchlist]
  );
  const activeContext = useMemo(() => summarizeWatchlistContext(activeWatchlist), [activeWatchlist]);
  const watchlistTemplates = useMemo(() => getSavedWatchlistTemplates(), []);
  const startupTemplate = useMemo(
    () => watchlistTemplates.find((template) => template.key === startupTemplateKey) || null,
    [startupTemplateKey, watchlistTemplates]
  );

  function updateIoMessage(message, tone = "neutral") {
    setIoMessage(message);
    setIoTone(tone);
  }

  function resetEditors() {
    setEditingId("");
    setEditingName("");
    setContextEditingId("");
    setDraftNotes("");
    setDraftTags("");
    setDraftIntent("");
  }

  function handleCreate() {
    createSavedWatchlist(newName, fallbackSymbols);
    setNewName("");
    updateIoMessage("Current runtime saved as a reusable local watchlist preset.", "success");
  }

  function handleExport() {
    if (typeof window === "undefined" || !savedWatchlists.length) return;

    const payload = exportSavedWatchlistsPayload(savedWatchlists);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    anchor.href = url;
    anchor.download = `trading-pro-max-watchlists-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    updateIoMessage("Saved watchlists exported locally as JSON.", "success");
  }

  async function handleImportChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const analysis = previewSavedWatchlistImport(savedWatchlists, payload, fallbackSymbols);

      if (!analysis.validCount && !analysis.invalidCount) {
        throw new Error("Watchlist file does not contain any importable local watchlists.");
      }

      setImportPreview({
        fileName: file.name,
        payload,
        analysis
      });
      updateIoMessage("Import preview is ready for local review before any change is applied.", "info");
    } catch (error) {
      setImportPreview(null);
      updateIoMessage(
        error instanceof Error ? error.message : "Could not import the selected watchlist file.",
        "danger"
      );
    } finally {
      event.target.value = "";
    }
  }

  function beginContextEdit(item) {
    const context = summarizeWatchlistContext(item);
    setContextEditingId(item.id);
    setDraftNotes(context.notes);
    setDraftTags((context.sessionTags || []).join(", "));
    setDraftIntent(context.sessionIntent || "");
  }

  function applyImportPreview() {
    if (!importPreview) return;
    importSavedWatchlists(importPreview.payload);
    updateIoMessage(
      `${importPreview.analysis.newCount} added, ${importPreview.analysis.mergeCount} merged, and ${importPreview.analysis.skipCount} skipped from ${importPreview.fileName}.`,
      "success"
    );
    setImportPreview(null);
  }

  return (
    <div style={moduleInsetStyle(accent, compact ? 12 : 14)}>
      <div style={sectionLabelStyle()}>{title}</div>
      <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>{subtitle}</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <ProductPill label={activeWatchlist?.name || "No active set"} tone="info" />
        <ProductPill label={`${savedWatchlists.length} saved`} tone="neutral" />
        <ProductPill label={`${activeWatchlist?.symbols?.length || watchlist.length} symbols`} tone="success" />
        {startupTemplate ? <ProductPill label={`Startup ${startupTemplate.name}`} tone="warning" /> : null}
      </div>

      {activePresetSummary.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {activePresetSummary.map((item) => (
            <ProductPill key={item} label={item} tone="neutral" />
          ))}
          {activeContext.sessionIntent ? (
            <ProductPill label={`Intent ${activeContext.sessionIntent}`} tone="info" />
          ) : null}
          {(activeContext.sessionTags || []).map((tag) => (
            <ProductPill key={`active-${tag}`} label={`Tag ${tag}`} tone="warning" />
          ))}
        </div>
      ) : null}

      {activeContext.hasContext ? (
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          <div style={{ ...bodyTextStyle(), color: deskTheme.colors.soft }}>{activeContext.notesPreview}</div>
          {activeContext.sessionIntent ? (
            <div style={{ ...bodyTextStyle(), color: deskTheme.colors.sky }}>Session intent: {activeContext.sessionIntent}</div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr auto", gap: 10, marginTop: 12 }}>
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && fallbackSymbols.length) {
              handleCreate();
            }
          }}
          placeholder="Create a watchlist from the current runtime"
          style={inputStyle()}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!fallbackSymbols.length}
          style={{
            ...createButton({ tone: "info" }),
            justifyContent: "center",
            opacity: fallbackSymbols.length ? 1 : 0.5,
            cursor: fallbackSymbols.length ? "pointer" : "not-allowed"
          }}
        >
          Save Current
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button
          type="button"
          onClick={handleExport}
          disabled={!savedWatchlists.length}
          style={{
            ...createButton({ tone: "neutral" }),
            opacity: savedWatchlists.length ? 1 : 0.5,
            cursor: savedWatchlists.length ? "pointer" : "not-allowed"
          }}
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={createButton({ tone: "info" })}
        >
          Import JSON
        </button>
        {activeWatchlist ? (
          <button
            type="button"
            onClick={() => {
              captureSavedWatchlistPreset(activeWatchlist.id);
              updateIoMessage(`${activeWatchlist.name} preset refreshed from the current workspace.`, "success");
            }}
            style={createButton({ tone: "success" })}
          >
            Save Active Preset
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportChange}
        style={{ display: "none" }}
      />

      {ioMessage ? (
        <div style={{ ...bodyTextStyle(), marginTop: 10, color: statusColor(ioTone) }}>{ioMessage}</div>
      ) : null}

      <div style={{ ...moduleInsetStyle("info", compact ? 12 : 14), marginTop: 14 }}>
        <div style={sectionLabelStyle()}>Watchlist Templates</div>
        <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>
          Clone ready-made local market-set templates to speed up operator setup with zero external dependency.
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {watchlistTemplates.map((template) => (
            <div key={template.key} style={watchlistRowStyle(false, true)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{template.name}</div>
                  <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{template.summary}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStartupTemplate(template.key);
                      updateIoMessage(`${template.name} is now armed as the next local startup market set.`, "warning");
                    }}
                    style={createButton({ tone: startupTemplateKey === template.key ? "warning" : "neutral" })}
                  >
                    {startupTemplateKey === template.key ? "Startup Ready" : "Set Startup"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      createSavedWatchlistFromTemplate(template.key);
                      updateIoMessage(`${template.name} cloned into the local watchlist library.`, "success");
                    }}
                    style={createButton({ tone: "success" })}
                  >
                    Clone Template
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {summarizeWatchlistPreset(template).map((summary) => (
                  <ProductPill key={`${template.key}-${summary}`} label={summary} tone="neutral" />
                ))}
                {template.sessionIntent ? <ProductPill label={`Intent ${template.sessionIntent}`} tone="info" /> : null}
                {(template.sessionTags || []).map((tag) => (
                  <ProductPill key={`${template.key}-tag-${tag}`} label={`Tag ${tag}`} tone="warning" />
                ))}
              </div>
              <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>
                {template.symbols.join(" | ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {importPreview ? (
        <div style={{ ...moduleInsetStyle("warning", compact ? 12 : 14), marginTop: 14 }}>
          <div style={sectionLabelStyle()}>Import Preview</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{importPreview.fileName}</div>
          <div style={{ color: deskTheme.colors.soft, marginTop: 8, lineHeight: 1.6 }}>
            Review the local import plan before anything is merged into the saved watchlist library.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <ProductPill label={`${importPreview.analysis.newCount} New`} tone="success" />
            <ProductPill label={`${importPreview.analysis.mergeCount} Merge`} tone="warning" />
            <ProductPill label={`${importPreview.analysis.skipCount} Skip`} tone="neutral" />
            <ProductPill label={`${importPreview.analysis.invalidCount} Invalid`} tone={importPreview.analysis.invalidCount ? "danger" : "neutral"} />
          </div>
          {(importPreview.analysis.duplicateNames.length || importPreview.analysis.conflictingPresets.length) ? (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {importPreview.analysis.duplicateNames.length ? (
                <div style={{ ...bodyTextStyle(), color: deskTheme.colors.soft }}>
                  Duplicate names: {importPreview.analysis.duplicateNames.join(", ")}
                </div>
              ) : null}
              {importPreview.analysis.conflictingPresets.length ? (
                <div style={{ ...bodyTextStyle(), color: deskTheme.colors.soft }}>
                  Conflicting presets: {importPreview.analysis.conflictingPresets.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {importPreview.analysis.entries.map((entry) => (
              <div key={`${entry.name}-${entry.id}`} style={watchlistRowStyle(false, true)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>{entry.name}</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 6 }}>{entry.symbols.join(" | ")}</div>
                  </div>
                  <ProductPill label={entry.action.toUpperCase()} tone={previewTone(entry.action)} />
                </div>
                <div style={{ ...bodyTextStyle(), marginTop: 8, color: deskTheme.colors.soft }}>{entry.summary}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {summarizeWatchlistPreset({ preset: entry.preset }).map((summary) => (
                    <ProductPill key={`${entry.id}-${summary}`} label={summary} tone="neutral" />
                  ))}
                  {entry.sessionIntent ? <ProductPill label={`Intent ${entry.sessionIntent}`} tone="info" /> : null}
                  {(entry.sessionTags || []).map((tag) => (
                    <ProductPill key={`${entry.id}-tag-${tag}`} label={`Tag ${tag}`} tone="warning" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={applyImportPreview} style={createButton({ tone: "success" })}>
              Apply Import
            </button>
            <button
              type="button"
              onClick={() => {
                setImportPreview(null);
                updateIoMessage("Import preview cleared. No watchlists were changed.", "neutral");
              }}
              style={createButton({ tone: "neutral" })}
            >
              Cancel Preview
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {savedWatchlists.map((item) => {
          const active = item.id === activeWatchlistId;
          const isEditing = editingId === item.id;
          const isContextEditing = contextEditingId === item.id;
          const presetSummary = summarizeWatchlistPreset(item);
          const contextSummary = summarizeWatchlistContext(item);

          return (
            <div key={item.id} style={watchlistRowStyle(active, compact)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {isEditing ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    style={inputStyle()}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => activateSavedWatchlist(item.id)}
                    style={{
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      padding: 0,
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>
                    <div style={{ color: deskTheme.colors.soft, marginTop: 4 }}>{item.symbols.join(" | ")}</div>
                  </button>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.pinned ? <ProductPill label="Pinned" tone="warning" /> : null}
                  {active ? <ProductPill label="Active" tone="success" /> : null}
                </div>
              </div>

              <div style={{ ...bodyTextStyle(), marginTop: 10, color: deskTheme.colors.soft }}>
                Created for reusable market focus, shared state handoff, and fast live-symbol rotation.
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {presetSummary.map((summary) => (
                  <ProductPill key={`${item.id}-${summary}`} label={summary} tone={active ? "info" : "neutral"} />
                ))}
                {contextSummary.sessionIntent ? <ProductPill label={`Intent ${contextSummary.sessionIntent}`} tone="info" /> : null}
                {contextSummary.sessionTags.map((tag) => (
                  <ProductPill key={`${item.id}-tag-${tag}`} label={`Tag ${tag}`} tone="warning" />
                ))}
              </div>

              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                <div style={{ ...bodyTextStyle(), color: deskTheme.colors.soft }}>{contextSummary.notesPreview}</div>
                <div style={{ ...bodyTextStyle(), color: deskTheme.colors.sky }}>{contextSummary.intentPreview}</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        renameSavedWatchlist(item.id, editingName);
                        setEditingId("");
                        setEditingName("");
                      }}
                      style={createButton({ tone: "success" })}
                    >
                      Save Name
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId("");
                        setEditingName("");
                      }}
                      style={createButton({ tone: "neutral" })}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => activateSavedWatchlist(item.id)}
                      style={createButton({ tone: active ? "success" : "info" })}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingName(item.name);
                      }}
                      style={createButton({ tone: "neutral" })}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        captureSavedWatchlistPreset(item.id);
                        updateIoMessage(`${item.name} preset updated from the current local workspace.`, "success");
                      }}
                      style={createButton({ tone: "success" })}
                    >
                      Save Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isContextEditing) {
                          setContextEditingId("");
                          setDraftNotes("");
                          setDraftTags("");
                          setDraftIntent("");
                        } else {
                          beginContextEdit(item);
                        }
                      }}
                      style={createButton({ tone: isContextEditing ? "warning" : "neutral" })}
                    >
                      {isContextEditing ? "Close Context" : "Edit Context"}
                    </button>
                    <button
                      type="button"
                      onClick={() => pinSavedWatchlist(item.id)}
                      style={createButton({ tone: item.pinned ? "warning" : "info" })}
                    >
                      {item.pinned ? "Pinned" : "Pin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedWatchlist(item.id)}
                      disabled={savedWatchlists.length <= 1}
                      style={{
                        ...createButton({ tone: "danger" }),
                        opacity: savedWatchlists.length <= 1 ? 0.5 : 1,
                        cursor: savedWatchlists.length <= 1 ? "not-allowed" : "pointer"
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>

              {isContextEditing ? (
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <input
                    value={draftIntent}
                    onChange={(event) => setDraftIntent(event.target.value)}
                    placeholder="Session intent"
                    style={inputStyle()}
                  />
                  <input
                    value={draftTags}
                    onChange={(event) => setDraftTags(event.target.value)}
                    placeholder="Session tags, comma separated"
                    style={inputStyle()}
                  />
                  <textarea
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    placeholder="Add a local note for market focus, session intent, or replay context"
                    style={textAreaStyle()}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        updateSavedWatchlistContext(item.id, {
                          notes: draftNotes,
                          sessionTags: draftTags,
                          sessionIntent: draftIntent
                        });
                        setContextEditingId("");
                        setDraftNotes("");
                        setDraftTags("");
                        setDraftIntent("");
                        updateIoMessage(`${item.name} context saved locally.`, "success");
                      }}
                      style={createButton({ tone: "success" })}
                    >
                      Save Context
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetEditors();
                      }}
                      style={createButton({ tone: "neutral" })}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
