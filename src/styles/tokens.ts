export const colors = {
  // Surfaces
  background:               "#11131e",
  surface:                  "#161929",
  "surface-dim":            "#11131e",
  "surface-bright":         "#373845",
  "surface-raised":         "#1E2235",
  "surface-container-lowest":  "#0c0e18",
  "surface-container-low":     "#191b26",
  "surface-container":         "#1d1f2b",
  "surface-container-high":    "#272935",
  "surface-container-highest": "#323440",
  "surface-variant":           "#323440",
  "surface-tint":              "#c0c1ff",

  // On-surface
  "on-surface":         "#e1e1f2",
  "on-surface-variant": "#c7c4d7",
  "inverse-surface":    "#e1e1f2",
  "inverse-on-surface": "#2e303c",

  // Outline
  outline:         "#908fa0",
  "outline-variant": "#464554",

  // Primary (Indigo)
  primary:                  "#c0c1ff",
  "on-primary":             "#1000a9",
  "primary-container":      "#8083ff",
  "on-primary-container":   "#0d0096",
  "inverse-primary":        "#494bd6",
  "primary-fixed":          "#e1e0ff",
  "primary-fixed-dim":      "#c0c1ff",
  "on-primary-fixed":       "#07006c",
  "on-primary-fixed-variant": "#2f2ebe",

  // Secondary (Cyan)
  secondary:                  "#5de6ff",
  "on-secondary":             "#00363e",
  "secondary-container":      "#00cbe6",
  "on-secondary-container":   "#00515d",
  "secondary-fixed":          "#a2eeff",
  "secondary-fixed-dim":      "#2fd9f4",
  "on-secondary-fixed":       "#001f25",
  "on-secondary-fixed-variant": "#004e5a",

  // Tertiary (Gold/Amber — XP system)
  tertiary:                   "#ffb95f",
  "on-tertiary":              "#472a00",
  "tertiary-container":       "#ca8100",
  "on-tertiary-container":    "#3e2400",
  "tertiary-fixed":           "#ffddb8",
  "tertiary-fixed-dim":       "#ffb95f",
  "on-tertiary-fixed":        "#2a1700",
  "on-tertiary-fixed-variant": "#653e00",

  // Semantic
  error:               "#ffb4ab",
  "on-error":          "#690005",
  "error-container":   "#93000a",
  "on-error-container": "#ffdad6",
  success:             "#10B981",
  border:              "rgba(255,255,255,0.08)",

  // Text aliases
  "text-primary":   "#F1F5F9",
  "text-secondary": "#94A3B8",
  "text-muted":     "#475569",
} as const;

export const spacing = {
  unit:             "4px",
  gutter:           "16px",
  "margin-mobile":  "20px",
  "margin-desktop": "40px",
  "container-max":  "1200px",
} as const;

export const borderRadius = {
  sm:      "0.25rem",  // 4px
  DEFAULT: "0.5rem",   // 8px
  md:      "0.75rem",  // 12px
  lg:      "1rem",     // 16px
  xl:      "1.5rem",   // 24px
  full:    "9999px",
} as const;

export const fontFamily = {
  sans:    ["var(--font-inter)", "Inter", "sans-serif"],
  display: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
  mono:    ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
} as const;

export const fontSize = {
  "display-xl":   ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
  "display-xl-m": ["36px", { lineHeight: "1.2", fontWeight: "700" }],
  "headline-lg":  ["32px", { lineHeight: "1.2", fontWeight: "700" }],
  "headline-sm":  ["20px", { lineHeight: "1.4", fontWeight: "600" }],
  "body-lg":      ["18px", { lineHeight: "1.6" }],
  "body-md":      ["16px", { lineHeight: "1.5" }],
  "body-sm":      ["14px", { lineHeight: "1.5" }],
  "mono-label":   ["12px", { lineHeight: "1",   letterSpacing: "0.05em", fontWeight: "500" }],
  "mono-stats":   ["14px", { lineHeight: "1",   fontWeight: "600" }],
} as const;
