/**
 * Semantic Token Patterns - Frontend Mirror
 *
 * NOTE: This file mirrors backend/services/shared/tokens/semanticPatterns.ts
 * Keep in sync! Future improvement: serve patterns via API endpoint.
 */

type PatternMap = Record<string, string[]>;

/** Typography semantic patterns */
export const TYPOGRAPHY_PATTERNS: PatternMap = {
  h1: ["h1", "heading1", "heading-1", "display", "title-lg", "titleLg"],
  h2: ["h2", "heading2", "heading-2", "title-md", "titleMd", "subtitle"],
  h3: ["h3", "heading3", "heading-3", "title-sm", "titleSm"],
  h4: ["h4", "heading4", "heading-4"],
  body: ["body", "bodyText", "body-text", "text", "paragraph", "regular"],
  "body-sm": ["body-sm", "bodySm", "bodySmall", "body-small", "small", "sm", "caption"],
  label: ["label", "labelText", "label-text", "caption", "overline", "meta"],
  mono: ["mono", "code", "monospace"],
};

/** Color semantic patterns */
export const COLOR_PATTERNS: PatternMap = {
  surface: ["surface", "surfaceDefault", "surface-default", "background", "bg", "base"],
  "surface-alt": ["surface-alt", "surfaceAlt", "bg-alt", "bgAlt", "secondary", "gray"],
  "text-main": ["text-main", "textMain", "text-primary", "textPrimary", "foreground", "text"],
  "text-muted": ["text-muted", "textMuted", "text-secondary", "textSecondary", "muted", "gray"],
  primary: ["primary", "accent", "brand"],
  "primary-soft": ["primary-soft", "primarySoft", "primary-light", "primaryLight", "accent-soft", "primary100", "primary200"],
  danger: ["danger", "error", "red", "destructive"],
  "danger-soft": ["danger-soft", "dangerSoft", "error-soft", "errorSoft", "red-light"],
  success: ["success", "green", "positive"],
  "success-soft": ["success-soft", "successSoft", "green-light"],
  warning: ["warning", "yellow", "orange", "caution"],
  "warning-soft": ["warning-soft", "warningSoft", "yellow-light"],
  info: ["info", "blue", "informational"],
  "info-soft": ["info-soft", "infoSoft", "blue-light"],
  "border-subtle": ["border-subtle", "borderSubtle", "border", "borderDefault", "outline"],
  overlay: ["overlay", "backdrop", "scrim"],
  "focus-ring": ["focus-ring", "focusRing", "focus", "ring"],
};

/** Spacing semantic patterns */
export const SPACING_PATTERNS: PatternMap = {
  "space-xs": ["space-xs", "spaceXs", "xs", "extra-small", "extraSmall", "tiny"],
  "space-sm": ["space-sm", "spaceSm", "sm", "small"],
  "space-md": ["space-md", "spaceMd", "md", "medium", "base", "default"],
  "space-lg": ["space-lg", "spaceLg", "lg", "large"],
  "space-xl": ["space-xl", "spaceXl", "xl", "extra-large", "extraLarge"],
  "section-x": ["section-x", "sectionX", "container-x", "containerX", "padding-x"],
  "section-y": ["section-y", "sectionY", "container-y", "containerY", "padding-y"],
};

/** Radius semantic patterns */
export const RADIUS_PATTERNS: PatternMap = {
  sm: ["sm", "small"],
  default: ["default", "md", "medium", "base"],
  lg: ["lg", "large"],
  pill: ["pill", "full", "round", "circle"],
};

/** Find a token by semantic name using pattern matching */
export function findTokenByPattern<T>(
  tokens: Record<string, T> | undefined | null,
  semanticName: string,
  patterns: PatternMap
): T | null {
  if (!tokens || typeof tokens !== "object") return null;

  const keys = Object.keys(tokens);
  if (keys.length === 0) return null;

  const searchPatterns = patterns[semanticName] || [semanticName];

  for (const pattern of searchPatterns) {
    const found = keys.find((key) =>
      key.toLowerCase().includes(pattern.toLowerCase())
    );
    if (found) return tokens[found];
  }

  return tokens[keys[0]];
}
