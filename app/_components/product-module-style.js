import { createButton, createSurface, deskTheme, toneMap } from "./product-theme";

export function moduleHeroStyle(accent = "info", padding = 18) {
  return {
    ...createSurface({ level: "hero", accent, padding, radius: "xl" }),
    overflow: "hidden"
  };
}

export function modulePanelStyle(accent = "slate", padding = 18) {
  return createSurface({ level: "elevated", accent, padding, radius: "xl" });
}

export function moduleInsetStyle(accent = "slate", padding = 14) {
  const borderColor =
    accent === "info"
      ? deskTheme.colors.lineStrong
      : accent === "danger"
        ? "rgba(248, 113, 113, 0.20)"
        : accent === "success"
          ? "rgba(34, 197, 94, 0.18)"
          : deskTheme.colors.lineSoft;

  const glow =
    accent === "info"
      ? "radial-gradient(circle at top right, rgba(56, 189, 248, 0.10), transparent 36%)"
      : accent === "danger"
        ? "radial-gradient(circle at top right, rgba(248, 113, 113, 0.10), transparent 36%)"
        : accent === "success"
          ? "radial-gradient(circle at top right, rgba(34, 197, 94, 0.10), transparent 36%)"
          : "radial-gradient(circle at top right, rgba(129, 140, 248, 0.08), transparent 36%)";

  return {
    background: `${glow}, linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(8, 15, 29, 0.94) 100%)`,
    border: `1px solid ${borderColor}`,
    borderRadius: deskTheme.radii.lg,
    padding,
    boxShadow: deskTheme.shadows.inner
  };
}

export function sectionLabelStyle(color = deskTheme.colors.soft) {
  return {
    color,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontWeight: 800,
    fontFamily: deskTheme.fonts.data
  };
}

export function bodyTextStyle() {
  return {
    color: "#d6e2f2",
    lineHeight: 1.65
  };
}

export function monoValueStyle(tone = "neutral", size = 28) {
  return {
    color: toneMap[tone] || deskTheme.colors.text,
    fontFamily: deskTheme.fonts.data,
    fontWeight: 900,
    fontSize: size,
    letterSpacing: -0.8
  };
}

export function rowButtonStyle(active = false, tone = "info") {
  const activeBorder =
    tone === "danger"
      ? "rgba(248, 113, 113, 0.22)"
      : tone === "success"
        ? "rgba(34, 197, 94, 0.22)"
        : deskTheme.colors.lineStrong;

  return {
    textAlign: "left",
    cursor: "pointer",
    background: active
      ? "linear-gradient(135deg, rgba(56, 189, 248, 0.16) 0%, rgba(15, 23, 42, 0.90) 82%)"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(8, 15, 29, 0.94) 100%)",
    borderRadius: deskTheme.radii.lg,
    padding: 14,
    border: active ? `1px solid ${activeBorder}` : `1px solid ${deskTheme.colors.line}`,
    color: "inherit",
    boxShadow: active ? deskTheme.shadows.glow : deskTheme.shadows.inner
  };
}

export function actionChipStyle(active = false, tone = "info") {
  if (active) {
    return {
      ...createButton({ tone }),
      background: "linear-gradient(180deg, rgba(8, 47, 73, 0.34) 0%, rgba(8, 15, 29, 0.96) 100%)",
      border: `1px solid ${toneMap[tone] || deskTheme.colors.lineStrong}`,
      color: deskTheme.colors.text
    };
  }

  return {
    ...createButton({ tone: "neutral", compact: true }),
    color: toneMap[tone] || deskTheme.colors.text
  };
}

export function dataRowStyle() {
  return {
    display: "grid",
    gap: 12,
    alignItems: "center",
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(8, 15, 29, 0.94) 100%)",
    borderRadius: deskTheme.radii.lg,
    padding: 14,
    border: `1px solid ${deskTheme.colors.line}`
  };
}

export function fieldStyle() {
  return {
    width: "100%",
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(8, 15, 29, 0.96) 100%)",
    color: deskTheme.colors.text,
    borderRadius: deskTheme.radii.md,
    border: `1px solid ${deskTheme.colors.line}`,
    padding: 12,
    boxShadow: deskTheme.shadows.inner,
    fontFamily: deskTheme.fonts.ui
  };
}
