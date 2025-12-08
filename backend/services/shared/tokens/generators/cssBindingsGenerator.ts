import type { BrakitDesignTokens, Token, TypographyValue, ShadowValue } from "../types";
import { generateFileHeader } from "./hashUtils";
import { getCategoryConfig } from "../tokenConfig";

/**
 * Helper to safely get tokens from a category
 */
function getTokens(tokens: BrakitDesignTokens, category: string): Record<string, Token> {
  const categoryTokens = tokens[category];
  if (!categoryTokens || typeof categoryTokens !== "object") {
    return {};
  }
  // Filter out undefined entries
  const result: Record<string, Token> = {};
  for (const [key, token] of Object.entries(categoryTokens)) {
    if (token) result[key] = token;
  }
  return result;
}

/**
 * Generates bindings.css with CSS custom properties and utility classes
 */
export class CSSBindingsGenerator {
  /**
   * Generate complete bindings.css content
   */
  static generate(tokens: BrakitDesignTokens, hash: string): string {
    const header = generateFileHeader(hash, "css");
    const cssVars = this.generateCSSVariables(tokens);
    const utilityClasses = this.generateUtilityClasses(tokens);

    return `${header}${cssVars}

${utilityClasses}`;
  }

  /**
   * Generate CSS custom properties (:root)
   */
  private static generateCSSVariables(tokens: BrakitDesignTokens): string {
    const vars: string[] = [];

    // Iterate over all categories dynamically
    for (const [category, categoryTokens] of Object.entries(tokens)) {
      if (category.startsWith("$")) continue;
      if (!categoryTokens || typeof categoryTokens !== "object") continue;

      const config = getCategoryConfig(category);
      if (config.generateVar === false) continue;

      const varPrefix = config.varPrefix || category;

      for (const [key, token] of Object.entries(categoryTokens)) {
        if (!token) continue;
        vars.push(`  --bk-${varPrefix}-${key}: ${token.$value};`);
      }
    }

    return `/* ───────────────────────────────────────────────────
   CSS CUSTOM PROPERTIES
   ─────────────────────────────────────────────────── */
:root {
${vars.join("\n")}
}`;
  }

  /**
   * Generate utility classes
   */
  private static generateUtilityClasses(tokens: BrakitDesignTokens): string {
    const sections: string[] = [];

    // Color utilities (bg, text, border-color)
    const colorTokens = getTokens(tokens, "color");
    if (Object.keys(colorTokens).length > 0) {
      sections.push(this.generateColorUtilities(colorTokens, "bg", "background-color"));
      sections.push(this.generateColorUtilities(colorTokens, "text", "color"));
      sections.push(this.generateColorUtilities(colorTokens, "border", "border-color"));
    }

    // Typography utilities
    const typographyTokens = getTokens(tokens, "typography");
    if (Object.keys(typographyTokens).length > 0) {
      sections.push(this.generateTypographyUtilities(typographyTokens));
    }

    // Spacing utilities
    const spacingTokens = getTokens(tokens, "spacing");
    if (Object.keys(spacingTokens).length > 0) {
      sections.push(this.generateSpacingUtilities(spacingTokens));
    }

    // Generate generic utilities for other categories
    const genericCategories = ["radius", "border", "opacity", "layout", "zIndex", "shadow"];
    for (const category of genericCategories) {
      const categoryTokens = getTokens(tokens, category);
      if (Object.keys(categoryTokens).length > 0) {
        sections.push(this.generateGenericUtilities(category, categoryTokens));
      }
    }

    return sections.join("\n\n");
  }

  /**
   * Generate color utilities (used for bg, text, border-color)
   */
  private static generateColorUtilities(
    colorTokens: Record<string, Token>,
    prefix: string,
    property: string
  ): string {
    const classes: string[] = [];

    for (const key of Object.keys(colorTokens)) {
      const className = `.bk-${prefix}-${key}`;
      const cssVar = `var(--bk-color-${key})`;
      classes.push(`${className} { ${property}: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   ${prefix.toUpperCase()} COLOR UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  /**
   * Generate typography utilities (special case - multiple CSS properties)
   */
  private static generateTypographyUtilities(typographyTokens: Record<string, Token>): string {
    const classes: string[] = [];

    for (const [key, token] of Object.entries(typographyTokens)) {
      const className = `.bk-text-${key}`;
      const value = token.$value as TypographyValue;
      const props: string[] = [];

      if (value.fontSize) props.push(`font-size: ${value.fontSize};`);
      if (value.fontWeight) props.push(`font-weight: ${value.fontWeight};`);
      if (value.lineHeight) props.push(`line-height: ${value.lineHeight};`);
      if (value.letterSpacing) props.push(`letter-spacing: ${value.letterSpacing};`);
      if (value.fontFamily) props.push(`font-family: ${value.fontFamily};`);

      classes.push(`${className} {\n  ${props.join("\n  ")}\n}`);
    }

    return `/* ───────────────────────────────────────────────────
   TYPOGRAPHY UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n\n")}`;
  }

  /**
   * Generate spacing utilities (special case - multiple utility patterns)
   */
  private static generateSpacingUtilities(spacingTokens: Record<string, Token>): string {
    const classes: string[] = [];

    for (const key of Object.keys(spacingTokens)) {
      const cssVar = `var(--bk-spacing-${key})`;

      // Padding utilities
      classes.push(`.bk-p-${key} { padding: ${cssVar}; }`);
      classes.push(`.bk-px-${key} { padding-left: ${cssVar}; padding-right: ${cssVar}; }`);
      classes.push(`.bk-py-${key} { padding-top: ${cssVar}; padding-bottom: ${cssVar}; }`);
      classes.push(`.bk-pt-${key} { padding-top: ${cssVar}; }`);
      classes.push(`.bk-pr-${key} { padding-right: ${cssVar}; }`);
      classes.push(`.bk-pb-${key} { padding-bottom: ${cssVar}; }`);
      classes.push(`.bk-pl-${key} { padding-left: ${cssVar}; }`);

      // Margin utilities
      classes.push(`.bk-m-${key} { margin: ${cssVar}; }`);
      classes.push(`.bk-mx-${key} { margin-left: ${cssVar}; margin-right: ${cssVar}; }`);
      classes.push(`.bk-my-${key} { margin-top: ${cssVar}; margin-bottom: ${cssVar}; }`);
      classes.push(`.bk-mt-${key} { margin-top: ${cssVar}; }`);
      classes.push(`.bk-mr-${key} { margin-right: ${cssVar}; }`);
      classes.push(`.bk-mb-${key} { margin-bottom: ${cssVar}; }`);
      classes.push(`.bk-ml-${key} { margin-left: ${cssVar}; }`);

      // Gap utilities
      classes.push(`.bk-gap-${key} { gap: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   SPACING UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  /**
   * Generate generic utilities for a category
   * Handles: radius, border, opacity, layout, zIndex, shadow, and any future category
   */
  private static generateGenericUtilities(
    category: string,
    categoryTokens: Record<string, Token>
  ): string {
    const config = getCategoryConfig(category);
    const classes: string[] = [];
    const varPrefix = config.varPrefix || category;

    for (const [key, token] of Object.entries(categoryTokens)) {
      const cssVar = `var(--bk-${varPrefix}-${key})`;

      // Special handling for shadow (complex value)
      if (category === "shadow") {
        const value = token.$value as ShadowValue;
        if (key === "none" || value.blur === "0") {
          classes.push(`.bk-shadow-${key} { box-shadow: none; }`);
        } else {
          const shadow = `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread || "0"} ${value.color}`;
          classes.push(`.bk-shadow-${key} { box-shadow: ${shadow}; }`);
        }
        continue;
      }

      // Special handling for layout (adds centered container)
      if (category === "layout") {
        classes.push(`.bk-max-w-${key} { max-width: ${cssVar}; }`);
        classes.push(`.bk-container-${key} { max-width: ${cssVar}; margin-left: auto; margin-right: auto; }`);
        continue;
      }

      // Generic single-property utility
      const cssProperty = config.cssProperties?.[0];
      if (cssProperty) {
        classes.push(`.bk-${config.cssPrefix}-${key} { ${cssProperty}: ${cssVar}; }`);
      }
    }

    const title = category.replace(/([A-Z])/g, " $1").toUpperCase().trim();
    return `/* ───────────────────────────────────────────────────
   ${title} UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }
}
