export const deskTheme = {
  fonts: {
    ui: '"Geist", "Soehne", "SF Pro Display", "IBM Plex Sans", system-ui, sans-serif',
    data: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'
  },
  colors: {
    bg: "#030712",
    canvas: "#07111f",
    canvasElevated: "#0a1426",
    surface: "rgba(8, 15, 29, 0.92)",
    surfaceStrong: "rgba(10, 19, 36, 0.96)",
    surfaceLifted: "rgba(14, 24, 44, 0.94)",
    inset: "rgba(15, 23, 42, 0.72)",
    line: "rgba(148, 163, 184, 0.12)",
    lineSoft: "rgba(148, 163, 184, 0.08)",
    lineStrong: "rgba(125, 211, 252, 0.18)",
    text: "#f8fafc",
    soft: "#94a3b8",
    muted: "#64748b",
    sky: "#7dd3fc",
    cyan: "#38bdf8",
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#f87171",
    indigo: "#818cf8"
  },
  radii: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    pill: 999
  },
  shadows: {
    panel: "0 30px 90px rgba(0, 0, 0, 0.34)",
    lifted: "0 34px 110px rgba(0, 0, 0, 0.42)",
    inner: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    glow: "0 0 0 1px rgba(125, 211, 252, 0.04), 0 18px 80px rgba(14, 165, 233, 0.10)"
  }
};

export const toneMap = {
  success: deskTheme.colors.green,
  info: deskTheme.colors.cyan,
  warning: deskTheme.colors.amber,
  neutral: "#cbd5e1",
  danger: deskTheme.colors.red
};

export function createSurface({ level = "panel", accent = "slate", padding = 20, radius = "xl" } = {}) {
  const accentGlow =
    accent === "info"
      ? "radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 38%)"
      : accent === "success"
        ? "radial-gradient(circle at top right, rgba(34, 197, 94, 0.10), transparent 38%)"
        : accent === "danger"
          ? "radial-gradient(circle at top right, rgba(248, 113, 113, 0.10), transparent 38%)"
          : "radial-gradient(circle at top right, rgba(129, 140, 248, 0.08), transparent 38%)";

  const background =
    level === "hero"
      ? `${accentGlow}, linear-gradient(180deg, rgba(7, 15, 29, 0.98) 0%, rgba(3, 8, 19, 1) 100%)`
      : level === "elevated"
        ? `${accentGlow}, linear-gradient(180deg, rgba(10, 19, 36, 0.98) 0%, rgba(7, 12, 24, 1) 100%)`
        : "linear-gradient(180deg, rgba(10, 18, 34, 0.94) 0%, rgba(4, 9, 18, 0.98) 100%)";

  return {
    background,
    border: accent === "info" ? `1px solid ${deskTheme.colors.lineStrong}` : `1px solid ${deskTheme.colors.line}`,
    borderRadius: deskTheme.radii[radius] || deskTheme.radii.xl,
    padding,
    boxShadow: `${deskTheme.shadows.panel}, ${deskTheme.shadows.inner}`,
    backdropFilter: "blur(14px)"
  };
}

export function createInset() {
  return {
    background: deskTheme.colors.inset,
    border: `1px solid ${deskTheme.colors.lineSoft}`,
    borderRadius: deskTheme.radii.md,
    boxShadow: deskTheme.shadows.inner
  };
}

export function createButton({ primary = false, tone = "neutral", compact = false } = {}) {
  return {
    cursor: "pointer",
    textDecoration: "none",
    padding: compact ? "10px 12px" : "11px 14px",
    borderRadius: deskTheme.radii.md,
    border: primary ? "1px solid rgba(34, 197, 94, 0.24)" : `1px solid ${deskTheme.colors.line}`,
    background: primary
      ? "linear-gradient(180deg, rgba(34, 197, 94, 0.96) 0%, rgba(21, 128, 61, 0.96) 100%)"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(8, 15, 29, 0.96) 100%)",
    color: primary ? "#04130a" : toneMap[tone] || deskTheme.colors.text,
    fontWeight: 800,
    boxShadow: primary ? "0 18px 48px rgba(34, 197, 94, 0.22)" : deskTheme.shadows.inner
  };
}

export function createPillStyle(tone = "neutral") {
  return {
    display: "inline-flex",
    padding: "7px 11px",
    borderRadius: deskTheme.radii.pill,
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(8, 15, 29, 0.94) 100%)",
    border: `1px solid ${deskTheme.colors.line}`,
    color: toneMap[tone] || toneMap.neutral,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    boxShadow: deskTheme.shadows.inner
  };
}
