import type { BrakitDesignTokens } from "./types";

/**
 * Default design tokens (minimal preset)
 * Can be overridden by persisted user tokens
 */
export const defaultDesignTokens: BrakitDesignTokens = {
  $schema: "https://design-tokens.github.io/community-group/format/",

  color: {
    primary: {
      $type: "color",
      $value: "#2563eb",
      $description: "Primary brand color",
    },
    "primary-soft": {
      $type: "color",
      $value: "#eff6ff",
      $description: "Soft primary background",
    },
    surface: {
      $type: "color",
      $value: "#ffffff",
      $description: "Main surface",
    },
    "surface-alt": {
      $type: "color",
      $value: "#f8fafc",
      $description: "Alternate surface",
    },
    "border-subtle": {
      $type: "color",
      $value: "#e2e8f0",
      $description: "Subtle border",
    },
    danger: { $type: "color", $value: "#dc2626", $description: "Danger/error" },
    success: { $type: "color", $value: "#059669", $description: "Success" },
    warning: { $type: "color", $value: "#f59e0b", $description: "Warning" },
    info: { $type: "color", $value: "#0284c7", $description: "Info" },
    "text-main": {
      $type: "color",
      $value: "#0f172a",
      $description: "Main text",
    },
    "text-muted": {
      $type: "color",
      $value: "#64748b",
      $description: "Muted text",
    },
    link: { $type: "color", $value: "#1d4ed8", $description: "Link" },
    "focus-ring": {
      $type: "color",
      $value: "#2563eb",
      $description: "Focus ring",
    },
    overlay: {
      $type: "color",
      $value: "#0f172a",
      $description: "Overlay scrim",
    },
  },

  typography: {
    h1: {
      $type: "typography",
      $value: { fontSize: "2.5625rem", fontWeight: "500", lineHeight: "1.7" },
      $description: "Heading 1",
    },
    h2: {
      $type: "typography",
      $value: { fontSize: "2.3125rem", fontWeight: "600", lineHeight: "1.65" },
      $description: "Heading 2",
    },
    h3: {
      $type: "typography",
      $value: { fontSize: "1.5rem", fontWeight: "600", lineHeight: "1.4" },
      $description: "Heading 3",
    },
    body: {
      $type: "typography",
      $value: { fontSize: "1rem", fontWeight: "400", lineHeight: "1.5" },
      $description: "Body",
    },
    "body-sm": {
      $type: "typography",
      $value: { fontSize: "0.875rem", fontWeight: "400", lineHeight: "1.5" },
      $description: "Small body",
    },
    label: {
      $type: "typography",
      $value: {
        fontSize: "0.75rem",
        fontWeight: "500",
        lineHeight: "1.5",
        letterSpacing: "0.05em",
      },
      $description: "Label / eyebrow",
    },
    mono: {
      $type: "typography",
      $value: {
        fontSize: "0.95rem",
        fontWeight: "500",
        lineHeight: "1.4",
        letterSpacing: "0",
        fontFamily:
          'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      $description: "Monospace token",
    },
  },

  spacing: {
    "space-xs": {
      $type: "dimension",
      $value: "0.5rem",
      $description: "XS spacing",
    },
    "space-sm": {
      $type: "dimension",
      $value: "0.75rem",
      $description: "SM spacing",
    },
    "space-md": {
      $type: "dimension",
      $value: "1rem",
      $description: "MD spacing",
    },
    "space-lg": {
      $type: "dimension",
      $value: "1.5rem",
      $description: "LG spacing",
    },
    "space-xl": {
      $type: "dimension",
      $value: "2rem",
      $description: "XL spacing",
    },
    "section-y": {
      $type: "dimension",
      $value: "0.75rem",
      $description: "Vertical section padding",
    },
    "section-x": {
      $type: "dimension",
      $value: "1.5rem",
      $description: "Horizontal section padding",
    },
  },

  radius: {
    default: {
      $type: "dimension",
      $value: "0.75rem",
      $description: "Default radius",
    },
    pill: { $type: "dimension", $value: "9999px", $description: "Pill radius" },
  },

  shadow: {
    none: {
      $type: "shadow",
      $value: { offsetX: "0", offsetY: "0", blur: "0", color: "transparent" },
      $description: "No shadow",
    },
    default: {
      $type: "shadow",
      $value: {
        offsetX: "0",
        offsetY: "4px",
        blur: "6px",
        spread: "-1px",
        color: "#000000",
      },
      $description: "Default shadow",
    },
    hover: {
      $type: "shadow",
      $value: {
        offsetX: "0",
        offsetY: "12px",
        blur: "30px",
        spread: "-6px",
        color: "#0f172a",
      },
      $description: "Hover/active shadow",
    },
  },

  layout: {
    content: {
      $type: "dimension",
      $value: "80rem",
      $description: "Content max width",
    },
    wide: {
      $type: "dimension",
      $value: "90rem",
      $description: "Wide max width",
    },
  },

  border: {
    subtle: {
      $type: "dimension",
      $value: "1px",
      $description: "Subtle border width",
    },
    strong: {
      $type: "dimension",
      $value: "2px",
      $description: "Strong border width",
    },
  },

  opacity: {
    subtle: { $type: "number", $value: 0.85, $description: "Muted elements" },
    disabled: { $type: "number", $value: 0.45, $description: "Disabled state" },
    overlay: {
      $type: "number",
      $value: 0.72,
      $description: "Overlay scrim opacity",
    },
  },

  zIndex: {
    base: { $type: "number", $value: 1, $description: "Base stacking" },
    popover: { $type: "number", $value: 10, $description: "Popover z-index" },
    modal: { $type: "number", $value: 50, $description: "Modal z-index" },
    toast: { $type: "number", $value: 60, $description: "Toast z-index" },
  },
};
