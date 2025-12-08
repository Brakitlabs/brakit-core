/**
 * Token Category Configuration
 * Defines how each token category is processed and generated.
 */

import type { TokenType } from "./types";

/**
 * Configuration for a token category
 */
export interface CategoryConfig {
  /**
   * Type of tokens in this category (W3C token type)
   * Used for validation and UI component selection
   */
  tokenType: TokenType;

  /**
   * CSS class prefix for this category
   * E.g., 'bg' for colors, 'text' for typography
   */
  cssPrefix: string;

  /**
   * CSS variable prefix (defaults to category name if not specified)
   * E.g., 'color' for --bk-color-primary
   */
  varPrefix?: string;

  /**
   * Should generate utility classes for this category?
   * If false, only CSS variables are generated
   */
  generateUtils?: boolean;

  /**
   * Custom class name template
   * Use {prefix} and {key} as placeholders
   * Default: 'bk-{prefix}-{key}'
   */
  classTemplate?: string;

  /**
   * CSS properties to generate for utilities
   * E.g., ['background-color', 'border-color'] for colors
   */
  cssProperties?: string[];

  /**
   * Should generate CSS variable for this category?
   * Default: true
   */
  generateVar?: boolean;

  /**
   * Value transformer function
   * Converts W3C token value to CSS-compatible value
   */
  valueTransformer?: (value: unknown) => string;
}

/**
 * Default configuration for unknown categories
 * Provides sensible defaults for extensibility
 */
export const DEFAULT_CONFIG: CategoryConfig = {
  tokenType: "dimension", // Most generic type
  cssPrefix: "token",
  generateUtils: false,
  generateVar: true,
  classTemplate: "bk-{prefix}-{key}",
};

/** Category configurations for token generation */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  color: {
    tokenType: "color",
    cssPrefix: "bg",
    varPrefix: "color",
    generateUtils: true,
    cssProperties: ["background-color", "border-color", "color"],
  },

  typography: {
    tokenType: "typography",
    cssPrefix: "text",
    generateUtils: true,
    generateVar: false, // Typography uses multiple CSS properties
    valueTransformer: (value: unknown) => {
      // Typography tokens are objects, return as-is for JS generation
      return JSON.stringify(value);
    },
  },

  spacing: {
    tokenType: "dimension",
    cssPrefix: "p",
    varPrefix: "spacing",
    generateUtils: true,
    cssProperties: ["padding", "margin", "gap"],
  },

  radius: {
    tokenType: "dimension",
    cssPrefix: "rounded",
    varPrefix: "radius",
    generateUtils: true,
    cssProperties: ["border-radius"],
  },

  border: {
    tokenType: "dimension",
    cssPrefix: "border",
    varPrefix: "border",
    generateUtils: true,
    cssProperties: ["border-width"],
  },

  shadow: {
    tokenType: "shadow",
    cssPrefix: "shadow",
    varPrefix: "shadow",
    generateUtils: true,
    cssProperties: ["box-shadow"],
    valueTransformer: (value: unknown) => {
      // Transform shadow object to CSS string
      if (typeof value === "object" && value !== null) {
        const shadow = value as any;
        return [
          shadow.offsetX,
          shadow.offsetY,
          shadow.blur,
          shadow.spread || "0",
          shadow.color,
        ].join(" ");
      }
      return String(value);
    },
  },

  opacity: {
    tokenType: "number",
    cssPrefix: "opacity",
    varPrefix: "opacity",
    generateUtils: true,
    cssProperties: ["opacity"],
  },

  layout: {
    tokenType: "dimension",
    cssPrefix: "max-w",
    varPrefix: "layout",
    generateUtils: true,
    cssProperties: ["max-width"],
  },

  zIndex: {
    tokenType: "number",
    cssPrefix: "z",
    varPrefix: "z",
    generateUtils: true,
    cssProperties: ["z-index"],
  },

  duration: {
    tokenType: "dimension",
    cssPrefix: "duration",
    varPrefix: "duration",
    generateUtils: true,
    cssProperties: ["transition-duration", "animation-duration"],
  },

  gradient: {
    tokenType: "color",
    cssPrefix: "gradient",
    varPrefix: "gradient",
    generateUtils: true,
    cssProperties: ["background-image"],
    generateVar: true,
  },

  fontFamily: {
    tokenType: "typography",
    cssPrefix: "font",
    varPrefix: "font-family",
    generateUtils: true,
    cssProperties: ["font-family"],
  },

  fontWeight: {
    tokenType: "fontWeight",
    cssPrefix: "font",
    varPrefix: "font-weight",
    generateUtils: true,
    cssProperties: ["font-weight"],
  },
};

/**
 * Get configuration for a category
 * Falls back to DEFAULT_CONFIG for unknown categories
 */
export function getCategoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] || DEFAULT_CONFIG;
}

/**
 * Get all configured categories
 */
export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_CONFIG);
}

/**
 * Check if a category is configured
 */
export function isCategoryConfigured(category: string): boolean {
  return category in CATEGORY_CONFIG;
}

/**
 * Generate class name for a token
 * Uses category config or default template
 */
export function generateClassName(
  category: string,
  key: string,
  config?: CategoryConfig
): string {
  const cfg = config || getCategoryConfig(category);
  const template = cfg.classTemplate || DEFAULT_CONFIG.classTemplate!;

  return template
    .replace("{prefix}", cfg.cssPrefix)
    .replace("{key}", key);
}

/**
 * Generate CSS variable name for a token
 * Uses category config or default naming
 */
export function generateVarName(
  category: string,
  key: string,
  config?: CategoryConfig
): string | null {
  const cfg = config || getCategoryConfig(category);

  if (cfg.generateVar === false) {
    return null;
  }

  const prefix = cfg.varPrefix || category;
  return `var(--bk-${prefix}-${key})`;
}

/**
 * Infer TypeScript type from actual token value
 */
export function inferTypeScriptType(value: unknown): string {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "Record<string, unknown>";
  return "unknown";
}
