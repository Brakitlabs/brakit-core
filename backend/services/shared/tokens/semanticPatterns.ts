/**
 * Semantic Token Patterns - Single Source of Truth
 *
 * All pattern matching for token name resolution lives here.
 * Used by both backend (tokenHelper.ts) and frontend (PreviewGenerator.ts).
 */

/** Pattern definition: semantic name -> array of possible token names */
export type PatternMap = Record<string, string[]>;

/**
 * Typography semantic patterns
 * Maps semantic names (h1, body, etc.) to possible token naming conventions
 */
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

/**
 * Color semantic patterns
 * Maps semantic color names to possible token naming conventions
 */
export const COLOR_PATTERNS: PatternMap = {
  // Surface colors
  surface: ["surface", "surfaceDefault", "surface-default", "background", "bg", "base"],
  "surface-alt": ["surface-alt", "surfaceAlt", "bg-alt", "bgAlt", "secondary", "gray"],

  // Text colors
  "text-main": ["text-main", "textMain", "text-primary", "textPrimary", "foreground", "text"],
  "text-muted": ["text-muted", "textMuted", "text-secondary", "textSecondary", "muted", "gray"],

  // Brand colors
  primary: ["primary", "accent", "brand"],
  "primary-soft": ["primary-soft", "primarySoft", "primary-light", "primaryLight", "accent-soft", "primary100", "primary200"],

  // Semantic colors
  danger: ["danger", "error", "red", "destructive"],
  "danger-soft": ["danger-soft", "dangerSoft", "error-soft", "errorSoft", "red-light"],
  success: ["success", "green", "positive"],
  "success-soft": ["success-soft", "successSoft", "green-light"],
  warning: ["warning", "yellow", "orange", "caution"],
  "warning-soft": ["warning-soft", "warningSoft", "yellow-light"],
  info: ["info", "blue", "informational"],
  "info-soft": ["info-soft", "infoSoft", "blue-light"],

  // UI colors
  "border-subtle": ["border-subtle", "borderSubtle", "border", "borderDefault", "outline"],
  overlay: ["overlay", "backdrop", "scrim"],
  "focus-ring": ["focus-ring", "focusRing", "focus", "ring"],
};

/**
 * Spacing semantic patterns
 * Maps semantic spacing names to possible token naming conventions
 */
export const SPACING_PATTERNS: PatternMap = {
  "space-xs": ["space-xs", "spaceXs", "xs", "extra-small", "extraSmall", "tiny"],
  "space-sm": ["space-sm", "spaceSm", "sm", "small"],
  "space-md": ["space-md", "spaceMd", "md", "medium", "base", "default"],
  "space-lg": ["space-lg", "spaceLg", "lg", "large"],
  "space-xl": ["space-xl", "spaceXl", "xl", "extra-large", "extraLarge"],
  "section-x": ["section-x", "sectionX", "container-x", "containerX", "padding-x"],
  "section-y": ["section-y", "sectionY", "container-y", "containerY", "padding-y"],
};

/**
 * Radius semantic patterns
 */
export const RADIUS_PATTERNS: PatternMap = {
  sm: ["sm", "small"],
  default: ["default", "md", "medium", "base"],
  lg: ["lg", "large"],
  pill: ["pill", "full", "round", "circle"],
};

/**
 * Shadow semantic patterns
 */
export const SHADOW_PATTERNS: PatternMap = {
  sm: ["sm", "small"],
  default: ["default", "base", "md"],
  hover: ["hover", "lg", "large"],
};

/**
 * Border semantic patterns
 */
export const BORDER_PATTERNS: PatternMap = {
  subtle: ["subtle", "default", "base"],
  strong: ["strong", "thick", "bold"],
};

/**
 * Opacity semantic patterns
 */
export const OPACITY_PATTERNS: PatternMap = {
  overlay: ["overlay", "backdrop", "default"],
};

/**
 * Find a token by semantic name using pattern matching
 *
 * @param tokens - Object containing tokens (e.g., { primary: {...}, secondary: {...} })
 * @param semanticName - The semantic name to find (e.g., "text-main")
 * @param patterns - Pattern map to use for matching
 * @returns The matched token or null
 */
export function findTokenByPattern<T>(
  tokens: Record<string, T> | undefined | null,
  semanticName: string,
  patterns: PatternMap
): T | null {
  if (!tokens || typeof tokens !== "object") return null;

  const keys = Object.keys(tokens);
  if (keys.length === 0) return null;

  // Get patterns for this semantic name, or use the name itself
  const searchPatterns = patterns[semanticName] || [semanticName];

  // Try pattern matching (case-insensitive)
  for (const pattern of searchPatterns) {
    const found = keys.find((key) =>
      key.toLowerCase().includes(pattern.toLowerCase())
    );
    if (found) return tokens[found];
  }

  // Fall back to first available token
  return tokens[keys[0]];
}

/**
 * Get patterns for a specific category
 */
export function getPatternsForCategory(category: string): PatternMap {
  switch (category) {
    case "typography":
      return TYPOGRAPHY_PATTERNS;
    case "color":
      return COLOR_PATTERNS;
    case "spacing":
      return SPACING_PATTERNS;
    case "radius":
      return RADIUS_PATTERNS;
    case "shadow":
      return SHADOW_PATTERNS;
    case "border":
      return BORDER_PATTERNS;
    case "opacity":
      return OPACITY_PATTERNS;
    default:
      return {};
  }
}

/**
 * Tailwind fallback classes for when no tokens are available
 */
export const TAILWIND_FALLBACKS = {
  typography: {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-semibold",
    h3: "text-2xl font-semibold",
    h4: "text-xl font-medium",
    body: "text-base",
    "body-sm": "text-sm",
    label: "text-sm font-medium",
    mono: "font-mono",
  },
  color: {
    "text-main": "text-gray-900",
    "text-muted": "text-gray-600",
    surface: "bg-white",
    "surface-alt": "bg-gray-50",
    "primary-soft": "bg-blue-50",
    "border-subtle": "border-gray-200",
  },
  spacing: {
    "space-lg": "p-8",
    "section-x": "px-6",
  },
} as const;
